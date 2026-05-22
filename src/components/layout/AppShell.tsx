import { useLocation, useOutlet } from 'react-router-dom';
import { useRef, useEffect, useState, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { preloadLazy } from '@/lib/preloadLazy';
import { MessageCircle, X } from 'lucide-react';
import { useBottomSheetOpen } from '@/context/BottomSheetContext';

import { BottomTabBar } from './BottomTabBar';
import { DesktopNav } from './DesktopNav';
import { MobileTopBar } from './MobileTopBar';
import { ScrollProgressBar } from './ScrollProgressBar';
import { KeyboardProvider } from '@/context/KeyboardContext';
import { ShortcutHelpSheet } from './ShortcutHelpSheet';
import { ImportJobFAB } from '@/components/jobs/ImportJobFAB';
import { ImportJobSheet } from '@/components/jobs/ImportJobSheet';

const GuestSaveBanner = lazy(() => import('./GuestSaveBanner').then((m) => ({ default: m.GuestSaveBanner })));
const OfflineBanner = lazy(() => import('./OfflineBanner').then((m) => ({ default: m.OfflineBanner })));
const SlowConnectionBanner = lazy(() => import('./SlowConnectionBanner').then((m) => ({ default: m.SlowConnectionBanner })));
import { SwipeBackWrapper } from './SwipeBackWrapper';
import { useKeyboardAwareScroll } from '@/hooks/useKeyboardAwareScroll';
import { cn } from '@/lib/utils';
import { shouldExitOnBack } from '@/lib/navigation';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { getMobileShellLayout } from './appShellLayout';

const AgenticChatSheet = lazyWithRetry(() => import('@/components/editor/AgenticChatSheet').then(m => ({ default: m.AgenticChatSheet })));


const TAB_ROUTES = ['/dashboard', '/upload', '/settings', '/interview', '/editor', '/preview', '/applications', '/onboarding', '/profile', '/templates', '/resume', '/job', '/application', '/notifications', '/cover-letters', '/cover-letter', '/examples', '/career', '/resignation-letter', '/guides', '/ai-studio', '/portfolio', '/qr-code', '/qr-batch', '/qr-scan'];

/**
 * AppShell — thin provider wrapper so that AppShellInner and all its hooks
 * (including useKeyboardAwareScroll) run inside KeyboardProvider scope.
 */
export function AppShell() {
  return (
    <KeyboardProvider>
      <AppShellInner />
    </KeyboardProvider>
  );
}

function AppShellInner() {
  const location = useLocation();
  const currentOutlet = useOutlet();
  const showBottomNav = TAB_ROUTES.some(r => location.pathname.startsWith(r));
  const isEditorRoute = location.pathname.startsWith('/editor') || location.pathname.startsWith('/preview');
  const isRootRoute = shouldExitOnBack(location.pathname);
  const enableSwipeBack = showBottomNav && !isEditorRoute && !isRootRoute;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [wiseAIOpen, setWiseAIOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [importJobMobileOpen, setImportJobMobileOpen] = useState(false);
  const { isAnySheetOpen } = useBottomSheetOpen();
  const mobileShellLayout = getMobileShellLayout(location.pathname, isAnySheetOpen);

  // Now inside KeyboardProvider — dispatch reaches context correctly
  useKeyboardAwareScroll();

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== '?') return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      setShortcutHelpOpen(v => !v);
    };
    const handleCustom = () => setShortcutHelpOpen(true);
    window.addEventListener('keydown', handleKey);
    window.addEventListener('open-shortcut-help', handleCustom);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('open-shortcut-help', handleCustom);
    };
  }, []);

  return (
    <div
      data-product="wiseresume"
      className="app-theme h-[100dvh] overflow-hidden flex flex-col bg-background relative"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:m-2"
      >
        Skip to content
      </a>
      <Suspense fallback={null}><OfflineBanner /></Suspense>
      <Suspense fallback={null}><SlowConnectionBanner /></Suspense>
      {!isEditorRoute && <Suspense fallback={null}><GuestSaveBanner /></Suspense>}
      {showBottomNav && !isEditorRoute && !location.pathname.startsWith('/dashboard') && (
        <MobileTopBar />
      )}
      {showBottomNav && <DesktopNav />}
      <main
        id="main-content"
        className={cn(
          "flex-1 flex flex-col min-h-0 overflow-hidden",
          showBottomNav && !isEditorRoute && (
            mobileShellLayout.showAskFab
              ? "pb-[8.75rem] lg:pb-0"
              : "pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0"
          )
        )}
      >
        <div
          ref={scrollRef}
          className={cn(
            "flex-1 flex flex-col min-h-0 w-full main-scroll-container",
            isEditorRoute ? "overflow-hidden" : "overflow-y-auto"
          )}
        >
          <ScrollProgressBar containerRef={scrollRef} />
          <AnimatePresence mode="wait" initial={false}>
            {enableSwipeBack ? (
              <SwipeBackWrapper key={location.pathname} className="flex-1 flex flex-col min-h-0">
                <motion.div
                  className="flex-1 flex flex-col min-h-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: 'easeInOut' }}
                >
                  {currentOutlet}
                </motion.div>
              </SwipeBackWrapper>
            ) : (
              <motion.div
                key={location.pathname}
                className="flex-1 flex flex-col min-h-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeInOut' }}
              >
                {currentOutlet}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      {showBottomNav && <BottomTabBar className="lg:hidden" />}

      {showBottomNav && !isEditorRoute && mobileShellLayout.showAskFab && mobileShellLayout.askFabOffsetClass && (
        <button
          onPointerEnter={!wiseAIOpen ? preloadLazy(() => import('@/components/editor/AgenticChatSheet')) : undefined}
          onClick={() => setWiseAIOpen(v => !v)}
          className={cn(
            'fixed right-4 z-50 lg:hidden flex items-center gap-1.5 px-4 py-2.5 rounded-full shadow-soft-lg active:scale-95 transition-all touch-manipulation',
            wiseAIOpen
              ? 'bg-muted text-foreground border border-border'
              : 'bg-primary text-primary-foreground',
            mobileShellLayout.askFabOffsetClass
          )}
          aria-label={wiseAIOpen ? 'Close Wise AI' : 'Ask Wise AI'}
          aria-expanded={wiseAIOpen}
        >
          {wiseAIOpen ? (
            <X className="w-4 h-4" />
          ) : (
            <MessageCircle className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">{wiseAIOpen ? 'Close' : 'Wise AI'}</span>
        </button>
      )}

      {wiseAIOpen && (
        <Suspense fallback={null}>
          <AgenticChatSheet open={wiseAIOpen} onOpenChange={setWiseAIOpen} />
        </Suspense>
      )}

      {showBottomNav && !isEditorRoute && mobileShellLayout.showAskFab && mobileShellLayout.askFabOffsetClass && (
        <ImportJobFAB offsetClass={mobileShellLayout.askFabOffsetClass} onOpen={() => setImportJobMobileOpen(true)} />
      )}

      <ShortcutHelpSheet open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} />
      {showBottomNav && (
        <ImportJobSheet open={importJobMobileOpen} onOpenChange={setImportJobMobileOpen} />
      )}
    </div>
  );
}
