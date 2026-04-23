import { create } from 'zustand';

interface AIEnhancingState {
  count: number;
  increment: () => void;
  decrement: () => void;
}

export const useAIEnhancingStore = create<AIEnhancingState>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
  decrement: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
}));
