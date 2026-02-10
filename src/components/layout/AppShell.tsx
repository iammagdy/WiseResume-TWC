import { Outlet, useLocation, useOutlet } from 'react-router-dom';
import { BottomTabBar } from './BottomTabBar';
import { OfflineBanner } from './OfflineBanner';
import { GuestSaveBanner } from './GuestSaveBanner';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

// Routes that show bottom nav
const TAB_ROUTES = ['/dashboard', '/editor', '/upload', '/settings', '/interview', '/preview'];

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
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex-1 flex flex-col min-h-0 w-full h-full"
          >
            {currentOutlet}
          </motion.div>
        </AnimatePresence>
      </main>
      {showBottomNav && <BottomTabBar />}
    </div>
  );
}
