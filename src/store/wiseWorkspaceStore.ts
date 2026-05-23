import { create } from 'zustand';

export type WiseWorkspaceMode = 'nav' | 'chat';

interface WiseWorkspaceState {
  open: boolean;
  mode: WiseWorkspaceMode;
  initialMessage: string | null;
  setOpen: (open: boolean) => void;
  setMode: (mode: WiseWorkspaceMode) => void;
  toggle: () => void;
  openNav: () => void;
  openChat: (initialMessage?: string) => void;
  /** Open chat panel, or close it if chat is already open (top-bar toggle). */
  toggleChat: (initialMessage?: string) => void;
  close: () => void;
}

export const useWiseWorkspaceStore = create<WiseWorkspaceState>((set, get) => ({
  open: false,
  mode: 'nav',
  initialMessage: null,

  setOpen: (open) => set({ open }),

  setMode: (mode) => set({ mode }),

  toggle: () => {
    const { open } = get();
    if (open) {
      set({ open: false, mode: 'nav', initialMessage: null });
    } else {
      set({ open: true, mode: 'nav' });
    }
  },

  openNav: () => set({ open: true, mode: 'nav', initialMessage: null }),

  openChat: (initialMessage) =>
    set({
      open: true,
      mode: 'chat',
      initialMessage: initialMessage?.trim() || null,
    }),

  toggleChat: (initialMessage) => {
    const { open, mode } = get();
    if (open && mode === 'chat') {
      set({ open: false, mode: 'nav', initialMessage: null });
      return;
    }
    set({
      open: true,
      mode: 'chat',
      initialMessage: initialMessage?.trim() || null,
    });
  },

  close: () => set({ open: false, mode: 'nav', initialMessage: null }),
}));

export function openWiseWorkspace(mode: WiseWorkspaceMode = 'nav', initialMessage?: string) {
  if (mode === 'chat') {
    useWiseWorkspaceStore.getState().openChat(initialMessage);
  } else {
    useWiseWorkspaceStore.getState().openNav();
  }
}
