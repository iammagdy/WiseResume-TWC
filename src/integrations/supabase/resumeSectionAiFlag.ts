/**
 * Single source of truth for the Task #56 resume-section-ai merge
 * rollout flag. Imported by:
 *
 *   - `src/integrations/supabase/edgeFunctions.ts`
 *     (`rewriteResumeSectionAiInvoke`) — for `edgeFunctions.invoke()`
 *     callers (GapExplainerSheet, GapFillerSheet, RecruiterSimSheet).
 *   - `src/hooks/useAIEnhance.ts`,
 *     `src/hooks/useATSSuggestions.ts`,
 *     `src/lib/aiTailor.ts`,
 *     `src/components/editor/SectionAIPopover.tsx`,
 *     `src/components/editor/ai/AIEnhanceSheet.tsx`,
 *     `src/components/editor/tailor/QuickActions.tsx`
 *     (raw-fetch paths via `apiFnUrl()` that bypass the rewrite helper).
 *
 * Flip this single constant to roll forward / roll back across all
 * call sites simultaneously. Rollback is only valid against an
 * environment where the four originals (`enhance-section`,
 * `tailor-section`, `fill-gap`, `explain-gap`) are still DEPLOYED —
 * i.e. prod during the 24-hour soak window before the downstream
 * redeploy task runs the platform-side delete. After deletion (or in
 * any environment redeployed strictly from this source state), this
 * flag has no fallback target and must stay `true`.
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
 * the correct handler. The header is the primary dispatch path because
 * the `enhance` action's body already carries its own inner
 * `body.action` field (generate/improve/ats_optimize/fix_error/…) and
 * the router would otherwise have no unambiguous way to disambiguate.
 */
export function resumeSectionAiHeader(originalFn: string): Record<string, string> {
  if (!USE_MERGED_RESUME_SECTION_AI) return {};
  const action = ACTION_MAP[originalFn];
  if (!action) return {};
  return { 'x-resume-section-ai-action': action };
}
