import { useLocation, useOutlet } from 'react-router-dom';
import { BottomTabBar } from './BottomTabBar';
import { OfflineBanner } from './OfflineBanner';
import { cn } from '@/lib/utils';


// Routes that show bottom nav
const TAB_ROUTES = ['/dashboard', '/upload', '/settings', '/interview', '/auth', '/editor', '/preview', '/applications', '/onboarding', '/profile', '/templates', '/resume', '/job', '/application', '/notifications', '/cover-letter', '/cover-letters', '/examples', '/career', '/resignation-letter', '/guides'];

export function AppShell() {
  const location = useLocation();
  const currentOutlet = useOutlet();
  const showBottomNav = TAB_ROUTES.some(r => location.pathname.startsWith(r));

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background">
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:m-2"
      >
        Skip to content
      </a>
      <OfflineBanner />
      <main
        id="main-content"
        className={cn("flex-1 flex flex-col min-h-0 overflow-hidden", showBottomNav && "pb-20")}
      >
        <div
          className="flex-1 flex flex-col min-h-0 w-full animate-fade-in"
        >
          {currentOutlet}
        </div>
      </main>
      {showBottomNav && <BottomTabBar />}
    </div>
  );
}
