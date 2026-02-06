import { Outlet, useLocation } from 'react-router-dom';
import { BottomTabBar } from './BottomTabBar';
import { OfflineBanner } from './OfflineBanner';
import { cn } from '@/lib/utils';

// Routes that show bottom nav
const TAB_ROUTES = ['/dashboard', '/editor', '/upload', '/settings', '/interview', '/preview'];

export function AppShell() {
  const location = useLocation();
  const showBottomNav = TAB_ROUTES.some(r => location.pathname.startsWith(r));

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background">
      <OfflineBanner />
      <main className={cn("flex-1 overflow-y-auto overflow-x-hidden", showBottomNav && "pb-20")}>
        <Outlet />
      </main>
      {showBottomNav && <BottomTabBar />}
    </div>
  );
}
