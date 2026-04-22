import { useCallback } from 'react';
import { useResumeScore } from './useResumeScore';
import { ResumeData } from '@/types/resume';

/**
 * Side-effects hook for "Apply" actions in AI tool sheets.
 *
 * Every AI-driven Apply path in the editor (single-bullet enhance, batch
 * boost, recruiter sim fix, agentic chat suggestion, one-page wizard,
 * compare overlay) needs to (a) trigger an immediate ATS rescore against
 * the freshly mutated resume and (b) bypass the cache that keys on
 * `resume.updated_at`. Because Apply mutates local state synchronously
 * and the server's `updated_at` lags behind by a debounced autosave, we
 * use a wall-clock cache key + `force: true` so the score panel reflects
 * the just-applied changes within a single tick.
 */
export function useAIApplyEffects(resumeId: string | undefined) {
  const { scoreResume } = useResumeScore();

  const rescoreAfterApply = useCallback(
    async (nextResume: ResumeData) => {
      if (!resumeId) return;
      try {
        // Date.now() guarantees a unique key per Apply so the in-memory
        // cache (which keys on resume.updated_at) cannot serve a stale
        // score. `force: true` belt-and-braces past any short-circuit.
        await scoreResume(resumeId, nextResume, Date.now().toString(), true);
      } catch {
        // Rescore failures are non-fatal — the Apply itself already
        // succeeded and the score panel will recover on the next
        // background pass. Surfacing a toast here would punish the user
        // for an unrelated network blip.
      }
    },
    [resumeId, scoreResume],
  );

  return { rescoreAfterApply };
}
