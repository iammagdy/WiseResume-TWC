/**
 * Flat-pool AI client.
 *
 * Up to 9 keys: 3 OpenRouter + 3 Groq + 3 DeepSeek. Provider is chosen
 * uniformly at random among those with at least one key configured;
 * then a random key within that provider is used. One sibling-key retry,
 * then a cross-provider fallback to any key from a different provider.
 *
 * Public surface preserved so the 30+ AI edge functions don't need edits.
 * Circuit breaker removed; `recordBreakerEvent` is a no-op for compat.
 */
import { resolveFeatureRoute, type RouteSelection as ForcedRoute } from './modelRouter.ts';

// ── Public types ──────────────────────────────────────────────────────────────
export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: unknown;
}

export interface AITool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface AICallOptions {
  /** Ignored. Kept for backward compatibility with old callers. */
  model?: string;
  /** Ignored. Kept for backward compatibility with old callers. */
  wiseresumeSubProvider?: 'openrouter' | 'openrouter2' | 'groq' | string;
  /** Ignored. */
  userId?: string;
  /** Ignored. */
  byokProvider?: string;
  /**
   * Feature name used to look up per-feature routing config from the
   * `ai_routing_config` DB table. When set, the resolved provider (and
   * optional model override) is preferred over random pool selection.
   * Falls back to random pool if DB lookup fails or config is 'auto'.
   */
  featureName?: string;

  messages: AIMessage[];
  tools?: AITool[];
  toolChoice?: unknown;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  /** When true, request JSON object response (Groq supports this; OpenRouter too via response_format). */
  jsonMode?: boolean;
  /** Optional response_format override for advanced callers. */
  responseFormat?: Record<string, unknown>;
  /** Optional abort signal forwarded to fetch. */
  signal?: AbortSignal;
  /** Optional per-call timeout in milliseconds. */
  timeout?: number;
  /** Optional preferred AI provider override. */
  preferredProvider?: string;
}

export interface AIToolCall {
  function: { name: string; arguments: string };
}

export interface AIResponse {
  content: string;
  /** Provider+key used for this response, e.g. "openrouter:1". Useful for logs/UI. */
  providerUsed: string;
  /** Model slug that actually served the request. */
  model: string;
  toolCalls?: AIToolCall[];
  finishReason?: string | null;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  fallbackUsed?: boolean;
  fallbackReason?: string | null;
}

export interface AIError {
  message: string;
  status: number;
  type?: string;
  code: string;
  provider?: string;
}

// ── Provider pool ─────────────────────────────────────────────────────────────
type Provider = 'openrouter' | 'groq' | 'deepseek';

const OPENROUTER_FREE_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
const GROQ_FREE_MODEL = 'llama-3.3-70b-versatile';
// DeepSeek deprecates `deepseek-chat` and `deepseek-reasoner` on 2026/07/24.
// `deepseek-v4-flash` is the same engine as `deepseek-chat` with thinking mode
// disabled — identical response shape and pricing. Admins can override per
// feature in the routing panel to `deepseek-v4-pro` for higher-quality calls;
// `body.thinking = { type: 'disabled' }` is forced below so the override never
// silently inherits thinking-enabled defaults from a future DeepSeek release.
const DEEPSEEK_MODEL = 'deepseek-v4-flash';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions';
const DEEPSEEK_BASE = 'https://api.deepseek.com/v1/chat/completions';

interface KeyEntry {
  provider: Provider;
  /** 1-based index of the key in its pool (1, 2 or 3). */
  index: number;
  key: string;
}

