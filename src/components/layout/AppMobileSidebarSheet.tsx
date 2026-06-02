import { Menu } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AppWorkspaceSidebar } from '@/components/layout/AppWorkspaceSidebar';
import { useAppSidebarStore } from '@/store/appSidebarStore';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import type { PlanName } from '@/hooks/usePlan';

interface AppMobileSidebarSheetProps {
  userName?: string | null;
  userEmail?: string | null;
  avatarUrl?: string | null;
  plan?: PlanName;
  profileCompletion?: number;
  onManageAccount: () => void;
  onSettings: () => void;
  onAdminPanel?: () => void;
  onBilling: () => void;
  onSignOut: () => void | Promise<void>;
  onHelp?: () => void;
  onUpgrade?: () => void;
}

export function AppMobileSidebarSheet(props: AppMobileSidebarSheetProps) {
  const mobileOpen = useAppSidebarStore((s) => s.mobileOpen);
  const setMobileOpen = useAppSidebarStore((s) => s.setMobileOpen);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          haptics.light();
          setMobileOpen(true);
        }}
        className={cn(
          'app-sidebar-mobile-trigger lg:hidden fixed z-[48] touch-manipulation',
          'flex items-center justify-center w-12 h-12 rounded-2xl',
          'bg-card/95 border border-border/80 shadow-soft-md text-foreground',
          'active:scale-95 hover:bg-muted/50',
        )}
        style={{
          left: 'max(0.75rem, env(safe-area-inset-left))',
          bottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
        }}
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" aria-hidden />
      </button>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          hideCloseButton
          className="overflow-hidden !w-[min(var(--app-sidebar-width),86vw)] !max-w-[min(var(--app-sidebar-width),86vw)] !rounded-r-none border-r border-border/50 bg-background p-0 [&>div:first-child]:h-full [&>div:first-child]:min-h-0"
        >
          <div className="h-full flex flex-col min-h-0">
            <AppWorkspaceSidebar
              {...props}
              forceVisible
              className="h-full w-full !max-w-none"
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
