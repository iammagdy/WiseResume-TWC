import { lazy, memo, Suspense } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const DashboardUploadWidget = lazy(() =>
  import('@/components/dashboard/DashboardUploadWidget').then((m) => ({
    default: m.DashboardUploadWidget,
  })),
);

interface DashboardTopCommandBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onImportJob: () => void;
  onOpenWiseAI: () => void;
  className?: string;
}

/** Page-level resume search; global shell nav (DesktopNav / MobileTopBar) handles the rest. */
export const DashboardTopCommandBar = memo(function DashboardTopCommandBar({
  searchQuery,
  onSearchChange,
  onImportJob,
  onOpenWiseAI,
  className,
}: DashboardTopCommandBarProps) {
  return (
    <div className={cn('dashboard-top-command flex flex-col gap-2 px-3 sm:px-5 py-3 lg:px-6', className)}>
      <div className="dashboard-top-command__search relative flex-1 min-w-0 w-full max-w-3xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search resumes, keywords, tools..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-11 text-sm rounded-xl border-border/50 bg-card/70 shadow-none focus-visible:ring-1 focus-visible:ring-primary/25"
          aria-label="Search workspace"
        />
        <kbd className="hidden sm:inline-flex absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/80 border border-border/50 rounded px-1.5 py-0.5">
          ⌘ K
        </kbd>
      </div>

      {/* Mobile: upload widget only; Import and Wise AI are in AppWorkspaceTopBar */}
      <div className="flex items-center gap-1.5 shrink-0 lg:hidden">
        <Suspense
          fallback={
            <div className="h-9 w-[7.5rem] rounded-xl animate-pulse bg-muted/40" aria-hidden />
          }
        >
          <DashboardUploadWidget variant="toolbar" />
        </Suspense>
      </div>
    </div>
  );
});
