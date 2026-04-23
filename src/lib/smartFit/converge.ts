import type { ResumeData } from '@/types/resume';
import { applySmartFitPlan } from './orchestrator';
import { findMissingTokens, extractProtectedTokens } from './protectedTokens';
import {
  COMPACT_SCALE_MIN,
  AUTO_FIT_SCALE_MAX,
} from '@/lib/templateCustomization';
import type {
  SmartFitPlan,
  SmartFitSelection,
  LayoutFitProposal,
  ProtectedToken,
} from './types';

const SCALE_EPSILON = 0.005;
const MIN_PAGE_DELTA = 0.0;
const MAX_LAYOUT_ITERATIONS = 3;

export interface MeasureFn {
  (resume: ResumeData): Promise<number>;
}

export interface ConvergeArgs {
  resume: ResumeData;
  plan: SmartFitPlan;
  targetPages: number;
  /** Async measurement of a hypothetical resume's rendered page count. The
   *  caller is responsible for mounting whatever offscreen DOM is needed
   *  and waiting for layout to settle before returning. */
  measure: MeasureFn;
  /** Optional progress callback so the wizard can show "trying edit 3 of 12". */
  onProgress?: (info: ConvergeProgress) => void;
}

export interface ConvergeProgress {
  stage: 'baseline' | 'layout' | 'rewrite' | 'prune' | 'collapse';
  tested: number;
  total: number;
  pages: number;
}

export interface ConvergeResult {
  /** Final measured page count once the recommended selection is applied. */
  finalPages: number;
  /** Selection IDs that were necessary to reach the target (or, if we couldn't
   *  reach the target, the set that got us closest). */
  recommended: SmartFitSelection;
  /** Optional layout fit chosen by Stage 0. */
  layoutFit?: LayoutFitProposal;
  /** Per-stage trace for telemetry / debugging. */
  trace: Array<{ stage: ConvergeProgress['stage']; pages: number; appliedCount: number }>;
  /** True when finalPages > targetPages. */
  stillOverflowing: boolean;
}

/**
 * Apply edits in priority order (layout → rewrites → drops → collapses) and
 * re-measure after each application. Stops as soon as `measure(resume) ≤ target`.
 * Edits that don't actually reduce measured pages are dropped from the
 * recommendation, so the surfaced plan is the minimal set that hits the target.
 */
export async function convergeSmartFitPlan(args: ConvergeArgs): Promise<ConvergeResult> {
  const { resume, plan, targetPages, measure, onProgress } = args;
  const trace: ConvergeResult['trace'] = [];

  // ── Baseline measurement ─────────────────────────────────────────────
  const baseline = await measure(resume);
  trace.push({ stage: 'baseline', pages: baseline, appliedCount: 0 });
  onProgress?.({ stage: 'baseline', tested: 0, total: 0, pages: baseline });
  if (baseline <= targetPages) {
    return {
      finalPages: baseline,
      recommended: emptySelection(),
      trace,
      stillOverflowing: false,
    };
  }

  let workingResume = resume;
  let workingPages = baseline;
  const recommended = emptySelection();
  let layoutFit: LayoutFitProposal | undefined;

  // Stage 0: layout fit (deterministic, content-preserving).
  const layoutResult = await tryLayoutFit({
    resume: workingResume,
    targetPages,
    measure,
    onProgress,
  });
  if (layoutResult) {
    layoutFit = layoutResult.proposal;
    workingResume = layoutResult.resume;
    workingPages = layoutResult.pagesAfter;
    trace.push({ stage: 'layout', pages: workingPages, appliedCount: 1 });
    recommended.layoutFit = true;
    if (workingPages <= targetPages) {
      return { finalPages: workingPages, recommended, layoutFit, trace, stillOverflowing: false };
    }
  }

  // Stage 1: rewrites (validated only, in score order).
  const validRewrites = plan.rewrites.filter(r => r.validated);
  for (let i = 0; i < validRewrites.length; i++) {
    if (workingPages <= targetPages) break;
    const r = validRewrites[i];
    recommended.rewrites.add(r.id);
    const candidate = applySmartFitPlan(workingResume, plan, recommended);
    const pagesAfter = await measure(candidate);
    onProgress?.({ stage: 'rewrite', tested: i + 1, total: validRewrites.length, pages: pagesAfter });
    if (pagesAfter < workingPages - MIN_PAGE_DELTA) {
      workingResume = candidate;
      workingPages = pagesAfter;
    } else {
      recommended.rewrites.delete(r.id);
    }
  }
  if (recommended.rewrites.size > 0) {
    trace.push({ stage: 'rewrite', pages: workingPages, appliedCount: recommended.rewrites.size });
  }
  if (workingPages <= targetPages) {
    return { finalPages: workingPages, recommended, layoutFit, trace, stillOverflowing: false };
  }

  // Stage 2: bullet drops.
  for (let i = 0; i < plan.drops.length; i++) {
    if (workingPages <= targetPages) break;
    const d = plan.drops[i];
    recommended.drops.add(d.id);
    const candidate = applySmartFitPlan(workingResume, plan, recommended);
    const pagesAfter = await measure(candidate);
    onProgress?.({ stage: 'prune', tested: i + 1, total: plan.drops.length, pages: pagesAfter });
    if (pagesAfter < workingPages - MIN_PAGE_DELTA) {
      workingResume = candidate;
      workingPages = pagesAfter;
    } else {
      recommended.drops.delete(d.id);
    }
  }
  if (recommended.drops.size > 0) {
    trace.push({ stage: 'prune', pages: workingPages, appliedCount: recommended.drops.size });
  }
  if (workingPages <= targetPages) {
    return { finalPages: workingPages, recommended, layoutFit, trace, stillOverflowing: false };
  }

  // Stage 3: section collapses.
  for (let i = 0; i < plan.collapses.length; i++) {
    if (workingPages <= targetPages) break;
    const c = plan.collapses[i];
    recommended.collapses.add(c.id);
    const candidate = applySmartFitPlan(workingResume, plan, recommended);
    const pagesAfter = await measure(candidate);
    onProgress?.({ stage: 'collapse', tested: i + 1, total: plan.collapses.length, pages: pagesAfter });
    if (pagesAfter < workingPages - MIN_PAGE_DELTA) {
      workingResume = candidate;
      workingPages = pagesAfter;
    } else {
      recommended.collapses.delete(c.id);
    }
  }
  if (recommended.collapses.size > 0) {
    trace.push({ stage: 'collapse', pages: workingPages, appliedCount: recommended.collapses.size });
  }

  return {
    finalPages: workingPages,
    recommended,
    layoutFit,
    trace,
    stillOverflowing: workingPages > targetPages,
  };
}

