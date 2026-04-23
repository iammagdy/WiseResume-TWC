/**
 * Flat-pool AI client.
 *
 * 6 keys total: 3 OpenRouter (`OPENROUTER_KEY_1..3`) + 3 Groq
 * (`GROQ_KEY_1..3`). On every call we pick a provider at random (50/50
 * when both have keys), then a random key from that provider's pool.
 * On failure we retry once with a *different* key from the same provider.
 *
 * Free models only:
 *   - OpenRouter: meta-llama/llama-3.3-70b-instruct:free
 *   - Groq:       llama-3.3-70b-versatile
 *
 * Public surface preserved from the prior multi-provider client so the
 * 30+ AI edge functions don't need per-file edits. The fields they
 * reference but no longer matter (`model`, `wiseresumeSubProvider`,
 * `userId`, `temperature`, `maxTokens`, …) are accepted and used where
 * still meaningful (temperature, maxTokens, messages); the rest are
 * silently ignored.
 *
 * BYOK has been removed. `getUserKeyFromDB` and `getUserKeyAndUrlFromDB`
 * are kept as no-op stubs so the few callers that still import them
 * compile; both always return undefined.
 *
 * Circuit breaker has been removed. `isBreakerOpen` always returns false
 * and `recordBreakerEvent` is a no-op.
 */

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
}

/**
 * Pick a provider first (uniform 50/50 between providers that have keys),
 * then pick a random key inside that provider. Returns the chosen key plus
 * the *other* keys in the same provider so the retry path can pick a
 * different sibling.
 */
function pickKey(opts: AICallOptions): PickedKey {
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
async function callOnce(entry: KeyEntry, opts: AICallOptions): Promise<AIResponse> {
  const isOpenRouter = entry.provider === 'openrouter';
  const url = isOpenRouter ? OPENROUTER_BASE : GROQ_BASE;
  const model = isOpenRouter ? OPENROUTER_FREE_MODEL : GROQ_FREE_MODEL;

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

// ── Public entry points ───────────────────────────────────────────────────────
export async function callAI(opts: AICallOptions): Promise<AIResponse> {
  const picked = pickKey(opts);
  return callOnce(picked, opts);
}

/**
 * One retry on failure with a *different* key in the same provider.
 * If no sibling key is available we just propagate the original error.
 */
export async function callAIWithRetry(opts: AICallOptions): Promise<AIResponse> {
  const picked = pickKey(opts);
  try {
    return await callOnce(picked, opts);
  } catch (firstErr) {
    if (picked.siblings.length === 0) throw firstErr;
    const retryEntry = pickRandom(picked.siblings);
    console.warn(
      `[aiClient] retrying after ${picked.provider}:${picked.index} failed; using ${retryEntry.provider}:${retryEntry.index}`,
    );
    return await callOnce(retryEntry, opts);
  }
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