function loadPool(): KeyEntry[] {
  const out: KeyEntry[] = [];
  for (let i = 1; i <= 3; i++) {
    const k = (Deno.env.get(`OPENROUTER_KEY_${i}`) || '').trim();
    if (k) out.push({ provider: 'openrouter', index: i, key: k });
  }
  for (let i = 1; i <= 3; i++) {
    const k = (Deno.env.get(`GROQ_KEY_${i}`) || '').trim();
    if (k) out.push({ provider: 'groq', index: i, key: k });
  }
  // DeepSeek: slot 1 reads DEEPSEEK_KEY (no suffix) OR DEEPSEEK_KEY_1
  for (let i = 1; i <= 3; i++) {
    const raw = i === 1
      ? ((Deno.env.get('DEEPSEEK_KEY') || Deno.env.get('DEEPSEEK_KEY_1') || '').trim())
      : (Deno.env.get(`DEEPSEEK_KEY_${i}`) || '').trim();
    if (raw) out.push({ provider: 'deepseek', index: i, key: raw });
  }
  return out;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface PickedKey extends KeyEntry {
  /** All other keys in the same provider's pool, used for the retry. */
  siblings: KeyEntry[];
  /** When routing config overrides the model, this is set. */
  modelOverride?: string;
}

// ForcedRoute = RouteSelection from modelRouter.ts (imported at top).
// provider === 'auto' means no forced route — normal random pool selection applies.

/**
 * Pick a provider first (uniform 50/50 between providers that have keys),
 * then pick a random key inside that provider. Returns the chosen key plus
 * the *other* keys in the same provider so the retry path can pick a
 * different sibling.
 *
 * When `forced.provider` is set, only keys for that provider are considered.
 * Falls back to random selection if the forced provider has no keys.
 */
function pickKey(opts: AICallOptions, forced?: ForcedRoute): PickedKey {
  const pool = loadPool();
  if (pool.length === 0) {
    const err: AIError = {
      message: 'No AI keys configured. Set OPENROUTER_KEY_1..3 and/or GROQ_KEY_1..3.',
      status: 503,
      code: 'no_keys',
    };
    throw err;
  }

  const openrouter = pool.filter(k => k.provider === 'openrouter');
  const groq = pool.filter(k => k.provider === 'groq');

  // Honor forced provider from routing config when that provider has keys.
  // provider === 'auto' means no forced route — use random pool selection.
  if (forced?.provider && forced.provider !== 'auto') {
    const forcedPool = forced.provider === 'openrouter' ? openrouter : forced.provider === 'deepseek' ? pool.filter(k => k.provider === 'deepseek') : groq;
    if (forcedPool.length > 0) {
      const picked = pickRandom(forcedPool);
      return {
        ...picked,
        siblings: forcedPool.filter(k => k.index !== picked.index),
        modelOverride: forced.model,
      };
    }
    // Forced provider has no keys — fall through to random selection.
    console.warn(`[aiClient] forced provider '${forced.provider}' has no keys, falling back to random pool`);
  }

  const deepseek = pool.filter(k => k.provider === 'deepseek');

  // JSON-strict requests prefer Groq (its response_format=json_object is more reliable).
  let chosenProvider: Provider;
  if (opts.jsonMode && groq.length > 0) {
    chosenProvider = 'groq';
  } else {
    // Uniform random selection across providers that have at least one key.
    const available = (
      [
        openrouter.length > 0 ? 'openrouter' : null,
        groq.length > 0 ? 'groq' : null,
        deepseek.length > 0 ? 'deepseek' : null,
      ] as (Provider | null)[]
    ).filter((p): p is Provider => p !== null);
    if (available.length === 0) {
      const err: AIError = {
        message: 'No AI keys configured.',
        status: 503,
        code: 'no_keys',
      };
      throw err;
    }
    chosenProvider = available[Math.floor(Math.random() * available.length)];
  }

  const providerPool = chosenProvider === 'openrouter' ? openrouter : chosenProvider === 'deepseek' ? deepseek : groq;
  const picked = pickRandom(providerPool);
  return { ...picked, siblings: providerPool.filter(k => k.index !== picked.index) };
}

// ── Core HTTP call ────────────────────────────────────────────────────────────
async function callOnce(entry: PickedKey | KeyEntry, opts: AICallOptions): Promise<AIResponse> {
  const isOpenRouter = entry.provider === 'openrouter';
  const isDeepSeek = entry.provider === 'deepseek';
  const url = isOpenRouter ? OPENROUTER_BASE : isDeepSeek ? DEEPSEEK_BASE : GROQ_BASE;
  const defaultModel = isOpenRouter ? OPENROUTER_FREE_MODEL : isDeepSeek ? DEEPSEEK_MODEL : GROQ_FREE_MODEL;
  const pickedEntry = entry as PickedKey;
  const model = (pickedEntry.modelOverride && pickedEntry.modelOverride !== '') ? pickedEntry.modelOverride : defaultModel;

  const body: Record<string, unknown> = {
    model,
    messages: opts.messages,
    temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.7,
  };
  if (typeof opts.maxTokens === 'number') body.max_tokens = opts.maxTokens;
  if (typeof opts.topP === 'number') body.top_p = opts.topP;
  if (opts.tools) body.tools = opts.tools;
  if (opts.toolChoice) body.tool_choice = opts.toolChoice;
  if (opts.responseFormat) {
    body.response_format = opts.responseFormat;
  } else if (opts.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  // DeepSeek's v4 family enables thinking mode by default. We explicitly
  // disable it on every DeepSeek call so behaviour matches the legacy
  // `deepseek-chat` model — same fast latency, no extra thinking tokens on
  // the bill — even when an admin overrides `model` to `deepseek-v4-pro`.
  if (isDeepSeek) {
    body.thinking = { type: 'disabled' };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${entry.key}`,
    'Content-Type': 'application/json',
  };
  if (isOpenRouter) {
    headers['HTTP-Referer'] = 'https://thewise.cloud';
    headers['X-Title'] = 'WiseResume';
  }

  // DeepSeek may queue a request for up to ~10 minutes before starting
  // inference. Without a fetch-level abort, a stuck DeepSeek call would tie
  // up the Edge Function until its platform wall-clock kills it. When the
  // caller hasn't supplied their own AbortSignal we attach a 60-second
  // default for DeepSeek only — the retry path then falls over to a sibling
  // key (or, if routing isn't pinned, to another provider entirely).
  let signal = opts.signal;
  let timeoutHandle: number | undefined;
  let timedOut = false;
  if (!signal && isDeepSeek) {
    const ctrl = new AbortController();
    signal = ctrl.signal;
    timeoutHandle = setTimeout(() => {
      timedOut = true;
      ctrl.abort();
    }, 60_000);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch (fetchErr) {
    if (timedOut) {
      const err: AIError = {
        message: `${entry.provider}:${entry.index} aborted after 60s (DeepSeek inference queue stall)`,
        status: 504,
        code: 'upstream_timeout',
        provider: `${entry.provider}:${entry.index}`,
      };
      throw err;
    }
    throw fetchErr;
  } finally {
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
  }

  const rawText = await res.text();
  if (!res.ok) {
    const err: AIError = {
      message: `${entry.provider}:${entry.index} ${res.status}: ${rawText.slice(0, 400)}`,
      status: res.status,
      // 402 = "insufficient balance" on DeepSeek (and a handful of other
      // OpenAI-compatible providers). Surface it as a distinct code so the
      // admin inspector can show "top up your account" instead of a generic
      // 4xx bad-request bucket.
      code:
        res.status === 429
          ? 'rate_limit'
          : res.status === 402
            ? 'insufficient_balance'
            : res.status >= 500
              ? 'upstream_error'
              : 'bad_request',
      provider: `${entry.provider}:${entry.index}`,
    };
    throw err;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    const err: AIError = {
      message: `${entry.provider}:${entry.index} returned non-JSON body`,
      status: 502,
      code: 'parse_error',
      provider: `${entry.provider}:${entry.index}`,
    };
    throw err;
  }

  const choice = parsed?.choices?.[0];
  const content = choice?.message?.content ?? '';
  return {
    content: typeof content === 'string' ? content : JSON.stringify(content),
    providerUsed: `${entry.provider}:${entry.index}`,
    model,
    toolCalls: choice?.message?.tool_calls,
    finishReason: choice?.finish_reason ?? null,
    usage: parsed?.usage
      ? {
          promptTokens: parsed.usage.prompt_tokens,
          completionTokens: parsed.usage.completion_tokens,
          totalTokens: parsed.usage.total_tokens,
        }
      : undefined,
  };
}

// ── Public entry points ───────────────────────────────────────────────────────
export async function callAI(opts: AICallOptions): Promise<AIResponse> {
  const forced = opts.featureName ? await resolveFeatureRoute(opts.featureName) : undefined;
  const picked = pickKey(opts, forced);
  return callOnce(picked, opts);
}

/**
 * Retry with up to three attempts across two providers:
 *   1. Chosen key (random provider).
 *   2. Sibling key in the same provider (if available).
 *   3. Cross-provider fallback — picks any key from the OTHER provider.
 * This handles the common case where all keys for one provider are
 * temporarily rate-limited and we need to spill over to the other pool.
 */
export async function callAIWithRetry(opts: AICallOptions): Promise<AIResponse> {
  const forced = opts.featureName ? await resolveFeatureRoute(opts.featureName) : undefined;
  const picked = pickKey(opts, forced);

  // Attempt 1: chosen key
  let lastErr: unknown;
  try {
    return await callOnce(picked, opts);
  } catch (err) {
    lastErr = err;
    console.warn(`[aiClient] attempt 1 failed on ${picked.provider}:${picked.index}`);
  }

  // Attempt 2: sibling key in same provider, preserving model override from routing config.
  if (picked.siblings.length > 0) {
    const siblingBase = pickRandom(picked.siblings);
    // Carry the forced model override so retries honour the same routing config.
    const retryEntry: PickedKey = {
      ...siblingBase,
      siblings: [],
      modelOverride: picked.modelOverride,
    };
    console.warn(
      `[aiClient] attempt 2 — sibling ${retryEntry.provider}:${retryEntry.index}`,
    );
    try {
      return await callOnce(retryEntry, opts);
    } catch (err) {
      lastErr = err;
      console.warn(`[aiClient] attempt 2 failed on ${retryEntry.provider}:${retryEntry.index}`);
    }
  }

  // Attempt 3: cross-provider fallback — try any key from a different provider.
  // Skipped when a provider was explicitly forced via routing config so that
  // traffic split / A-B assignments are not silently distorted by retries.
  if (forced?.provider && forced.provider !== 'auto') {
    throw lastErr ?? new Error('[aiClient] all forced-provider attempts exhausted');
  }
  const allKeys = loadPool();
  const crossPool = allKeys.filter(k => k.provider !== picked.provider);
  if (crossPool.length > 0) {
    const crossEntry = pickRandom(crossPool);
    console.warn(
      `[aiClient] attempt 3 — cross-provider fallback to ${crossEntry.provider}:${crossEntry.index}`,
    );
    return await callOnce(crossEntry, opts);
  }

  throw lastErr;
}

/** Legacy alias kept for callers that still import `callWiseresumeAI`. */
export async function callWiseresumeAI(opts: AICallOptions): Promise<AIResponse> {
  return callAIWithRetry(opts);
}

export async function recordBreakerEvent(_provider: string, _success: boolean): Promise<null> {
  return null;
}

export function invalidateOpenRouterAdminCache(): void {}
export function invalidateOpenRouterModelCache(): void {}
export function invalidateGroqModelCache(): void {}

// ── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Trim and clamp free-form text fed into prompts so a single huge document
 * can't blow the model's context window or our cost budget.
 */
export function sanitizeInputText(text: string, maxChars = 15_000): string {
  if (typeof text !== 'string') return '';
  const cleaned = text
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (cleaned.length <= maxChars) return cleaned;
  return cleaned.slice(0, maxChars);
}

export function isAIError(error: unknown): error is AIError {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as AIError).message === 'string' &&
    typeof (error as AIError).status === 'number' &&
    typeof (error as AIError).code === 'string'
  );
}

export function toUserError(error: unknown): { status: number; error: string; message: string } {
  // AuthError thrown by `_shared/authMiddleware.ts#requireAuth` carries its own
  // HTTP status (always 401). Duck-typed here to avoid an import cycle. Without
  // this branch the `error instanceof Error` fall-through below would convert
  // every unauthenticated POST into a generic 500, which is what audit task #61
  // (H1) flagged across 12 edge functions. Surfacing the original 401 restores
  // parity with the gateway's verify_jwt path.
  if (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: string }).name === 'AuthError' &&
    typeof (error as { status?: unknown }).status === 'number'
  ) {
    const e = error as { status: number; message?: string };
    return {
      status: e.status,
      error: e.status === 403 ? 'forbidden' : 'unauthorized',
      message: e.message || 'Unauthorized',
    };
  }
  if (isAIError(error)) {
    if (error.status === 429) {
      return { status: 429, error: 'rate_limit', message: 'AI service is busy right now. Please try again in a moment.' };
    }
    if (error.status >= 500) {
      return { status: 502, error: 'upstream_error', message: 'AI service is temporarily unavailable. Please try again.' };
    }
    if (error.status === 503 && error.code === 'no_keys') {
      return { status: 503, error: 'no_keys', message: 'AI is not configured on this server. Contact support.' };
    }
    return { status: error.status, error: error.code, message: error.message };
  }
  if (error instanceof Error) {
    return { status: 500, error: 'internal_error', message: error.message || 'Unexpected server error' };
  }
  return { status: 500, error: 'internal_error', message: 'Unexpected server error' };
}

/**
 * Best-effort JSON extraction from a model response. Accepts a bare JSON
 * object, a fenced ```json ... ``` block, or a stringified one and returns
 * null on failure.
 */
export function parseAIJSON<T = unknown>(text: string): T | null {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();

  // Fast path: looks like JSON already.
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed) as T;
    } catch { /* fall through */ }
  }

  // Strip a fenced code block.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    try {
      return JSON.parse(fenced[1].trim()) as T;
    } catch { /* fall through */ }
  }

  // Last resort: grab the first {...} or [...] substring.
  const first = trimmed.search(/[\[{]/);
  const last = Math.max(trimmed.lastIndexOf('}'), trimmed.lastIndexOf(']'));
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(trimmed.slice(first, last + 1)) as T;
    } catch { /* fall through */ }
  }
  return null;
}

/**
 * Parse `text` as JSON. If parsing fails we ask the model to clean it up
 * once with a strict JSON-only prompt and try again. Returns null if both
 * attempts fail.
 */
export async function parseAIJSONWithRetry<T = unknown>(
  text: string,
  retryHints: { model?: string; userId?: string; wiseresumeSubProvider?: string } = {},
): Promise<T | null> {
  void retryHints;
  const first = parseAIJSON<T>(text);
  if (first !== null) return first;

  try {
    const response = await callAIWithRetry({
      messages: [
        { role: 'system', content: 'You are a JSON repair tool. Return ONLY valid JSON. No prose, no code fences.' },
        { role: 'user', content: `Re-emit the following as strict JSON only:\n\n${text.slice(0, 8000)}` },
      ],
      temperature: 0,
      maxTokens: 4000,
      jsonMode: true,
    });
    return parseAIJSON<T>(response.content);
  } catch {
    return null;
  }
}