interface TryLayoutFitArgs {
  resume: ResumeData;
  targetPages: number;
  measure: MeasureFn;
  onProgress?: (info: ConvergeProgress) => void;
}

interface TryLayoutFitResult {
  proposal: LayoutFitProposal;
  resume: ResumeData;
  pagesAfter: number;
}

/** Iteratively refine `customization.fontScale` toward the target page count
 *  using a linear projection refined by real measurement (max 3 passes). */
async function tryLayoutFit(args: TryLayoutFitArgs): Promise<TryLayoutFitResult | null> {
  const { resume, targetPages, measure, onProgress } = args;
  const startScale = resume.customization?.fontScale ?? 1;
  let currentScale = startScale;
  let workingResume = resume;
  let workingPages = await measure(workingResume);
  if (workingPages <= targetPages) return null;
  const startPages = workingPages;

  let bestScale = currentScale;
  let bestPages = workingPages;

  for (let iter = 0; iter < MAX_LAYOUT_ITERATIONS; iter++) {
    const projected = currentScale * (targetPages / Math.max(1, workingPages));
    const clamped = Math.max(COMPACT_SCALE_MIN, Math.min(AUTO_FIT_SCALE_MAX, projected));
    if (Math.abs(clamped - currentScale) < SCALE_EPSILON) break;
    const candidate: ResumeData = {
      ...workingResume,
      customization: { ...(workingResume.customization ?? {}), fontScale: clamped },
    };
    const pagesAfter = await measure(candidate);
    onProgress?.({ stage: 'layout', tested: iter + 1, total: MAX_LAYOUT_ITERATIONS, pages: pagesAfter });
    if (pagesAfter < bestPages || (pagesAfter === bestPages && clamped > bestScale)) {
      bestPages = pagesAfter;
      bestScale = clamped;
    }
    currentScale = clamped;
    workingResume = candidate;
    workingPages = pagesAfter;
    if (pagesAfter <= targetPages) break;
  }

  if (bestPages >= startPages || Math.abs(bestScale - startScale) < SCALE_EPSILON) {
    return null;
  }

  const finalResume: ResumeData = {
    ...resume,
    customization: { ...(resume.customization ?? {}), fontScale: bestScale },
  };
  const proposal: LayoutFitProposal = {
    id: 'layout:font-fit',
    fontScaleBefore: startScale,
    fontScaleAfter: bestScale,
    pagesBefore: startPages,
    pagesAfter: bestPages,
    reason: bestPages <= targetPages
      ? `Reduce text size to ${Math.round(bestScale * 100)}% — fits in ${targetPages} ${targetPages === 1 ? 'page' : 'pages'} with no content cut.`
      : `Reduce text size to ${Math.round(bestScale * 100)}% — gets us from ${startPages} to ${bestPages} pages.`,
  };
  return { proposal, resume: finalResume, pagesAfter: bestPages };
}

function emptySelection(): SmartFitSelection {
  return { rewrites: new Set(), drops: new Set(), collapses: new Set() };
}

/** Invariant check: every protected token from the original resume must
 *  still appear in the merged resume after the plan is applied. */
export function verifyTokensPreserved(
  before: ResumeData,
  after: ResumeData,
  jobDescription: string | null | undefined,
): { ok: true } | { ok: false; missing: ProtectedToken[] } {
  const tokens = extractProtectedTokens(before, jobDescription ?? '');
  const haystack = serializeResumeForCheck(after);
  const missing = findMissingTokens(haystack, tokens);
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

function serializeResumeForCheck(r: ResumeData): string {
  const parts: string[] = [];
  if (r.summary) parts.push(r.summary);
  for (const e of r.experience ?? []) {
    parts.push(e.position ?? '', e.company ?? '', e.description ?? '');
    for (const a of e.achievements ?? []) parts.push(a ?? '');
  }
  for (const ed of r.education ?? []) {
    parts.push(ed.degree ?? '', ed.field ?? '', ed.institution ?? '');
  }
  for (const p of r.projects ?? []) parts.push(p.name ?? '', p.description ?? '');
  for (const c of r.certifications ?? []) parts.push(c.name ?? '', c.issuer ?? '');
  return parts.join(' ');
}
