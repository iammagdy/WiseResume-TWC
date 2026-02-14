import { create } from 'zustand';
import type { ProofreadIssue, WritingScore } from '@/types/proofread';

interface ProofreadState {
  issues: ProofreadIssue[];
  score: WritingScore | null;
  ignoredIds: string[];
  isChecking: boolean;

  setIssues: (issues: ProofreadIssue[]) => void;
  setScore: (score: WritingScore | null) => void;
  removeIssue: (id: string) => void;
  ignoreIssue: (id: string) => void;
  clear: () => void;
  setIsChecking: (v: boolean) => void;
}

export const useProofreadStore = create<ProofreadState>()((set, get) => ({
  issues: [],
  score: null,
  ignoredIds: [],
  isChecking: false,

  setIssues: (issues) => set({ issues }),
  setScore: (score) => set({ score }),
  removeIssue: (id) => set((s) => ({ issues: s.issues.filter((i) => i.id !== id) })),
  ignoreIssue: (id) => set((s) => ({ ignoredIds: [...s.ignoredIds, id] })),
  clear: () => set({ issues: [], score: null, ignoredIds: [], isChecking: false }),
  setIsChecking: (v) => set({ isChecking: v }),
}));

// Derived selectors
export const selectActiveIssues = (s: ProofreadState) =>
  s.issues.filter((i) => !s.ignoredIds.includes(i.id));

export const selectIssueCount = (s: ProofreadState) =>
  s.issues.filter((i) => !s.ignoredIds.includes(i.id)).length;

export const selectErrorCount = (s: ProofreadState) =>
  s.issues.filter((i) => !s.ignoredIds.includes(i.id) && (i.type === 'spelling' || i.type === 'grammar')).length;
