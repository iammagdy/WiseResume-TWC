import { useLocation, useOutlet } from 'react-router-dom';
import { useRef, useEffect, useState, lazy, Suspense } from 'react';
import { Sparkles, X } from 'lucide-react';

import { BottomTabBar } from './BottomTabBar';
import { DesktopNav } from './DesktopNav';
import { GuestSaveBanner } from './GuestSaveBanner';
import { OfflineBanner } from './OfflineBanner';
import { ScrollProgressBar } from './ScrollProgressBar';

import { SlowConnectionBanner } from './SlowConnectionBanner';
import { SwipeBackWrapper } from './SwipeBackWrapper';
import { useKeyboardAwareScroll } from '@/hooks/useKeyboardAwareScroll';
import { cn } from '@/lib/utils';
import { getPageTitle } from '@/lib/pageTitles';
import { shouldExitOnBack } from '@/lib/navigation';
import { getLastError, clearLastError } from '@/lib/supabaseBridge';

const AgenticChatSheet = lazy(() => import('@/components/editor/AgenticChatSheet').then(m => ({ default: m.AgenticChatSheet })));


// Routes that show bottom nav
const TAB_ROUTES = ['/dashboard', '/upload', '/settings', '/interview', '/editor', '/preview', '/applications', '/onboarding', '/profile', '/templates', '/resume', '/job', '/application', '/notifications', '/cover-letters', '/cover-letter', '/examples', '/career', '/resignation-letter', '/guides', '/ai-studio', '/portfolio', '/qr-code', '/qr-batch', '/qr-scan'];

export function AppShell() {
  const location = useLocation();
  const currentOutlet = useOutlet();
  const showBottomNav = TAB_ROUTES.some(r => location.pathname.startsWith(r));
  const isEditorRoute = location.pathname.startsWith('/editor');
  const isRootRoute = shouldExitOnBack(location.pathname);
  const enableSwipeBack = showBottomNav && !isEditorRoute && !isRootRoute;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [wiseAIOpen, setWiseAIOpen] = useState(false);
  const [bridgeError, setBridgeError] = useState<{ code: string; message: string } | null>(null);

  // Check for bridge errors after route changes
  useEffect(() => {
    const err = getLastError();
    if (err) {
      setBridgeError(err);
    }
  }, [location.pathname]);

  // Global keyboard awareness
  useKeyboardAwareScroll();

  // Scroll to top on route change
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col bg-transparent relative">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:m-2"
      >
        Skip to content
      </a>
      <OfflineBanner />
      <SlowConnectionBanner />
      {bridgeError && (
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
      {!isEditorRoute && <GuestSaveBanner />}
      {showBottomNav && !isEditorRoute && (
        <header className="lg:hidden h-10 flex items-center px-edge pt-safe glass-surface border-b border-border/30 shrink-0">
          <span className="text-sm font-bold text-primary">WiseResume</span>
          {(() => {
            const pageTitle = getPageTitle(location.pathname);
            return pageTitle && pageTitle !== 'Home' ? (
              <span className="ml-2 text-xs text-muted-foreground font-medium">
                / {pageTitle}
              </span>
            ) : null;
          })()}
        </header>
      )}
      {showBottomNav && <DesktopNav />}
      <main
        id="main-content"
        className={cn(
          "flex-1 flex flex-col min-h-0 overflow-hidden",
          showBottomNav && !isEditorRoute && "pb-20 lg:pb-0"
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

      {/* Global floating Ask Wise AI button — mobile only, hidden on editor (has its own) */}
      {showBottomNav && !isEditorRoute && (
        <button
          onClick={() => setWiseAIOpen(true)}
          className="fixed bottom-24 right-4 z-40 lg:hidden flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 active:scale-95 transition-transform touch-manipulation"
          aria-label="Ask Wise AI"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Ask</span>
        </button>
      )}

      {/* Global Wise AI Chat Sheet */}
      {wiseAIOpen && (
        <Suspense fallback={null}>
          <AgenticChatSheet open={wiseAIOpen} onOpenChange={setWiseAIOpen} />
        </Suspense>
      )}
    </div>
  );
}

