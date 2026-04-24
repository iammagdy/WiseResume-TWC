import type { ResumeData } from '@/types/resume';

/** A single substring that AI rewrites must preserve verbatim. */
export interface ProtectedToken {
  /** The exact substring as it appears in the source text. */
  text: string;
  /** Why this token is protected — used for the diff "preserved" chips. */
  kind:
    | 'number'
    | 'percent'
    | 'currency'
    | 'date'
    | 'date-range'
    | 'company'
    | 'school'
    | 'person'
    | 'cert'
    | 'tech'
    | 'jd-keyword'
    | 'acronym';
}

/** Source location of a sentence/bullet inside a ResumeData. */
export type SentenceLocation =
  | { kind: 'summary' }
  | { kind: 'experience-description'; experienceId: string }
  | { kind: 'experience-achievement'; experienceId: string; achievementIndex: number }
  | { kind: 'project-description'; projectId: string };

/** A scored unit of text considered for shortening or removal. */
export interface ScoredSentence {
  /** Stable id, derived from location — used as React keys + apply targets. */
  id: string;
  /** Where in the resume this text lives. */
  location: SentenceLocation;
  /** The original text. */
  text: string;
  /** Length in characters. */
  length: number;
  /** Number of words. */
  words: number;
  /** Number of recognised filler words ("really", "very", "actually", …). */
  fillerCount: number;
  /** Number of protected tokens detected inside this sentence. */
  protectedCount: number;
  /** Years ago the parent role started, or 0 for non-experience text. */
  ageYears: number;
  /**
   * Composite score (higher = better candidate to shorten/drop). Pure function
   * of the inputs above so unit tests can pin exact values.
   */
  score: number;
}

/** Output of the bullet-pruning stage. */
export interface BulletDropProposal {
  /** Stable id derived from location. */
  id: string;
  experienceId: string;
  achievementIndex: number;
  text: string;
  /** One-line "why this one" explainer. */
  reason: string;
}

/** Output of the section-collapse stage. */
export interface SectionCollapseProposal {
  id: string;
  /** Section key as stored on `ResumeData` (e.g. `languages`, `hobbies`). */
  section: keyof ResumeData;
  /** Items inside the section that will be hidden if user accepts. */
  itemIds: string[];
  reason: string;
  /** Estimated character savings (rough proxy for vertical space saved). */
  estimatedCharsSaved: number;
}

/** Output of the AI rewrite stage. */
export interface SentenceRewriteProposal {
  id: string;
  location: SentenceLocation;
  /** Index of this sentence inside the parent text after splitSentences().
   *  Apply-time we re-split the haystack and only swap this index, so a
   *  rewrite can never accidentally replace a different sentence that
   *  happens to share substrings. */
  sentenceIndex: number;
  /** Original text. */
  before: string;
  /** AI-suggested shorter text. */
  after: string;
  /** Tokens the AI was required to preserve. */
  preserved: ProtectedToken[];
  /** True if the AI's rewrite passed the protected-token validator. */
  validated: boolean;
  /** Validator's reason when `validated === false`. */
  validationReason?: string;
  reason: string;
}

/** Stage tag for telemetry + UI grouping. */
export type SmartFitStage = 'layout' | 'rewrite' | 'prune' | 'collapse';

/** Structured reason why the AI rewrite stage could not complete. */
export interface RewriteFailureInfo {
  kind: 'out-of-credits' | 'rate-limited' | 'network' | 'provider-error' | 'unavailable';
  message: string;
  /** Only present for rate-limited failures. */
  retryAfterSeconds?: number;
}

/** A layout-only fit proposal: shrink the resume's `customization.fontScale`
 *  to a tested value that brings the resume closer to (or at) the target
 *  page count. This is Stage 0 of the convergence loop — purely deterministic,
 *  no AI, no content removal. */
export interface LayoutFitProposal {
  id: string;
  /** The fontScale value currently on the resume. */
  fontScaleBefore: number;
  /** The smaller fontScale this proposal would write back. */
  fontScaleAfter: number;
  /** Pages measured BEFORE this proposal applied. */
  pagesBefore: number;
  /** Pages measured AFTER this proposal alone applied (no content edits). */
  pagesAfter: number;
  reason: string;
}

/** A complete plan returned by the orchestrator. The UI is responsible for
 * showing per-edit cards and ultimately calling `applySmartFitPlan` with
 * the user-selected subset. */
export interface SmartFitPlan {
  targetPages: number;
  /** Pages measured BEFORE any stage ran. */
  pagesBefore: number;
  /** Pages predicted (or measured) after the layout-only step alone. */
  pagesAfterLayout: number;
  /** Stages that actually ran (later stages skip when target is reached). */
  stagesRun: SmartFitStage[];
  /** True if even after every stage we still couldn't reach the target. */
  stillOverflowing: boolean;
  rewrites: SentenceRewriteProposal[];
  drops: BulletDropProposal[];
  collapses: SectionCollapseProposal[];
  /** Optional layout-only fit proposed by the convergence loop. Present only
   *  if the wizard's Stage 0 found a fontScale that helps. */
  layoutFit?: LayoutFitProposal;
  /** Final measured page count if the user accepts the convergence-recommended
   *  selection. Set by the convergence loop, undefined if convergence was
   *  skipped (e.g. measure unavailable). */
  pagesAfterRecommended?: number;
  /** Selection IDs the convergence loop found *necessary* to reach the
   *  target. The wizard pre-checks these. */
  recommendedSelection?: SmartFitSelection;
  /** Present when the AI rewrite stage could not complete. The UI should
   *  surface a single explanatory banner rather than per-sentence cards. */
  rewriteFailure?: RewriteFailureInfo;
}

/** User selection across all proposed edits. */
export interface SmartFitSelection {
  rewrites: Set<string>;
  drops: Set<string>;
  collapses: Set<string>;
  /** True when the user wants the layout-fit fontScale change applied. */
  layoutFit?: boolean;
}
