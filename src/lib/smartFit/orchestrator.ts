import type { ResumeData } from '@/types/resume';
import { extractProtectedTokens, findMissingTokens, tokensInText } from './protectedTokens';
import { scoreResume, splitSentences } from './sentenceScorer';
import type { ScoredSentenceWithIndex } from './sentenceScorer';
import { proposeBulletDrops } from './bulletPruner';
import { proposeSectionCollapses } from './sectionCollapse';
import type {
  SentenceRewriteProposal,
  SmartFitPlan,
  SmartFitSelection,
  SmartFitStage,
  ProtectedToken,
} from './types';

/** How much each whole page is worth in characters — used as a coarse
 * "how much do we need to cut?" target for the deterministic stages. */
const CHARS_PER_PAGE = 2400;

/** Top-K scored sentences sent to the AI rewrite stage. Keeping the
 * payload small minimises cost and makes post-validation tractable. */
const REWRITE_TOPK = 8;

/** Soft cap on per-sentence target length for the AI rewrite — never
 * shorter than this many chars regardless of how aggressive we want to be. */
const MIN_REWRITE_LENGTH = 60;

export interface SmartFitInput {
  resume: ResumeData;
  jobDescription?: string;
  targetPages: 1 | 2 | 3;
  /** Caller-measured ground-truth current page count. */
  currentPages: number;
  /** Predicted page count after the layout-only auto-fit step. Pass the
   *  current pages if the layout step hasn't been run yet — the orchestrator
   *  uses this only to decide whether to invoke later stages. */
  pagesAfterLayout: number;
  /** When false, every AI-rewrite proposal is skipped — useful in tests
   *  and as a fallback when the rewrite endpoint is unavailable. */
  enableRewrite?: boolean;
  /** Override the AI rewrite request (test seam). Resolves with one rewrite
   *  per input candidate; rewrites that come back with `null` are skipped. */
  rewriteFn?: (candidates: RewriteRequest[]) => Promise<(RewriteResponse | null)[]>;
}

export interface RewriteRequest {
  id: string;
  text: string;
  /** Protected tokens that must appear verbatim in the rewrite. */
  preserve: ProtectedToken[];
  /** Soft target length in characters. */
  targetLength: number;
}

export interface RewriteResponse {
  id: string;
  text: string;
}

/**
 * Run all four stages and return a plan the UI can render as per-edit cards.
 * The orchestrator never mutates the resume — that's the caller's job after
 * the user picks which proposals to apply.
 */
export async function runSmartFit(input: SmartFitInput): Promise<SmartFitPlan> {
  const { resume, jobDescription, targetPages, currentPages, pagesAfterLayout } = input;
  const stagesRun: SmartFitStage[] = ['layout'];

  // Already on target after layout? Done.
  if (pagesAfterLayout <= targetPages) {
    return {
      targetPages,
      pagesBefore: currentPages,
      pagesAfterLayout,
      stagesRun,
      stillOverflowing: false,
      rewrites: [],
      drops: [],
      collapses: [],
    };
  }

  const overflowPages = pagesAfterLayout - targetPages;
  let charsToRecover = Math.ceil(overflowPages * CHARS_PER_PAGE);

  const protectedTokens = extractProtectedTokens(resume, jobDescription);
  const scored = scoreResume(resume, protectedTokens);

  // ── Stage 1: surgical AI rewrite ────────────────────────────────────────
  let rewrites: SentenceRewriteProposal[] = [];
  if (input.enableRewrite !== false) {
    stagesRun.push('rewrite');
    rewrites = await runRewriteStage({
      scored,
      protectedTokens,
      charsToRecover,
      rewriteFn: input.rewriteFn ?? defaultRewriteFn,
    });
    const charsRecoveredFromRewrites = rewrites
      .filter(r => r.validated)
      .reduce((sum, r) => sum + Math.max(0, r.before.length - r.after.length), 0);
    charsToRecover = Math.max(0, charsToRecover - charsRecoveredFromRewrites);
  }

  // ── Stage 2: bullet pruning ─────────────────────────────────────────────
  let drops = proposeBulletDrops(resume, scored, charsToRecover);
  if (drops.length > 0) {
    stagesRun.push('prune');
    const charsRecoveredFromDrops = drops.reduce((sum, d) => sum + d.text.length, 0);
    charsToRecover = Math.max(0, charsToRecover - charsRecoveredFromDrops);
  }

  // ── Stage 3: section collapse ──────────────────────────────────────────
  let collapses = proposeSectionCollapses(resume, charsToRecover);
  if (collapses.length > 0) {
    stagesRun.push('collapse');
    const charsRecoveredFromCollapse = collapses.reduce(
      (sum, c) => sum + c.estimatedCharsSaved,
      0,
    );
    charsToRecover = Math.max(0, charsToRecover - charsRecoveredFromCollapse);
  }

  return {
    targetPages,
    pagesBefore: currentPages,
    pagesAfterLayout,
    stagesRun,
    stillOverflowing: charsToRecover > 0,
    rewrites,
    drops,
    collapses,
  };
}

