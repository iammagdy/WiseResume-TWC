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
  RewriteFailureInfo,
} from './types';

/** Thrown by defaultRewriteFn when the endpoint fails for a known reason.
 *  Re-thrown through runRewriteStage so runSmartFit can attach structured
 *  failure info to the plan instead of surfacing N redundant per-card errors. */
class RewriteFailureError extends Error {
  constructor(
    public readonly failureKind: RewriteFailureInfo['kind'],
    message: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'RewriteFailureError';
  }
}

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
  /** Override the AI rewrite request (test seam). Resolves with one outcome
   *  per input candidate. Invalid outcomes still produce a card so the user
   *  can see why the rewrite was rejected. */
  rewriteFn?: (candidates: RewriteRequest[], jobDescription?: string) => Promise<RewriteOutcome[]>;
}

export interface RewriteRequest {
  id: string;
  text: string;
  /** Hint for the server. The server recomputes its own protected-token
   *  set from the source text + JD and unions it with this hint. */
  preserve: ProtectedToken[];
  /** Soft target length in characters. */
  targetLength: number;
}

export interface RewriteOutcome {
  id: string;
  text: string;
  valid: boolean;
  reason?: string;
  /** Tokens the server detected as missing — used to populate the
   *  preserved-chip list on the card so the user can see what was at risk. */
  missingTokens?: string[];
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
  let rewriteFailure: RewriteFailureInfo | undefined;
  if (input.enableRewrite !== false) {
    stagesRun.push('rewrite');
    try {
      rewrites = await runRewriteStage({
        scored,
        protectedTokens,
        charsToRecover,
        jobDescription,
        rewriteFn: input.rewriteFn ?? defaultRewriteFn,
      });
    } catch (err) {
      if (err instanceof RewriteFailureError) {
        rewriteFailure = { kind: err.failureKind, message: err.message, retryAfterSeconds: err.retryAfterSeconds };
      }
      console.warn('[smartFit] rewrite stage failed', err);
    }
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
    rewriteFailure,
  };
}

interface RunRewriteArgs {
  scored: ScoredSentenceWithIndex[];
  protectedTokens: ProtectedToken[];
  charsToRecover: number;
  jobDescription?: string;
  rewriteFn: (candidates: RewriteRequest[], jobDescription?: string) => Promise<RewriteOutcome[]>;
}

