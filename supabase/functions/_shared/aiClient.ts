/**
 * Flat-pool + BYOK AI client.
 *
 * Default path (pool):
 *   6 keys: 3 OpenRouter + 3 Groq. Randomly picked, with one retry on
 *   a sibling key. Free models only.
 *
 * BYOK path (when opts.userId is provided and user has byok_enabled=true):
 *   Resolves the user's saved key from user_api_keys, decrypts it, and
 *   routes the call through their chosen provider. On any failure, throws
 *   AIError { code: 'byok_failed' } — never silently falls back to pool.
 *
 * Public surface preserved so the 30+ AI edge functions don't need edits.
 * Circuit breaker removed; `recordBreakerEvent` is a no-op for compat.
 */
import { getServiceClient } from './dbClient.ts';
import { decrypt } from './encryption.ts';
import { getProvider, buildAuthHeaders, extractResponseContent } from './providers.ts';

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
}

export interface AIResponse {
  content: string;
  /** Provider+key used for this response, e.g. "openrouter:1". Useful for logs/UI. */
  providerUsed: string;
  /** Model slug that actually served the request. */
  model: string;
  toolCalls?: unknown;
  finishReason?: string | null;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AIError {
  message: string;
  status: number;
  code: string;
  provider?: string;
}

/** Retained only so edge functions that still `throw new LegacyKeyVersionError(...)` compile. */
export class LegacyKeyVersionError extends Error {
  constructor(message = 'Legacy BYOK keys are no longer supported') {
    super(message);
    this.name = 'LegacyKeyVersionError';
  }
}

// ── Provider pool ─────────────────────────────────────────────────────────────
type Provider = 'openrouter' | 'groq';

const OPENROUTER_FREE_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
const GROQ_FREE_MODEL = 'llama-3.3-70b-versatile';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions';

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

interface ForcedRoute {
  provider?: Provider;
  model?: string;
}

/**
 * Look up the `ai_routing_config` table for the given feature name.
 * Applies A/B split if configured. Falls back to {} on any error so
 * the normal random pool selection is used.
 */
async function resolveRoutingForFeature(featureName: string): Promise<ForcedRoute> {
  try {
    const db = getServiceClient();
    const { data } = await db
      .from('ai_routing_config')
      .select('provider, model, ab_secondary_provider, ab_secondary_model, ab_split_pct')
      .eq('feature_name', featureName)
      .maybeSingle();

    if (!data || !data.provider || data.provider === 'auto') return {};

    // A/B split: route ab_split_pct% of traffic to the secondary provider
    if (data.ab_secondary_provider && (data.ab_split_pct ?? 0) > 0) {
      if (Math.random() * 100 < data.ab_split_pct) {
        const secProvider = data.ab_secondary_provider as Provider;
        return { provider: secProvider, model: (data.ab_secondary_model ?? '') || undefined };
      }
    }

    return {
      provider: data.provider as Provider,
      model: (data.model ?? '') || undefined,
    };
  } catch {
    return {};
  }
}

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
  if (forced?.provider) {
    const forcedPool = forced.provider === 'openrouter' ? openrouter : groq;
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

  // JSON-strict requests prefer Groq (its response_format=json_object is more reliable).
  let chosenProvider: Provider;
  if (opts.jsonMode && groq.length > 0) {
    chosenProvider = 'groq';
  } else if (openrouter.length > 0 && groq.length > 0) {
    chosenProvider = Math.random() < 0.5 ? 'openrouter' : 'groq';
  } else {
    chosenProvider = openrouter.length > 0 ? 'openrouter' : 'groq';
  }

  const providerPool = chosenProvider === 'openrouter' ? openrouter : groq;
  const picked = pickRandom(providerPool);
  return { ...picked, siblings: providerPool.filter(k => k.index !== picked.index) };
}

// ── Core HTTP call ────────────────────────────────────────────────────────────
async function callOnce(entry: PickedKey | KeyEntry, opts: AICallOptions): Promise<AIResponse> {
  const isOpenRouter = entry.provider === 'openrouter';
  const url = isOpenRouter ? OPENROUTER_BASE : GROQ_BASE;
  const defaultModel = isOpenRouter ? OPENROUTER_FREE_MODEL : GROQ_FREE_MODEL;
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

  const headers: Record<string, string> = {
    Authorization: `Bearer ${entry.key}`,
    'Content-Type': 'application/json',
  };
  if (isOpenRouter) {
    headers['HTTP-Referer'] = 'https://thewise.cloud';
    headers['X-Title'] = 'WiseResume';
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  const rawText = await res.text();
  if (!res.ok) {
    const err: AIError = {
      message: `${entry.provider}:${entry.index} ${res.status}: ${rawText.slice(0, 400)}`,
      status: res.status,
      code: res.status === 429 ? 'rate_limit' : res.status >= 500 ? 'upstream_error' : 'bad_request',
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

// ── BYOK path ─────────────────────────────────────────────────────────────────

interface ByokResolved {
  provider: string;
  key: string;
}

/**
 * Look up the user's BYOK preference + active key.
 *
 * Returns null  → BYOK is disabled; caller falls through to the managed pool.
 * Returns value → decrypted key ready to use.
 * Throws AIError{code:'byok_failed'} → BYOK is ENABLED but key resolution
 *   failed (missing key, decryption error, bad provider). Must NOT fall back
 *   to pool in this case — surface the error immediately.
 */
async function resolveByok(userId: string): Promise<ByokResolved | null> {
  let byokEnabled = false;
  try {
    const db = getServiceClient();

    // Phase 1: read user preference
    const prefsRes = await db
      .from('user_preferences')
      .select('byok_enabled, byok_provider')
      .eq('user_id', userId)
      .maybeSingle();

    if (!prefsRes.data?.byok_enabled) return null; // BYOK off → use pool
    byokEnabled = true;

    const chosenProvider: string = prefsRes.data.byok_provider ?? '';
    if (!chosenProvider) {
      throw {
        message: 'BYOK is enabled but no provider is selected',
        status: 400,
        code: 'byok_failed',
      } as AIError;
    }

    // Phase 2: fetch the active key for that provider
    const keysRes = await db
      .from('user_api_keys')
      .select('provider, encrypted_key')
      .eq('user_id', userId)
      .eq('provider', chosenProvider)
      .eq('is_active', true)
      .maybeSingle();

    if (!keysRes.data) {
      throw {
        message: `BYOK: no active key found for provider '${chosenProvider}'`,
        status: 400,
        code: 'byok_failed',
      } as AIError;
    }

    // Phase 3: decrypt
    const plainKey = await decrypt(keysRes.data.encrypted_key);
    return { provider: chosenProvider, key: plainKey };
  } catch (err) {
    const aiErr = err as AIError;
    if (aiErr.code === 'byok_failed') throw err; // already typed — re-throw as-is

    if (byokEnabled) {
      // BYOK is enabled but an unexpected error occurred during resolution.
      // Never fall back to pool when the user has explicitly opted into BYOK.
      throw {
        message: `BYOK key resolution failed: ${(err as Error).message ?? 'unknown error'}`,
        status: 500,
        code: 'byok_failed',
      } as AIError;
    }

    // BYOK status unknown (DB unreachable before we could read the preference).
    // Safe to fall through to pool — we don't know if BYOK was wanted.
    return null;
  }
}

/** Make a real AI call through a BYOK provider. Throws AIError{code:'byok_failed'} on any error. */
async function callBYOK(opts: AICallOptions, provider: string, key: string): Promise<AIResponse> {
  const cfg = getProvider(provider);
  if (!cfg) {
    throw {
      message: `BYOK: unknown provider '${provider}'`,
      status: 400,
      code: 'byok_failed',
      provider,
    } as AIError;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...buildAuthHeaders(cfg, key),
  };

  // Anthropic native API: system prompts must be extracted to top-level `system`
  // field; only user/assistant messages are allowed in `messages`.
  let normalizedMessages: AIMessage[] = opts.messages;
  const body: Record<string, unknown> = {
    model: cfg.defaultModel,
    temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.7,
    max_tokens: typeof opts.maxTokens === 'number' ? opts.maxTokens : 4096,
  };

  if (cfg.authStyle === 'anthropic') {
    const systemParts = opts.messages.filter(m => m.role === 'system').map(m => m.content);
    normalizedMessages = opts.messages.filter(m => m.role !== 'system');
    if (systemParts.length > 0) body.system = systemParts.join('\n\n');
    body.messages = normalizedMessages;
  } else {
    body.messages = normalizedMessages;
    if (opts.tools) body.tools = opts.tools;
    if (opts.toolChoice) body.tool_choice = opts.toolChoice;
    if (opts.responseFormat) body.response_format = opts.responseFormat;
    else if (opts.jsonMode) body.response_format = { type: 'json_object' };
  }

  if (typeof opts.topP === 'number') body.top_p = opts.topP;

  let res: Response;
  try {
    res = await fetch(cfg.chatEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (fetchErr) {
    throw {
      message: `BYOK ${provider} network error: ${(fetchErr as Error).message}`,
      status: 0,
      code: 'byok_failed',
      provider,
    } as AIError;
  }

  const rawText = await res.text();
  if (!res.ok) {
    let userMessage = rawText.slice(0, 400);
    try {
      const j = JSON.parse(rawText);
      userMessage = j?.error?.message ?? j?.error?.error ?? j?.message ?? userMessage;
    } catch { /* ignore */ }
    throw {
      message: `BYOK ${provider} ${res.status}: ${userMessage}`,
      status: res.status,
      code: 'byok_failed',
      provider,
    } as AIError;
  }

  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(rawText); } catch {
    throw { message: `BYOK ${provider} non-JSON response`, status: 502, code: 'byok_failed', provider } as AIError;
  }

  const content = extractResponseContent(cfg, parsed);

  // Tool calls are only available on OpenAI-compat responses
  const choices = parsed?.choices as Array<{ message?: { tool_calls?: unknown }; finish_reason?: string }> | undefined;
  const choice = choices?.[0];

  const usage = parsed?.usage as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined;
  return {
    content,
    providerUsed: `byok:${provider}`,
    model: (parsed?.model as string | undefined) ?? cfg.defaultModel,
    toolCalls: choice?.message?.tool_calls,
    finishReason: choice?.finish_reason ?? null,
    usage: usage
      ? { promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, totalTokens: usage.total_tokens }
      : undefined,
  };
}

// ── Public entry points ───────────────────────────────────────────────────────
export async function callAI(opts: AICallOptions): Promise<AIResponse> {
  if (opts.userId) {
    const byok = await resolveByok(opts.userId);
    if (byok) return callBYOK(opts, byok.provider, byok.key);
  }
  const forced = opts.featureName ? await resolveRoutingForFeature(opts.featureName) : undefined;
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
 * BYOK path does NOT retry — failure is surfaced immediately.
 */
export async function callAIWithRetry(opts: AICallOptions): Promise<AIResponse> {
  if (opts.userId) {
    const byok = await resolveByok(opts.userId);
    if (byok) return callBYOK(opts, byok.provider, byok.key);
  }
  const forced = opts.featureName ? await resolveRoutingForFeature(opts.featureName) : undefined;
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

  // Attempt 3: cross-provider fallback.
  // Skipped when a provider was explicitly forced via routing config so that
  // traffic split / A-B assignments are not silently distorted by retries.
  if (forced?.provider) {
    throw lastErr ?? new Error('[aiClient] all forced-provider attempts exhausted');
  }
  const otherProvider: Provider = picked.provider === 'openrouter' ? 'groq' : 'openrouter';
  const allKeys = loadPool();
  const crossPool = allKeys.filter(k => k.provider === otherProvider);
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
