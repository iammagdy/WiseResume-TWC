import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { X, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { AITrustBadge } from '@/components/ui/AITrustBadge';
import { useWiseWorkspaceStore } from '@/store/wiseWorkspaceStore';
import { resolvePageContext } from '@/lib/wiseWorkspace/pageContext';
import { WiseWorkspaceNavPane } from '@/components/wise-workspace/WiseWorkspaceNavPane';
import { useIsLgViewport } from '@/lib/wiseWorkspace/drawerLayout';

const WiseWorkspaceChat = lazyWithRetry(() =>
  import('@/components/editor/AgenticChatSheet').then((m) => ({ default: m.WiseWorkspaceChat })),
);

export function WiseWorkspaceDrawer() {
  const open = useWiseWorkspaceStore((s) => s.open);
  const mode = useWiseWorkspaceStore((s) => s.mode);
  const initialMessage = useWiseWorkspaceStore((s) => s.initialMessage);
  const setMode = useWiseWorkspaceStore((s) => s.setMode);
  const close = useWiseWorkspaceStore((s) => s.close);
  const location = useLocation();
  const page = resolvePageContext(location.pathname);
  const isLg = useIsLgViewport();
  const compactNav = !isLg && mode === 'nav';

  if (!open) return null;

  return (
    <aside
      id="wise-workspace-drawer"
      role="complementary"
      aria-label="Wise Workspace"
      className={cn(
        'wise-workspace-drawer fixed top-0 right-0 z-[54] flex flex-col h-[100dvh] overflow-hidden',
        'border-l border-border/50',
        mode === 'chat' && !isLg && 'wise-workspace-drawer--chat-mobile',
        mode === 'nav' && !isLg && 'wise-workspace-drawer--nav-mobile',
        isLg && mode === 'chat' && 'wise-workspace-drawer--chat-desktop',
        isLg && mode === 'nav' && 'wise-workspace-drawer--nav-desktop',
      )}
    >
      <header className="wise-workspace-drawer__header shrink-0 px-3 py-3 border-b border-border/40">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {mode === 'chat' && (
              <button
                type="button"
                className="mb-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground touch-manipulation"
                onClick={() => {
                  haptics.light();
                  setMode('nav');
                }}
              >
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden />
                Workspace
              </button>
            )}
            <h2 className="text-sm font-semibold text-foreground tracking-tight">Wise Workspace</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              You&apos;re on: {page.pageTitle}
            </p>
          </div>
          <button
            type="button"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 shrink-0 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={() => {
              haptics.light();
              close();
            }}
            aria-label="Close Wise Workspace"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {mode === 'nav' && (
          <div className="mt-2">
            <AITrustBadge />
          </div>
        )}
      </header>

      {mode === 'nav' ? (
        <WiseWorkspaceNavPane compact={compactNav} />
      ) : (
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Loading assistant…
            </div>
          }
        >
          <WiseWorkspaceChat
            embedded
            initialMessage={initialMessage ?? undefined}
            onClose={close}
            onBackToNav={() => setMode('nav')}
          />
        </Suspense>
      )}
    </aside>
  );
}
