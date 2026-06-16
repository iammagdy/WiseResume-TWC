import { useLocation, useOutlet } from 'react-router-dom';
import { useRef, useEffect, useState, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useBottomSheetOpen } from '@/context/BottomSheetContext';

import { AppWorkspaceLayout } from './AppWorkspaceLayout';
import { ScrollProgressBar } from './ScrollProgressBar';
import { KeyboardProvider } from '@/context/KeyboardContext';
import { ShortcutHelpSheet } from './ShortcutHelpSheet';
import { ImportJobFAB } from '@/components/jobs/ImportJobFAB';
import { ImportJobSheet } from '@/components/jobs/ImportJobSheet';
import {
  WiseWorkspaceShell,
  useWiseWorkspaceGlobalEvents,
} from '@/components/wise-workspace/WiseWorkspaceShell';

const GuestSaveBanner = lazy(() => import('./GuestSaveBanner').then((m) => ({ default: m.GuestSaveBanner })));
const OfflineBanner = lazy(() => import('./OfflineBanner').then((m) => ({ default: m.OfflineBanner })));
const SlowConnectionBanner = lazy(() => import('./SlowConnectionBanner').then((m) => ({ default: m.SlowConnectionBanner })));
import { SwipeBackWrapper } from './SwipeBackWrapper';
import { useKeyboardAwareScroll } from '@/hooks/useKeyboardAwareScroll';
import { cn } from '@/lib/utils';
import { shouldExitOnBack } from '@/lib/navigation';
import { getMobileShellLayout } from './appShellLayout';

const TAB_ROUTES = [
  '/dashboard',
  '/upload',
  '/settings',
  '/interview',
  '/editor',
  '/preview',
  '/applications',
  '/onboarding',
  '/profile',
  '/templates',
  '/resume',
  '/job',
  '/application',
  '/notifications',
  '/cover-letters',
  '/cover-letter',
  '/examples',
  '/career',
  '/resignation-letter',
  '/guides',
  '/ai-studio',
  '/portfolio',
  '/qr-code',
  '/qr-batch',
  '/qr-scan',
  '/tailor',
  '/subscription',
  '/analytics',
  '/referral',
  '/achievements',
  '/help',
  '/search',
  '/tailoring-hub',
];

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
  const isDashboardWorkspace = location.pathname === '/dashboard';
  const useGlobalSidebar = showBottomNav;
  const outletWrapperClassName = 'flex-1 flex flex-col min-h-0';
  const isEditorRoute = location.pathname.startsWith('/editor') || location.pathname.startsWith('/preview');
  const isTailorRoute = location.pathname.startsWith('/tailor');
  const workspaceImmersive = isEditorRoute || isDashboardWorkspace || isTailorRoute;
  const isRootRoute = shouldExitOnBack(location.pathname);
  const enableSwipeBack = showBottomNav && !isEditorRoute && !isRootRoute;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [importJobMobileOpen, setImportJobMobileOpen] = useState(false);
  const { isAnySheetOpen } = useBottomSheetOpen();
  const mobileShellLayout = getMobileShellLayout(location.pathname, isAnySheetOpen);

  useWiseWorkspaceGlobalEvents();

  useKeyboardAwareScroll();

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const onImportJob = () => setImportJobMobileOpen(true);
    window.addEventListener('open-import-job', onImportJob);
    return () => window.removeEventListener('open-import-job', onImportJob);
  }, []);

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

      <WiseWorkspaceShell>
        {!isEditorRoute && <Suspense fallback={null}><GuestSaveBanner /></Suspense>}
        <main
          id="main-content"
          className={cn(
            'flex-1 flex flex-col min-h-0 overflow-hidden',
            useGlobalSidebar && 'lg:pb-0',
          )}
        >
          {useGlobalSidebar ? (
            <AppWorkspaceLayout onImportJob={() => setImportJobMobileOpen(true)}>
              <div
                ref={scrollRef}
                className={cn(
                  'flex-1 flex flex-col min-h-0 w-full main-scroll-container',
                  workspaceImmersive ? 'overflow-hidden' : 'overflow-y-auto',
                )}
              >
                <ScrollProgressBar containerRef={scrollRef} />
                <AnimatePresence mode="wait" initial={false}>
                  {enableSwipeBack ? (
                    <SwipeBackWrapper key={location.pathname} className={outletWrapperClassName}>
                      <motion.div
                        className={outletWrapperClassName}
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
                      className={outletWrapperClassName}
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
            </AppWorkspaceLayout>
          ) : (
            <div
              ref={scrollRef}
              className={cn(
                'flex-1 flex flex-col min-h-0 w-full main-scroll-container overflow-y-auto',
              )}
            >
              <ScrollProgressBar containerRef={scrollRef} />
              <AnimatePresence mode="wait" initial={false}>
                {enableSwipeBack ? (
                  <SwipeBackWrapper key={location.pathname} className={outletWrapperClassName}>
                    <motion.div
                      className={outletWrapperClassName}
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
                    className={outletWrapperClassName}
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
          )}
        </main>
      </WiseWorkspaceShell>

      {!useGlobalSidebar && mobileShellLayout.showAskFab && mobileShellLayout.askFabOffsetClass && (
        <ImportJobFAB offsetClass={mobileShellLayout.askFabOffsetClass} onOpen={() => setImportJobMobileOpen(true)} />
      )}

      <ShortcutHelpSheet open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} />
      {showBottomNav && (
        <ImportJobSheet open={importJobMobileOpen} onOpenChange={setImportJobMobileOpen} />
      )}
    </div>
  );
}
