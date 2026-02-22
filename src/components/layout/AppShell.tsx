import { useLocation, useOutlet } from 'react-router-dom';
import { useRef, useEffect } from 'react';

import { BottomTabBar } from './BottomTabBar';
import { DesktopNav } from './DesktopNav';
import { OfflineBanner } from './OfflineBanner';
import { ScrollProgressBar } from './ScrollProgressBar';
import { SyncConflictDialog } from '@/components/editor/SyncConflictDialog';
import { SlowConnectionBanner } from './SlowConnectionBanner';
import { SwipeBackWrapper } from './SwipeBackWrapper';
import { useKeyboardAwareScroll } from '@/hooks/useKeyboardAwareScroll';
import { cn } from '@/lib/utils';
import { getPageTitle } from '@/lib/pageTitles';
import { shouldExitOnBack } from '@/lib/navigation';


// Routes that show bottom nav
const TAB_ROUTES = ['/dashboard', '/upload', '/settings', '/interview', '/editor', '/preview', '/applications', '/onboarding', '/profile', '/templates', '/resume', '/job', '/application', '/notifications', '/cover-letters', '/cover-letter', '/examples', '/career', '/resignation-letter', '/guides', '/ai-studio', '/portfolio'];

export function AppShell() {
  const location = useLocation();
  const currentOutlet = useOutlet();
  const showBottomNav = TAB_ROUTES.some(r => location.pathname.startsWith(r));
  const isEditorRoute = location.pathname.startsWith('/editor');
  const isRootRoute = shouldExitOnBack(location.pathname);
  const enableSwipeBack = showBottomNav && !isEditorRoute && !isRootRoute;
  const scrollRef = useRef<HTMLDivElement>(null);
  

  // Global keyboard awareness
  useKeyboardAwareScroll();

  // Scroll to top on route change
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col bg-background relative">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:m-2"
      >
        Skip to content
      </a>
      <OfflineBanner />
      <SlowConnectionBanner />
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
          showBottomNav && "pb-20 lg:pb-0"
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
      <SyncConflictDialog />
    </div>
  );
}

