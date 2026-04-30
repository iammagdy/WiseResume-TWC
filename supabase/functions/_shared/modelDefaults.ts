/**
 * Canonical AI model slug constants for WiseResume edge functions.
 *
 * These are the only place where model slugs should be written as string
 * literals. When a model is deprecated or you want to switch providers,
 * update the constant here and every function that imports it picks up
 * the change without a per-file code deploy.
 *
 * HOW TO UPDATE A MODEL
 * ─────────────────────
 * 1. Change the relevant constant below (or add a new one).
 * 2. Run `supabase functions deploy` (or deploy all functions) to push
 *    the new bundle to production.
 * 3. Optionally update `app_settings` rows in the DB for runtime-only
 *    overrides that don't require a deploy at all.
 *
 * RUNTIME OVERRIDES
 * ─────────────────
 * The `wiseresume_ai_engine` row in `app_settings` can change the active
 * sub-provider at runtime. Individual model slugs are compile-time defaults;
 * for per-request model overrides use the DevKit admin panel which reads from
 * `app_settings` on every call.
 */

// ── WiseResume Managed Sub-provider Models ────────────────────────────────────

/** Default OpenRouter model (primary managed sub-provider). */
export const WISERESUME_OPENROUTER_MODEL = 'google/gemma-4-31b-it:free';

/** OpenRouter 2 pinned model (premium reasoning path). */
export const WISERESUME_OPENROUTER2_MODEL = 'openai/gpt-oss-120b:free';

/** Groq managed model (fast structured-output path). */
export const WISERESUME_GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * Heuristic groq slug used when the routing layer hasn't yet been updated
 * to emit `providerUsed` suffixes. Kept for backward-compat with older
 * edge function deployments.
 */
export const LEGACY_GROQ_MODEL = 'qwen/qwen3-32b';

/**
 * Legacy OpenRouter 2 slug kept only for display heuristics in ai-test
 * when the actual providerUsed suffix is unavailable.
 */
export const LEGACY_OPENROUTER2_MODEL = 'openrouter/elephant-alpha';

// ── BYOK Provider Default Models ─────────────────────────────────────────────
// Used as fallbacks when a user has configured a BYOK provider but has not
// explicitly chosen a model. These are safe, widely-available defaults.

export const BYOK_DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-20241022',
  groq: LEGACY_GROQ_MODEL,
  mistral: 'mistral-small-latest',
  xai: 'grok-2-mini',
  cohere: 'command-r',
  gemini: 'gemini-2.5-flash',
  openrouter: '',
  ollama: '',
};

// ── DevKit AI-Test Slot Model Allow-Lists ────────────────────────────────────
// Curated per-provider model choices the admin can pick for each AI key slot
// in the DevKit "Send test request" panel. Frontend dropdown options and
// backend body validation are driven from the same source so they cannot
// drift. Anything outside the list is rejected and the request falls back to
// AI_TEST_DEFAULT_MODELS for that provider.

export type AITestProvider = 'openrouter' | 'groq' | 'deepseek';

/** Backward-compatible default per provider — matches the previous hardcoded
 *  ai-test values so behaviour is unchanged when no model is selected. */
export const AI_TEST_DEFAULT_MODELS: Record<AITestProvider, string> = {
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  groq: 'llama-3.3-70b-versatile',
  deepseek: 'deepseek-v4-flash',
};

export const AI_TEST_MODEL_ALLOWLIST: Record<AITestProvider, readonly string[]> = {
  openrouter: [
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-2-9b-it:free',
    'mistralai/mistral-7b-instruct:free',
    'openai/gpt-oss-120b:free',
    'meta-llama/llama-3.1-8b-instruct',
    'openai/gpt-4o-mini',
  ],
  groq: [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
    'qwen/qwen3-32b',
  ],
  deepseek: [
    'deepseek-v4-flash',
    'deepseek-chat',
    'deepseek-reasoner',
  ],
};

export function isAITestProvider(value: unknown): value is AITestProvider {
  return value === 'openrouter' || value === 'groq' || value === 'deepseek';
}

export function isAllowedAITestModel(provider: string, model: string): boolean {
  if (!isAITestProvider(provider)) return false;
  return AI_TEST_MODEL_ALLOWLIST[provider].includes(model);
}

/** Resolve the model to use for an ai-test call: validated requested model →
 *  AI_TEST_DEFAULT_MODELS[provider]. Caller is responsible for layering in
 *  any persisted per-slot choice before calling this. */
export function resolveAITestModel(provider: AITestProvider, requested: string | undefined | null): string {
  const trimmed = typeof requested === 'string' ? requested.trim() : '';
  if (trimmed && isAllowedAITestModel(provider, trimmed)) return trimmed;
  return AI_TEST_DEFAULT_MODELS[provider];
}
