import { memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DashboardWorkspaceLayoutProps {
  topBar: ReactNode;
  children: ReactNode;
  intelligence: ReactNode;
  className?: string;
}

/** Dashboard content grid (search bar + main + intelligence). Global nav lives in AppShell. */
export const DashboardWorkspaceLayout = memo(function DashboardWorkspaceLayout({
  topBar,
  children,
  intelligence,
  className,
}: DashboardWorkspaceLayoutProps) {
  return (
    <div className={cn('dashboard-workspace-os w-full flex-1 flex flex-col min-h-0', className)}>
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        <div className="dashboard-workspace-top shrink-0 border-b border-border/30">{topBar}</div>

        <div className="dashboard-workspace-body flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden xl:flex-row xl:items-stretch">
          <div className="dashboard-workspace-main flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-3 py-2.5 sm:px-5 lg:px-6 lg:py-3">
            {children}
          </div>

          <div className="dashboard-workspace-intelligence w-full shrink-0 overflow-y-auto overscroll-y-contain px-3 pb-4 pt-1 sm:px-5 xl:max-h-full xl:w-[21rem] xl:shrink-0 xl:self-stretch xl:border-l xl:border-border/30 xl:px-4 xl:py-3">
            {intelligence}
          </div>
        </div>
      </div>
    </div>
  );
});
