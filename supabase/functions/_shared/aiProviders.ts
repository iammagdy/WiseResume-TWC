/**
 * Single source of truth for AI provider configuration shared between
 * edge functions and (via direct JSON import) the frontend.
 *
 * Values are loaded from `aiProviders.json`. Do NOT redeclare these
 * constants inline anywhere else — every consumer (creditUtils, aiClient,
 * manage-api-keys, src/lib/aiDefaults) must import from this module
 * (Deno) or from the JSON directly (browser via Vite).
 *
 * AI-4 (Task #24): consolidates BYOK_PROVIDER_ALLOWLIST,
 * OPENAI_COMPAT_BASE_URLS, and OPENROUTER_CURATED_MODELS. A drift between
 * them previously meant either free managed-AI calls (credit util thinks
 * BYOK; router falls through to managed) or BYOK users charged for their
 * own keys.
 */
import providers from './aiProviders.json' assert { type: 'json' };

/** BYOK providers recognised by the credit utility AND routed in callAI. */
export const BYOK_PROVIDER_ALLOWLIST: ReadonlySet<string> = new Set(
  providers.byokAllowlist,
);

/** Provider → OpenAI-compatible chat-completions URL. */
export const OPENAI_COMPAT_BASE_URLS: Readonly<Record<string, string>> =
  providers.openaiCompatibleBaseUrls;

/**
 * Curated allow-list of OpenRouter slugs the WiseResume managed account is
 * permitted to use, ordered by preference. Position 0 is the default.
 */
export const OPENROUTER_CURATED_MODELS: readonly string[] =
  providers.openrouterCuratedModels;

/**
 * Sentinel slug meaning "iterate the curated chain on failure" — stored
 * in `openrouterModel` (and in `user_api_keys.model` for BYOK) when the
 * user toggles Auto fallback ON.
 */
export const OPENROUTER_AUTO_SENTINEL: string = providers.openrouterAutoSentinel;

/** True when `model` is a curated OpenRouter slug or the auto sentinel. */
export function isAllowedOpenRouterModel(model: string | null | undefined): boolean {
  if (!model) return false;
  if (model === OPENROUTER_AUTO_SENTINEL) return true;
  return OPENROUTER_CURATED_MODELS.includes(model);
}

/**
 * Providers that have a dedicated routing branch in callAI (in addition
 * to the generic OPENAI_COMPAT_BASE_URLS routes). Used by the drift test
 * to assert every BYOK-allowlisted provider is actually routable.
 */
export const NON_OPENAI_COMPAT_BYOK_PROVIDERS: readonly string[] = [
  'gemini',
  'openrouter',
  'ollama',
  'anthropic',
];

/**
 * True when the BYOK provider has a routing branch in callAI: either via
 * a dedicated branch (gemini/openrouter/ollama/anthropic) or via the
 * OpenAI-compatible base-URL map.
 */
export function hasRoutingBranch(provider: string): boolean {
  if (NON_OPENAI_COMPAT_BYOK_PROVIDERS.includes(provider)) return true;
  return Object.prototype.hasOwnProperty.call(OPENAI_COMPAT_BASE_URLS, provider);
}
