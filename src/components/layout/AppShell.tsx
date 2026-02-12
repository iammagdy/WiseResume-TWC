import { Outlet, useLocation, useOutlet } from 'react-router-dom';
import { BottomTabBar } from './BottomTabBar';
import { OfflineBanner } from './OfflineBanner';
import { GuestSaveBanner } from './GuestSaveBanner';
import { cn } from '@/lib/utils';


// Routes that show bottom nav
const TAB_ROUTES = ['/dashboard', '/upload', '/settings', '/interview', '/auth', '/editor', '/preview'];

// Routes that show guest save banner
const GUEST_BANNER_ROUTES = ['/editor', '/preview'];

export function AppShell() {
  const location = useLocation();
  const currentOutlet = useOutlet();
  const showBottomNav = TAB_ROUTES.some(r => location.pathname.startsWith(r));
  const showGuestBanner = GUEST_BANNER_ROUTES.some(r => location.pathname.startsWith(r));

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background">
      <OfflineBanner />
      {showGuestBanner && <GuestSaveBanner />}
      <main className={cn("flex-1 flex flex-col min-h-0 overflow-hidden", showBottomNav && "pb-20")}>
        <div className="flex-1 flex flex-col min-h-0 w-full">
          {currentOutlet}
        </div>
      </main>
      {showBottomNav && <BottomTabBar />}
    </div>
  );
}