interface RunRewriteArgs {
  scored: ScoredSentenceWithIndex[];
  protectedTokens: ProtectedToken[];
  charsToRecover: number;
  rewriteFn: (candidates: RewriteRequest[]) => Promise<(RewriteResponse | null)[]>;
}

async function runRewriteStage(args: RunRewriteArgs): Promise<SentenceRewriteProposal[]> {
  // Pick the top-K candidates that are long enough to be worth shortening
  // and whose protected-token density doesn't already cap them at their
  // current length.
  const candidates = args.scored
    .filter(s => s.length >= MIN_REWRITE_LENGTH + 20)
    .filter(s => s.score > 30)
    .slice(0, REWRITE_TOPK);

  if (candidates.length === 0) return [];

  const requests: RewriteRequest[] = candidates.map(c => ({
    id: c.id,
    text: c.text,
    preserve: tokensInText(c.text, args.protectedTokens),
    // Soft target: aim to halve the overflow contribution of this sentence,
    // but never below MIN_REWRITE_LENGTH.
    targetLength: Math.max(MIN_REWRITE_LENGTH, Math.round(c.length * 0.7)),
  }));

  let responses: (RewriteResponse | null)[];
  try {
    responses = await args.rewriteFn(requests);
  } catch (err) {
    console.warn('[smartFit] rewrite stage failed; skipping', err);
    return [];
  }

  const out: SentenceRewriteProposal[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    const resp = responses[i];
    if (!resp || !resp.text) continue;
    const after = resp.text.trim();
    // Require the AI to actually shorten — same/longer rewrites are skipped.
    if (after.length >= cand.text.length) continue;
    const missing = findMissingTokens(after, requests[i].preserve);
    out.push({
      id: cand.id,
      location: cand.location,
      sentenceIndex: cand.sentenceIndex,
      before: cand.text,
      after,
      preserved: requests[i].preserve,
      validated: missing.length === 0,
      validationReason: missing.length > 0
        ? `AI dropped ${missing.length} protected ${missing.length === 1 ? 'token' : 'tokens'}: ${missing.slice(0, 3).map(m => m.text).join(', ')}`
        : undefined,
      reason: `Top-scoring long sentence in ${describeLocation(cand)}.`,
    });
  }
  return out;
}

function describeLocation(s: ScoredSentenceWithIndex): string {
  switch (s.location.kind) {
    case 'summary': return 'your summary';
    case 'experience-description': return 'an experience description';
    case 'experience-achievement': return 'an achievement bullet';
    case 'project-description': return 'a project description';
  }
}

/**
 * Default rewrite function — POSTs to the smart-fit-rewrite edge function
 * via the existing /api/fn proxy. Fails closed: if the endpoint is missing
 * or returns a non-OK response, returns nulls so the orchestrator skips
 * the rewrite stage cleanly.
 */
async function defaultRewriteFn(
  candidates: RewriteRequest[],
): Promise<(RewriteResponse | null)[]> {
  // Lazy-import to keep the orchestrator's surface tree-shakeable in tests.
  const { edgeFunctions } = await import('@/integrations/supabase/edgeFunctions');
  try {
    const { data, error } = await edgeFunctions.functions.invoke('smart-fit-rewrite', {
      body: { candidates },
    });
    if (error || !data?.success || !Array.isArray(data.rewrites)) {
      return candidates.map(() => null);
    }
    const byId = new Map<string, string>();
    for (const r of data.rewrites as { id: string; text: string }[]) {
      if (typeof r.id === 'string' && typeof r.text === 'string') byId.set(r.id, r.text);
    }
    return candidates.map(c => {
      const text = byId.get(c.id);
      return text ? { id: c.id, text } : null;
    });
  } catch (err) {
    console.warn('[smartFit] rewrite endpoint unavailable; skipping AI stage', err);
    return candidates.map(() => null);
  }
}

/**
 * Apply the user's selection from a SmartFitPlan to a resume, returning a
 * new ResumeData. Pure — never mutates the input.
 */
