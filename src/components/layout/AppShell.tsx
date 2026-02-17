import { useLocation, useOutlet } from 'react-router-dom';
import { useRef } from 'react';
import { BottomTabBar } from './BottomTabBar';
import { OfflineBanner } from './OfflineBanner';
import { ScrollProgressBar } from './ScrollProgressBar';
import { SyncConflictDialog } from '@/components/editor/SyncConflictDialog';
import { cn } from '@/lib/utils';


// Routes that show bottom nav
const TAB_ROUTES = ['/dashboard', '/upload', '/settings', '/interview', '/editor', '/preview', '/applications', '/onboarding', '/profile', '/templates', '/resume', '/job', '/application', '/notifications', '/cover-letters', '/cover-letter', '/examples', '/career', '/resignation-letter', '/guides', '/ai-studio'];

export function AppShell() {
  const location = useLocation();
  const currentOutlet = useOutlet();
  const scrollRef = useRef<HTMLDivElement>(null);
  const showBottomNav = TAB_ROUTES.some(r => location.pathname.startsWith(r));

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col bg-background relative">
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:m-2"
      >
        Skip to content
      </a>
      <OfflineBanner />
      <ScrollProgressBar containerRef={scrollRef} />
      <main
        id="main-content"
        className={cn("flex-1 flex flex-col min-h-0 overflow-hidden", showBottomNav && "pb-20")}
      >
        <div
          ref={scrollRef}
          className="flex-1 flex flex-col min-h-0 w-full animate-fade-in overflow-y-auto"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
          {currentOutlet}
        </div>
      </main>
      {showBottomNav && <BottomTabBar />}
      <SyncConflictDialog />
    </div>
  );
}
