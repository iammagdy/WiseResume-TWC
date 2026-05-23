import { useEffect, useState } from 'react';
import type { WiseWorkspaceMode } from '@/store/wiseWorkspaceStore';

/** Mobile nav column (icons + short labels) */
export const WISE_DRAWER_NAV_MOBILE = '5rem';
/** Mobile chat expanded */
export const WISE_DRAWER_CHAT_MOBILE = '92vw';
/** Desktop nav pane */
export const WISE_DRAWER_NAV_DESKTOP = '15rem';
/** Desktop chat pane */
export const WISE_DRAWER_CHAT_DESKTOP = 'min(26rem, 32vw)';

export function getDrawerWidthCss(mode: WiseWorkspaceMode, isLg: boolean): string {
  if (isLg) {
    return mode === 'chat' ? WISE_DRAWER_CHAT_DESKTOP : WISE_DRAWER_NAV_DESKTOP;
  }
  return mode === 'chat' ? WISE_DRAWER_CHAT_MOBILE : WISE_DRAWER_NAV_MOBILE;
}

export function useIsLgViewport(): boolean {
  const [isLg, setIsLg] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsLg(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return isLg;
}

export function syncWiseWorkspaceLayout(open: boolean, drawerWidthCss: string) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (open) {
    root.dataset.wiseWorkspaceOpen = 'true';
    root.style.setProperty('--wise-drawer-width', drawerWidthCss);
  } else {
    delete root.dataset.wiseWorkspaceOpen;
    root.style.removeProperty('--wise-drawer-width');
  }
}