async function runRewriteStage(args: RunRewriteArgs): Promise<SentenceRewriteProposal[]> {
  const candidates = args.scored
    .filter(s => s.length >= MIN_REWRITE_LENGTH + 20)
    .filter(s => s.score > 30)
    .slice(0, REWRITE_TOPK);

  if (candidates.length === 0) return [];

  const requests: RewriteRequest[] = candidates.map(c => ({
    id: c.id,
    text: c.text,
    preserve: tokensInText(c.text, args.protectedTokens),
    targetLength: Math.max(MIN_REWRITE_LENGTH, Math.round(c.length * 0.7)),
  }));

  let outcomes: RewriteOutcome[];
  try {
    outcomes = await args.rewriteFn(requests, args.jobDescription);
  } catch (err) {
    if (err instanceof RewriteFailureError) throw err;
    console.warn('[smartFit] rewrite stage failed; skipping', err);
    return [];
  }

  const byId = new Map(outcomes.map(o => [o.id, o] as const));
  const out: SentenceRewriteProposal[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    const outcome = byId.get(cand.id);
    if (!outcome) continue;
    // Defence in depth: re-validate the server's verdict against our local
    // token set. If our local extractor finds a token the server missed,
    // we still mark the card invalid.
    const localMissing = outcome.valid
      ? findMissingTokens(outcome.text, requests[i].preserve)
      : [];
    const validated = outcome.valid && localMissing.length === 0;
    let validationReason: string | undefined;
    if (!validated) {
      const missingNames = (outcome.missingTokens ?? localMissing.map(t => t.text)).slice(0, 3);
      validationReason = outcome.reason
        ?? (missingNames.length > 0
          ? `AI dropped protected ${missingNames.length === 1 ? 'token' : 'tokens'}: ${missingNames.join(', ')}`
          : 'AI rewrite was rejected.');
    }
    out.push({
      id: cand.id,
      location: cand.location,
      sentenceIndex: cand.sentenceIndex,
      before: cand.text,
      after: outcome.text,
      preserved: requests[i].preserve,
      validated,
      validationReason,
      reason: validated
        ? `Top-scoring long sentence in ${describeLocation(cand)}.`
        : `Kept original — ${describeLocation(cand)} (${validationReason}).`,
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

/** POST to the smart-fit-rewrite edge function. Throws RewriteFailureError
 *  when the endpoint cannot be reached or returns a non-success response,
 *  letting the orchestrator attach structured failure info to the plan once
 *  (instead of generating N redundant per-sentence error cards). */
async function defaultRewriteFn(
  candidates: RewriteRequest[],
  jobDescription?: string,
): Promise<RewriteOutcome[]> {
  const { edgeFunctions } = await import('@/integrations/supabase/edgeFunctions');
  const { data, error } = await edgeFunctions.invoke('smart-fit-rewrite', {
    body: { candidates, jobDescription },
  });
  if (error) {
    // edgeFunctions wrapper catches fetch failures and returns { data: null, error: { message } }
    // with no status field — those are network errors.
    const e = error as { message?: string; status?: number };
    const status = e.status ?? 0;
    if (status === 0) {
      throw new RewriteFailureError('network', e.message || 'Cannot reach the AI service. Check your connection and try again.');
    }
    if (status === 402) {
      throw new RewriteFailureError('out-of-credits', e.message || 'Out of AI credits. Add your own Gemini API key for unlimited access.');
    }
    if (status === 429) {
      const m = e.message ?? '';
      const sec = parseInt(m.match(/(\d+)s/)?.[1] ?? '0', 10) || undefined;
      throw new RewriteFailureError('rate-limited', e.message || 'Rate limited — please wait a moment and retry.', sec);
    }
    if (status === 401 || status === 403) {
      throw new RewriteFailureError('unavailable', e.message || 'AI rewrite service authentication failed. Try signing out and back in.');
    }
    throw new RewriteFailureError('provider-error', e.message || 'AI service returned an error. Please try again.');
  }
  const d = data as Record<string, unknown> | null;
  if (!d?.success || !Array.isArray(d.outcomes)) {
    throw new RewriteFailureError('unavailable', 'AI rewrite service returned an unexpected response. Please try again.');
  }
  return (d.outcomes as RewriteOutcome[]).filter(
    o => o && typeof o.id === 'string' && typeof o.text === 'string',
  );
}

/** Result of a rewrite-only retry. */
export interface RewriteRetryResult {
  rewrites: SentenceRewriteProposal[];
  rewriteFailure?: RewriteFailureInfo;
}

/**
 * Re-run only the AI rewrite stage so the UI can refresh rewrite cards
 * without re-doing layout measurement, bullet-pruning, or section-collapse.
 * Merges cleanly into an existing SmartFitPlan on the caller side.
 */
export async function retrySmartFitRewrites(
  resume: ResumeData,
  jobDescription: string | undefined,
  targetPages: 1 | 2 | 3,
  pagesAfterLayout: number,
  rewriteFn?: (candidates: RewriteRequest[], jobDescription?: string) => Promise<RewriteOutcome[]>,
): Promise<RewriteRetryResult> {
  const overflowPages = pagesAfterLayout - targetPages;
  const charsToRecover = Math.ceil(Math.max(0, overflowPages) * CHARS_PER_PAGE);
  const protectedTokens = extractProtectedTokens(resume, jobDescription);
  const scored = scoreResume(resume, protectedTokens);

  let rewrites: SentenceRewriteProposal[] = [];
  let rewriteFailure: RewriteFailureInfo | undefined;
  try {
    rewrites = await runRewriteStage({
      scored,
      protectedTokens,
      charsToRecover,
      jobDescription,
      rewriteFn: rewriteFn ?? defaultRewriteFn,
    });
  } catch (err) {
    if (err instanceof RewriteFailureError) {
      rewriteFailure = { kind: err.failureKind, message: err.message, retryAfterSeconds: err.retryAfterSeconds };
    }
    console.warn('[smartFit] retry rewrite stage failed', err);
  }
  return { rewrites, rewriteFailure };
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
