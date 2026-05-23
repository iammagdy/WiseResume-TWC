import { create } from 'zustand';

const STORAGE_KEY = 'wr-app-sidebar-collapsed';

function readCollapsed(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCollapsed(collapsed: boolean) {
  try {
    sessionStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore */
  }
}

interface AppSidebarState {
  collapsed: boolean;
  mobileOpen: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
  setMobileOpen: (open: boolean) => void;
  toggleMobileOpen: () => void;
}

export const useAppSidebarStore = create<AppSidebarState>((set, get) => ({
  collapsed: readCollapsed(),
  mobileOpen: false,
  setCollapsed: (collapsed) => {
    writeCollapsed(collapsed);
    set({ collapsed });
  },
  toggleCollapsed: () => {
    const next = !get().collapsed;
    writeCollapsed(next);
    set({ collapsed: next });
  },
  setMobileOpen: (mobileOpen) => set({ mobileOpen }),
  toggleMobileOpen: () => set((s) => ({ mobileOpen: !s.mobileOpen })),
}));

/** Reserved for route-specific sidebar hooks; collapse state persists in sessionStorage. */
export function syncSidebarForRoute(_pathname: string) {
  /* no-op: user toggle is the source of truth */
}