export function applySmartFitPlan(
  resume: ResumeData,
  plan: SmartFitPlan,
  selection: SmartFitSelection,
): ResumeData {
  let next: ResumeData = { ...resume };

  // ── Apply rewrites ────────────────────────────────────────────────────
  // We collect every selected & validated rewrite first, then group them by
  // their target text-block so multiple rewrites on the same description /
  // achievement can be applied together by re-splitting once.
  const acceptedRewrites = plan.rewrites.filter(
    r => selection.rewrites.has(r.id) && r.validated,
  );
  if (acceptedRewrites.length > 0) {
    // Apply summary rewrites
    const summaryRewrites = acceptedRewrites.filter(r => r.location.kind === 'summary');
    if (summaryRewrites.length > 0 && next.summary) {
      next = { ...next, summary: replaceByIndex(next.summary, summaryRewrites) };
    }

    // Apply experience-description + achievement rewrites
    const expRewrites = acceptedRewrites.filter(
      r => r.location.kind === 'experience-description' || r.location.kind === 'experience-achievement',
    );
    if (expRewrites.length > 0) {
      next = {
        ...next,
        experience: (next.experience ?? []).map(exp => {
          const descRewrites = expRewrites.filter(
            r => r.location.kind === 'experience-description' && r.location.experienceId === exp.id,
          );
          const achRewrites = expRewrites.filter(
            r => r.location.kind === 'experience-achievement' && r.location.experienceId === exp.id,
          );
          if (descRewrites.length === 0 && achRewrites.length === 0) return exp;
          const description = descRewrites.length > 0
            ? replaceByIndex(exp.description, descRewrites)
            : exp.description;
          const achievements = (exp.achievements ?? []).map((a, idx) => {
            const matches = achRewrites.filter(
              r => r.location.kind === 'experience-achievement' && r.location.achievementIndex === idx,
            );
            return matches.length > 0 ? replaceByIndex(a, matches) : a;
          });
          return { ...exp, description, achievements };
        }),
      };
    }

    // Apply project-description rewrites
    const projRewrites = acceptedRewrites.filter(r => r.location.kind === 'project-description');
    if (projRewrites.length > 0) {
      next = {
        ...next,
        projects: (next.projects ?? []).map(proj => {
          const matches = projRewrites.filter(
            r => r.location.kind === 'project-description' && r.location.projectId === proj.id,
          );
          if (matches.length === 0) return proj;
          return { ...proj, description: replaceByIndex(proj.description, matches) };
        }),
      };
    }
  }

  // ── Apply bullet drops ────────────────────────────────────────────────
  const dropsById = new Map<string, typeof plan.drops[number]>();
  for (const d of plan.drops) {
    if (selection.drops.has(d.id)) dropsById.set(d.id, d);
  }
  if (dropsById.size > 0) {
    next = {
      ...next,
      experience: (next.experience ?? []).map(exp => {
        const dropsForExp = Array.from(dropsById.values())
          .filter(d => d.experienceId === exp.id)
          .map(d => d.achievementIndex);
        if (dropsForExp.length === 0) return exp;
        const dropSet = new Set(dropsForExp);
        return {
          ...exp,
          achievements: (exp.achievements ?? []).filter((_, idx) => !dropSet.has(idx)),
        };
      }),
    };
  }

  // ── Apply section collapses ───────────────────────────────────────────
  for (const c of plan.collapses) {
    if (!selection.collapses.has(c.id)) continue;
    next = collapseSection(next, c.section, new Set(c.itemIds));
  }
  return next;
}

/**
 * Re-split `haystack` using the same sentence splitter the orchestrator used
 * at scoring time, then for every rewrite whose `sentenceIndex` is in range
 * AND whose `before` still matches the sentence at that index, swap it in.
 *
 * We re-validate the `before` text so a stale plan (resume edited between
 * analyze and apply) can never silently corrupt content — it just no-ops
 * for that one sentence.
 */
function replaceByIndex(haystack: string, rewrites: SentenceRewriteProposal[]): string {
  if (!haystack) return haystack;
  const sentences = splitSentences(haystack);
  if (sentences.length === 0) return haystack;
  let changed = false;
  for (const r of rewrites) {
    const idx = r.sentenceIndex;
    if (idx < 0 || idx >= sentences.length) continue;
    const cur = sentences[idx];
    // Only swap if the current sentence still matches what we scored.
    if (cur.trim() !== r.before.trim()) continue;
    sentences[idx] = r.after.trim();
    changed = true;
  }
  return changed ? sentences.join(' ') : haystack;
}

function collapseSection(
  resume: ResumeData,
  section: keyof ResumeData,
  itemIds: Set<string>,
): ResumeData {
  switch (section) {
    case 'languages':
      return { ...resume, languages: (resume.languages ?? []).filter(l => !itemIds.has(l.id)) };
    case 'hobbies':
      return {
        ...resume,
        hobbies: (resume.hobbies ?? []).map(h =>
          itemIds.has(h.id) ? { ...h, visible: false } : h,
        ),
      };
    case 'certifications':
      return {
        ...resume,
        certifications: (resume.certifications ?? []).filter(c => !itemIds.has(c.id)),
      };
    case 'references':
      return { ...resume, references: (resume.references ?? []).filter(r => !itemIds.has(r.id)) };
    default:
      return resume;
  }
}
