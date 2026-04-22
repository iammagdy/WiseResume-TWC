/**
 * AI provider defaults shared between the browser DevKit panel and the
 * Supabase Edge Functions.
 *
 * AI-4 (Task #24): the curated OpenRouter slug list, the auto sentinel,
 * and the validator now load directly from the single source of truth at
 * `supabase/functions/_shared/aiProviders.json`. The edge function code
 * (`_shared/aiProviders.ts`) re-exports the same constants so drift is
 * impossible — every consumer reads the JSON.
 */
import providers from '../../supabase/functions/_shared/aiProviders.json';

/** Default Groq model when no BYOK override is set (matches `aiClient.ts`). */
export const GROQ_DEFAULT_MODEL = 'qwen/qwen3-32b';

/**
 * Curated allow-list of OpenRouter slugs the WiseResume managed account is
 * permitted to use, ordered by preference. Position 0 is the default
 * selection. Loaded from `aiProviders.json`.
 */
export const OPENROUTER_CURATED_MODELS = providers.openrouterCuratedModels as readonly string[];

export type OpenRouterCuratedModel = string;

/** Default OpenRouter model used by WiseResume managed AI. */
export const OPENROUTER_DEFAULT_MODEL: OpenRouterCuratedModel = OPENROUTER_CURATED_MODELS[0];

/**
 * Sentinel slug that means "iterate the curated chain on failure". Stored in
 * `openrouterModel` (and in `user_api_keys.model` for BYOK) when the user
 * toggles Auto fallback ON. The routing layer checks for this exact string
 * and walks `OPENROUTER_CURATED_MODELS` in order until one succeeds.
 */
export const OPENROUTER_AUTO_SENTINEL: string = providers.openrouterAutoSentinel;

/** True when `model` is a curated slug or the auto sentinel. */
export function isAllowedOpenRouterModel(model: string): boolean {
  if (!model) return false;
  if (model === OPENROUTER_AUTO_SENTINEL) return true;
  return OPENROUTER_CURATED_MODELS.includes(model);
}

/**
 * Default OpenRouter 2 (secondary managed account) model. Pinned — never
 * discovered dynamically: the slug is the whole point of having a second
 * managed key. If the slug ever needs to change, update it in the routing
 * code (`aiClient.ts`); it intentionally lives outside the curated list.
 */
export const OPENROUTER2_DEFAULT_MODEL = 'openai/gpt-oss-120b:free';
