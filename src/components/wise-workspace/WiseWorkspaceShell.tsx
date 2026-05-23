import { useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useWiseWorkspaceStore } from '@/store/wiseWorkspaceStore';
import { WiseWorkspaceDrawer } from '@/components/wise-workspace/WiseWorkspaceDrawer';
import {
  getDrawerWidthCss,
  syncWiseWorkspaceLayout,
  useIsLgViewport,
} from '@/lib/wiseWorkspace/drawerLayout';

interface WiseWorkspaceShellProps {
  children: ReactNode;
}

export function WiseWorkspaceShell({ children }: WiseWorkspaceShellProps) {
  const open = useWiseWorkspaceStore((s) => s.open);
  const mode = useWiseWorkspaceStore((s) => s.mode);
  const isLg = useIsLgViewport();
  const drawerWidth = getDrawerWidthCss(mode, isLg);

  useEffect(() => {
    syncWiseWorkspaceLayout(open, drawerWidth);
    return () => syncWiseWorkspaceLayout(false, drawerWidth);
  }, [open, drawerWidth]);

  return (
    <div className="wise-workspace-shell relative flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden isolate">
      <div
        className={cn(
          'app-shell-stage flex flex-1 flex-col min-h-0 min-w-0 w-full',
          open && 'app-shell-stage--workspace-open',
        )}
      >
        {children}
      </div>
      <WiseWorkspaceDrawer />
    </div>
  );
}

/** Sync global open-wise-ai events to workspace store */
export function useWiseWorkspaceGlobalEvents() {
  useEffect(() => {
    const onOpen = () => useWiseWorkspaceStore.getState().openChat();
    const onOpenWorkspace = () => useWiseWorkspaceStore.getState().openChat();
    window.addEventListener('open-wise-ai', onOpen);
    window.addEventListener('open-wise-workspace', onOpenWorkspace);
    return () => {
      window.removeEventListener('open-wise-ai', onOpen);
      window.removeEventListener('open-wise-workspace', onOpenWorkspace);
    };
  }, []);
}
