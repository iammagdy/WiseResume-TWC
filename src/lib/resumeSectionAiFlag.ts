/**
 * Single source of truth for the Task #56 resume-section-ai merge
 * rollout flag. Moved from src/integrations/supabase/ to src/lib/ as
 * part of the Appwrite migration — has no Supabase dependency.
 *
 * Flip USE_MERGED_RESUME_SECTION_AI to roll forward / roll back across
 * all call sites simultaneously. Rollback is only valid against an
 * environment where the four originals (`enhance-section`,
 * `tailor-section`, `fill-gap`, `explain-gap`) are still DEPLOYED.
 * After deletion (or in any environment redeployed strictly from this
 * source state), this flag has no fallback target and must stay `true`.
 */
export const USE_MERGED_RESUME_SECTION_AI = true;

const MERGED_FN = 'resume-section-ai';

export type ResumeSectionAiAction = 'enhance' | 'tailor' | 'fill-gap' | 'explain-gap';

const ACTION_MAP: Record<string, ResumeSectionAiAction> = {
  'enhance-section': 'enhance',
  'tailor-section': 'tailor',
  'fill-gap': 'fill-gap',
  'explain-gap': 'explain-gap',
};

/**
 * Returns the function name the caller should hit for a given legacy
 * function name. While the flag is on, every legacy name maps to the
 * merged `resume-section-ai` router; otherwise the original name is
 * returned unchanged.
 */
export function resumeSectionAiFnName(originalFn: string): string {
  if (!USE_MERGED_RESUME_SECTION_AI) return originalFn;
  if (!(originalFn in ACTION_MAP)) return originalFn;
  return MERGED_FN;
}

/**
 * Returns the dispatch headers the caller should attach for a given
 * legacy function name. While the flag is on, returns the
 * `x-resume-section-ai-action` header so the router can dispatch to
 * the correct handler.
 *
 * @deprecated Prefer `resumeSectionAiBodyProps` for Appwrite SDK callers —
 * `functions.createExecution()` does not forward custom HTTP headers.
 */
export function resumeSectionAiHeader(originalFn: string): Record<string, string> {
  if (!USE_MERGED_RESUME_SECTION_AI) return {};
  const action = ACTION_MAP[originalFn];
  if (!action) return {};
  return { 'x-resume-section-ai-action': action };
}

/**
 * Returns the dispatch key/value that should be spread into the **body**
 * payload for a given legacy function name. Use this instead of
 * `resumeSectionAiHeader` when calling via `edgeFunctions.invoke()` /
 * `functions.createExecution()`, where custom HTTP request headers are
 * not forwarded to the Appwrite Function.
 */
export function resumeSectionAiBodyProps(originalFn: string): Record<string, string> {
  if (!USE_MERGED_RESUME_SECTION_AI) return {};
  const action = ACTION_MAP[originalFn];
  if (!action) return {};
  return { 'x-resume-section-ai-action': action };
}
