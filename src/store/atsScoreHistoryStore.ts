import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ScoreHistoryEntry {
  score: number;
  timestamp: string;
  categories: {
    completeness: number;
    atsReadiness: number;
    impactLanguage: number;
    formatting: number;
  };
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
          const newEntry: ScoreHistoryEntry = {
            score: overallScore,
            timestamp: new Date().toISOString(),
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

      getHistory: (resumeId) => get().history[resumeId] || [],

      clearHistory: (resumeId) => {
        set((state) => {
          const { [resumeId]: _, ...rest } = state.history;
          return { history: rest };
        });
      },
    }),
    { name: 'wr-ats-score-history' }
  )
);
