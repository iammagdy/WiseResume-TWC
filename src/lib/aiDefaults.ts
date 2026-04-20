/**
 * AI provider defaults shared between the browser DevKit panel and (by mirror)
 * the Supabase Edge Functions in `supabase/functions/_shared/aiClient.ts`.
 *
 * Edge Functions run on Deno and cannot directly import from `src/`, so the
 * constants are duplicated there. **If you change a value here, update the
 * mirror in `aiClient.ts` too.** The single source of authority for routing
 * decisions remains `aiClient.ts`; this file exists so the DevKit can show
 * the same default value the routing layer uses (audit finding U5).
 */

/** Default Groq model when no BYOK override is set (matches `aiClient.ts:1240`). */
export const GROQ_DEFAULT_MODEL = 'qwen/qwen3-32b';

/**
 * Curated allow-list of OpenRouter slugs the WiseResume managed account is
 * permitted to use, ordered by preference. The list is intentionally small
 * (8 entries) and hand-picked: it replaces live `/models` discovery on the
 * server and gates writes through manage-api-keys + the admin audit endpoint.
 *
 * **Mirror in `supabase/functions/_shared/aiClient.ts`** — both files MUST
 * stay in lockstep, otherwise the DevKit will offer slugs the routing layer
 * silently ignores or vice versa.
 *
 * Position 0 is the default selection.
 */
export const OPENROUTER_CURATED_MODELS = [
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'minimax/minimax-m2.5:free',
  'liquid/lfm-2.5-1.2b-thinking:free',
  'google/gemma-4-26b-a4b-it:free',
  'openrouter/elephant-alpha',
  'liquid/lfm-2.5-1.2b-instruct:free',
  'openai/gpt-oss-120b:free',
] as const;

export type OpenRouterCuratedModel = typeof OPENROUTER_CURATED_MODELS[number];

/** Default OpenRouter model used by WiseResume managed AI. */
export const OPENROUTER_DEFAULT_MODEL: OpenRouterCuratedModel = OPENROUTER_CURATED_MODELS[0];

/**
 * Sentinel slug that means "iterate the curated chain on failure". Stored in
 * `openrouterModel` (and in `user_api_keys.model` for BYOK) when the user
 * toggles Auto fallback ON. The routing layer checks for this exact string
 * and walks `OPENROUTER_CURATED_MODELS` in order until one succeeds.
 */
export const OPENROUTER_AUTO_SENTINEL = '__auto__';

/** True when `model` is a curated slug or the auto sentinel. */
export function isAllowedOpenRouterModel(model: string): boolean {
  if (!model) return false;
  if (model === OPENROUTER_AUTO_SENTINEL) return true;
  return (OPENROUTER_CURATED_MODELS as readonly string[]).includes(model);
}

/**
 * Default OpenRouter 2 (secondary managed account) model. Pinned — never
 * discovered dynamically: the slug is the whole point of having a second
 * managed key. If the slug ever needs to change, update it here AND in the
 * mirror in `aiClient.ts`.
 */
export const OPENROUTER2_DEFAULT_MODEL = 'openrouter/elephant-alpha';
