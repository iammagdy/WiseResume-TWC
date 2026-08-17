import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ResumeHealthScore } from '@/hooks/useResumeScore';

const EMPTY_HISTORY: ScoreHistoryEntry[] = [];

export interface ScoreHistoryEntry {
  score: number;
  timestamp: string;
  basis: ResumeHealthScore['scoreBasis'];
  categories: ResumeHealthScore['categories'];
}

interface ATSScoreHistoryState {
  history: Record<string, ScoreHistoryEntry[]>;
  addScore: (resumeId: string, entry: { overallScore: number; categories: ScoreHistoryEntry['categories'] }) => void;
  getHistory: (resumeId: string) => ScoreHistoryEntry[];
  clearHistory: (resumeId: string) => void;
}

export const useATSScoreHistoryStore = create<ATSScoreHistoryState>()(
  persist(
    (set, get) => ({
      history: {},

      addScore: (resumeId, { overallScore, categories }) => {
        set((state) => {
          const current = state.history[resumeId] || [];
          // Deduplicate: skip if latest entry has identical scores
          const last = current[current.length - 1];
          if (last && last.basis === 'resume-completeness-v1' && last.score === overallScore &&
              last.categories.contactCompleteness === categories.contactCompleteness &&
              last.categories.summaryCompleteness === categories.summaryCompleteness &&
              last.categories.experienceCompleteness === categories.experienceCompleteness &&
              last.categories.educationCompleteness === categories.educationCompleteness &&
              last.categories.skillsCompleteness === categories.skillsCompleteness) {
            return state; // No change, skip duplicate
          }
          const newEntry: ScoreHistoryEntry = {
            score: overallScore,
            timestamp: new Date().toISOString(),
            basis: 'resume-completeness-v1',
            categories,
          };
          return {
            history: {
              ...state.history,
              [resumeId]: [...current, newEntry].slice(-20),
            },
          };
        });
      },

      getHistory: (resumeId) => get().history[resumeId] ?? EMPTY_HISTORY,

      clearHistory: (resumeId) => {
        set((state) => {
          const { [resumeId]: _, ...rest } = state.history;
          return { history: rest };
        });
      },
    }),
    {
      name: 'wr-ats-score-history',
      version: 2,
      // Version 1 stored heuristic fields under ATS labels. Do not carry those
      // misleading trend points into the explicit readiness rubric.
      migrate: () => ({ history: {} }),
    }
  )
);
