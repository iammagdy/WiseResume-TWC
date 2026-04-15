import { create } from 'zustand';

interface ChatTriggerState {
  pendingPrompt: string | null;
  setPendingPrompt: (prompt: string) => void;
  clearPendingPrompt: () => void;
}

export const useChatTriggerStore = create<ChatTriggerState>((set) => ({
  pendingPrompt: null,
  setPendingPrompt: (prompt) => set({ pendingPrompt: prompt }),
  clearPendingPrompt: () => set({ pendingPrompt: null }),
}));
