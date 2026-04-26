import { useLocation, useOutlet } from 'react-router-dom';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { useRef, useEffect, useState, lazy, Suspense } from 'react';
import { preloadLazy } from '@/lib/preloadLazy';
import { MessageCircle, X, Sun, Moon, AlertTriangle, RefreshCw } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { useBottomSheetOpen } from '@/context/BottomSheetContext';

import { BottomTabBar } from './BottomTabBar';
import { DesktopNav } from './DesktopNav';
import { ScrollProgressBar } from './ScrollProgressBar';
import { KeyboardProvider } from '@/context/KeyboardContext';

const GuestSaveBanner = lazy(() => import('./GuestSaveBanner').then((m) => ({ default: m.GuestSaveBanner })));
const OfflineBanner = lazy(() => import('./OfflineBanner').then((m) => ({ default: m.OfflineBanner })));
const SlowConnectionBanner = lazy(() => import('./SlowConnectionBanner').then((m) => ({ default: m.SlowConnectionBanner })));
import { SwipeBackWrapper } from './SwipeBackWrapper';
import { useKeyboardAwareScroll } from '@/hooks/useKeyboardAwareScroll';
import { cn } from '@/lib/utils';
import { getPageTitle } from '@/lib/pageTitles';
import { shouldExitOnBack } from '@/lib/navigation';
import { getLastError, clearLastError, refreshTokenIfNeeded } from '@/lib/supabaseBridge';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

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
  const { isDark, toggleTheme } = useTheme();
  const { isAuthenticated, supabaseSettled, supabaseReady, signOut } = useAuth();
  const showBottomNav = TAB_ROUTES.some(r => location.pathname.startsWith(r));
  const isEditorRoute = location.pathname.startsWith('/editor') || location.pathname.startsWith('/preview');
  const isPortfolioEditorRoute = location.pathname === '/portfolio';
  const isRootRoute = shouldExitOnBack(location.pathname);
  const enableSwipeBack = showBottomNav && !isEditorRoute && !isRootRoute;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [wiseAIOpen, setWiseAIOpen] = useState(false);
  const [bridgeError, setBridgeError] = useState<{ type?: string; code: string; message: string } | null>(null);
  const { isAnySheetOpen } = useBottomSheetOpen();
  const [retrying, setRetrying] = useState(false);

  // Show config error banner when Kinde login succeeded but the bridge exchange failed.
  // This typically means the token-exchange Supabase edge function is not configured
  // (e.g. missing KINDE_DOMAIN secret on Supabase) — a common state in new environments.
  // ACCOUNT_COLLISION (AUTH_AUDIT C2) is handled by its own dedicated banner below
  // and must NOT also render the generic config banner — doing so would re-introduce
  // the useless retry CTA the collision path is designed to avoid.
  const showBridgeConfigError =
    isAuthenticated &&
    supabaseSettled &&
    !supabaseReady &&
    bridgeError?.type !== 'ACCOUNT_COLLISION';

  async function handleBridgeRetry() {
    setRetrying(true);
    try {
      await refreshTokenIfNeeded();
    } finally {
      setRetrying(false);
    }
  }

  useEffect(() => {
    const err = getLastError();
    if (err) {
      setBridgeError(err);
    }
  }, [location.pathname, supabaseSettled]);

  // Now inside KeyboardProvider — dispatch reaches context correctly
  useKeyboardAwareScroll();

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="app-theme h-[100dvh] overflow-hidden flex flex-col bg-background relative">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:m-2"
      >
        Skip to content
      </a>
      <Suspense fallback={null}><OfflineBanner /></Suspense>
      <Suspense fallback={null}><SlowConnectionBanner /></Suspense>
      {showBridgeConfigError && (
        <div className="flex items-center justify-between gap-2 px-4 py-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm border-b border-amber-500/20">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {bridgeError?.code === 'SHADOW_USER_UNAVAILABLE' ? (
              <span className="truncate">Some features are limited — please try signing out and back in.</span>
            ) : bridgeError?.code === 'SIGNING_SECRET_MISSING' ? (
              <span className="truncate">Server is missing required configuration. Contact support.</span>
            ) : bridgeError?.code === 'INVALID_KINDE_TOKEN' ? (
              <span className="truncate">Your session could not be verified. Please sign out and sign back in.</span>
            ) : (
              <span className="truncate">AI features require server configuration — contact support.</span>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-1">
            {bridgeError?.code === 'SHADOW_USER_UNAVAILABLE' ? (
              <button
                onClick={signOut}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium hover:bg-amber-500/10 transition-colors"
                aria-label="Sign out"
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={handleBridgeRetry}
                disabled={retrying}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium hover:bg-amber-500/10 transition-colors disabled:opacity-50"
                aria-label="Retry connection"
              >
                <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
                Retry
              </button>
            )}
          </div>
        </div>
      )}
      {bridgeError && bridgeError.type === 'ACCOUNT_COLLISION' && (
        <div className="flex items-center justify-between gap-2 px-4 py-2 bg-destructive/10 text-destructive text-sm border-b border-destructive/20">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">
              An existing account already uses this email. Please contact support to merge your accounts.
            </span>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <a
              href="mailto:support@thewise.cloud?subject=Account%20merge%20request"
              className="px-2 py-0.5 rounded text-xs font-medium underline underline-offset-2 hover:bg-destructive/10 transition-colors"
            >
              Contact support
            </a>
            <button
              onClick={signOut}
              className="px-2 py-0.5 rounded text-xs font-medium hover:bg-destructive/10 transition-colors"
              aria-label="Sign out"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
      {bridgeError && bridgeError.type === 'AUTH_REJECTION' && (
        <div className="flex items-center justify-between gap-2 px-4 py-2 bg-destructive/10 text-destructive text-sm border-b border-destructive/20">
          <span>
            {bridgeError.code === 'INVALID_KINDE_TOKEN'
              ? 'Your session expired. Please sign in again.'
              : 'We couldn\'t connect to your data. Please try again in a moment.'}
          </span>
          <button
            onClick={() => { clearLastError(); setBridgeError(null); }}
            className="shrink-0 p-0.5 rounded hover:bg-destructive/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {!isEditorRoute && <Suspense fallback={null}><GuestSaveBanner /></Suspense>}
      {showBottomNav && !isEditorRoute && !location.pathname.startsWith('/dashboard') && (
        <header className="lg:hidden relative h-12 border-b border-border shrink-0">
          <GlassSurface className="absolute inset-0" />
          <div className="relative z-[1] flex items-center px-edge pt-safe h-full">
            <span className="text-sm font-bold text-primary tracking-tight">WiseResume</span>
            {(() => {
              const pageTitle = getPageTitle(location.pathname);
              return pageTitle && pageTitle !== 'Home' ? (
                <span className="ml-2 min-w-0 truncate text-xs text-muted-foreground font-medium">
                  / {pageTitle}
                </span>
              ) : null;
            })()}
            <div className="ml-auto">
              <button
                onClick={toggleTheme}
                className="relative flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors active:scale-95 touch-manipulation"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <Sun
                  className={`w-4 h-4 absolute transition-all duration-200 ${isDark ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90'}`}
                />
                <Moon
                  className={`w-4 h-4 absolute transition-all duration-200 ${isDark ? 'opacity-0 -rotate-90' : 'opacity-100 rotate-0'}`}
                />
              </button>
            </div>
          </div>
        </header>
      )}
      {showBottomNav && <DesktopNav />}
      <main
        id="main-content"
        className={cn(
          "flex-1 flex flex-col min-h-0 overflow-hidden",
          showBottomNav && !isEditorRoute && "pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0"
        )}
      >
        <div
          ref={scrollRef}
          className={cn(
            "flex-1 flex flex-col min-h-0 w-full",
            isEditorRoute ? "overflow-hidden" : "overflow-y-auto"
          )}
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
          <ScrollProgressBar containerRef={scrollRef} />
          {enableSwipeBack ? (
            <SwipeBackWrapper className="flex-1 flex flex-col min-h-0">
              <div key={location.pathname} className="flex-1 flex flex-col min-h-0 animate-fade-in">
                {currentOutlet}
              </div>
            </SwipeBackWrapper>
          ) : (
            <div key={location.pathname} className="flex-1 flex flex-col min-h-0 animate-fade-in">
              {currentOutlet}
            </div>
          )}
        </div>
      </main>
      {showBottomNav && <BottomTabBar className="lg:hidden" />}

      {showBottomNav && !isEditorRoute && (
        <button
          onPointerEnter={preloadLazy(() => import('@/components/editor/AgenticChatSheet'))}
          onClick={() => setWiseAIOpen(true)}
          className={cn(
            'fixed right-4 z-50 lg:hidden flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-primary-foreground shadow-soft-lg active:scale-95 transition-all touch-manipulation',
            isPortfolioEditorRoute
              ? 'bottom-[calc(9rem+env(safe-area-inset-bottom))]'
              : 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))]',
            isAnySheetOpen && 'pointer-events-none opacity-0'
          )}
          aria-label="Ask Wise AI"
          aria-hidden={isAnySheetOpen}
          tabIndex={isAnySheetOpen ? -1 : undefined}
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Ask</span>
        </button>
      )}

      {wiseAIOpen && (
        <Suspense fallback={null}>
          <AgenticChatSheet open={wiseAIOpen} onOpenChange={setWiseAIOpen} />
        </Suspense>
      )}
    </div>
  );
}
