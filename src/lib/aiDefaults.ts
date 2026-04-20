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

/** Default OpenRouter model used by WiseResume managed AI. */
export const OPENROUTER_DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

/**
 * Default OpenRouter 2 (secondary managed account) model. Pinned — never
 * discovered dynamically: the slug is the whole point of having a second
 * managed key. If the slug ever needs to change, update it here AND in the
 * mirror in `aiClient.ts`.
 */
export const OPENROUTER2_DEFAULT_MODEL = 'openrouter/elephant-alpha';
