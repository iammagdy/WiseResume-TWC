import { useLocation, useOutlet } from 'react-router-dom';
import { BottomTabBar } from './BottomTabBar';
import { OfflineBanner } from './OfflineBanner';
import { AIHealthBadge } from '@/components/ai/AIHealthBadge';
import { cn } from '@/lib/utils';


// Routes that show bottom nav
const TAB_ROUTES = ['/dashboard', '/upload', '/settings', '/interview', '/editor', '/preview', '/applications', '/onboarding', '/profile', '/templates', '/resume', '/job', '/application', '/notifications', '/cover-letters', '/cover-letter', '/examples', '/career', '/resignation-letter', '/guides', '/ai-studio'];

// Routes with AI features that show the health badge
const AI_ROUTES = ['/editor', '/ai-studio', '/interview', '/cover-letter', '/career', '/dashboard', '/resignation-letter'];

export function AppShell() {
  const location = useLocation();
  const currentOutlet = useOutlet();
  const showBottomNav = TAB_ROUTES.some(r => location.pathname.startsWith(r));
  const showAIHealth = AI_ROUTES.some(r => location.pathname.startsWith(r));

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
      {showAIHealth && (
        <div className="absolute top-2 right-3 z-30 pointer-events-none">
          <div className="pointer-events-auto">
            <AIHealthBadge />
          </div>
        </div>
      )}
      <main
        id="main-content"
        className={cn("flex-1 flex flex-col min-h-0 overflow-hidden", showBottomNav && "pb-20")}
      >
        <div
          className="flex-1 flex flex-col min-h-0 w-full animate-fade-in overflow-y-auto"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
          {currentOutlet}
        </div>
      </main>
      {showBottomNav && <BottomTabBar />}
    </div>
  );
}
