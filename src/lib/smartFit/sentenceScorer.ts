import type { ResumeData } from '@/types/resume';
import type { ScoredSentence, SentenceLocation, ProtectedToken } from './types';
import { FILLER_WORD_SET, tokensInText } from './protectedTokens';

/** Augmented scored sentence used by the orchestrator — exposes the
 *  in-parent sentence index so the apply step can re-split + swap. */
export interface ScoredSentenceWithIndex extends ScoredSentence {
  sentenceIndex: number;
}

const SENTENCE_SPLIT_RE = /(?<=[.!?])\s+(?=[A-Z])/;
const WORD_RE = /\b[\w'-]+\b/g;

/**
 * Split a block of text into sentences. The same algorithm is used by both
 * the scorer and `applySmartFitPlan`'s replace-by-index logic, so it MUST
 * be deterministic and round-trippable: `splitSentences(t).join(' ')` is
 * not guaranteed to equal `t`, but the indices returned here are the
 * indices the apply step will use.
 *
 * Exported so the orchestrator can re-split a haystack at apply time and
 * swap the rewritten sentence by position rather than by string match.
 */
export function splitSentences(text: string): string[] {
  if (!text) return [];
  const trimmed = text.trim();
  if (!trimmed) return [];
  // For short bullets, treat the whole thing as one sentence.
  if (trimmed.length < 80 && !/[.!?]\s+[A-Z]/.test(trimmed)) return [trimmed];
  return trimmed.split(SENTENCE_SPLIT_RE).map(s => s.trim()).filter(Boolean);
}

function locationId(loc: SentenceLocation, sentenceIndex: number): string {
  switch (loc.kind) {
    case 'summary':
      return `summary:${sentenceIndex}`;
    case 'experience-description':
      return `exp:${loc.experienceId}:desc:${sentenceIndex}`;
    case 'experience-achievement':
      return `exp:${loc.experienceId}:ach:${loc.achievementIndex}:${sentenceIndex}`;
    case 'project-description':
      return `proj:${loc.projectId}:${sentenceIndex}`;
  }
}

function startYearOf(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const m = dateStr.match(/(19|20)\d{2}/);
  if (!m) return null;
  const y = parseInt(m[0], 10);
  return Number.isFinite(y) ? y : null;
}

function ageYearsForExperience(resume: ResumeData, experienceId: string): number {
  const exp = resume.experience?.find(e => e.id === experienceId);
  if (!exp) return 0;
  const startYear = startYearOf(exp.startDate);
  if (!startYear) return 0;
  return Math.max(0, new Date().getFullYear() - startYear);
}

function countFiller(text: string): number {
  const words = text.toLowerCase().match(WORD_RE) || [];
  return words.filter(w => FILLER_WORD_SET.has(w)).length;
}

function countWords(text: string): number {
  return (text.match(WORD_RE) || []).length;
}

/**
 * Compute the composite overflow-contribution score for a single sentence.
 *
 * Higher score = better candidate to shorten or drop. The formula is a
 * weighted sum of:
 *  - length:      longer text uses more vertical space → +
 *  - filler:      filler words add zero information → +
 *  - protected:   protected tokens cap how much we can shorten → −
 *  - age:         older roles are lower priority → +
 *
 * Pure function so unit tests can pin exact values and so the UI can
 * deterministically order suggestions.
 */
export function scoreSentence(input: {
  text: string;
  ageYears: number;
  protectedTokens: ProtectedToken[];
}): { length: number; words: number; fillerCount: number; protectedCount: number; score: number } {
  const length = input.text.length;
  const words = countWords(input.text);
  const fillerCount = countFiller(input.text);
  const protectedCount = tokensInText(input.text, input.protectedTokens).length;

  // Weights tuned so a 40-word filler-heavy sentence in a 5-year-old role
  // outranks a 20-word JD-keyword-dense sentence in a current role.
  const lengthTerm = Math.min(length, 400) * 0.5;
  const fillerTerm = fillerCount * 8;
  const ageTerm = Math.min(input.ageYears, 15) * 3;
  const protectedPenalty = protectedCount * 12;

  const score = Math.max(0, lengthTerm + fillerTerm + ageTerm - protectedPenalty);
  return { length, words, fillerCount, protectedCount, score };
}

/**
 * Walk every shortenable string in the resume and return scored sentences,
 * sorted by descending score.
 */
export function scoreResume(
  resume: ResumeData,
  protectedTokens: ProtectedToken[],
): ScoredSentenceWithIndex[] {
  const out: ScoredSentenceWithIndex[] = [];

  const pushFor = (text: string, location: SentenceLocation, ageYears: number) => {
    const sentences = splitSentences(text);
    sentences.forEach((s, idx) => {
      const m = scoreSentence({ text: s, ageYears, protectedTokens });
      out.push({
        id: locationId(location, idx),
        location,
        sentenceIndex: idx,
        text: s,
        ageYears,
        ...m,
      });
    });
  };

  if (resume.summary) {
    pushFor(resume.summary, { kind: 'summary' }, 0);
  }

  for (const exp of resume.experience ?? []) {
    const age = ageYearsForExperience(resume, exp.id);
    if (exp.description) {
      pushFor(exp.description, { kind: 'experience-description', experienceId: exp.id }, age);
    }
    (exp.achievements ?? []).forEach((a, achievementIndex) => {
      pushFor(
        a,
        { kind: 'experience-achievement', experienceId: exp.id, achievementIndex },
        age,
      );
    });
  }

  for (const proj of resume.projects ?? []) {
    if (proj.description) {
      pushFor(proj.description, { kind: 'project-description', projectId: proj.id }, 0);
    }
  }

  return out.sort((a, b) => b.score - a.score);
}
