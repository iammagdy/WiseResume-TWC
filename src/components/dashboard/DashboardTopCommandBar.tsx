import { lazy, memo, Suspense } from 'react';
import { Search } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { openWorkspaceSearch } from '@/lib/workspaceSearchEvents';
import { cn } from '@/lib/utils';

const DashboardUploadWidget = lazy(() =>
  import('@/components/dashboard/DashboardUploadWidget').then((m) => ({
    default: m.DashboardUploadWidget,
  })),
);

interface DashboardTopCommandBarProps {
  onImportJob: () => void;
  onOpenWiseAI: () => void;
  className?: string;
}

/** Opens the global workspace search dialog (Cmd+K). */
export const DashboardTopCommandBar = memo(function DashboardTopCommandBar({
  onImportJob,
  onOpenWiseAI,
  className,
}: DashboardTopCommandBarProps) {
  const openSearch = () => {
    haptics.selection();
    openWorkspaceSearch();
  };

  return (
    <div className={cn('dashboard-top-command flex flex-col gap-2 px-3 sm:px-5 py-3 lg:px-6', className)}>
      <div className="dashboard-top-command__search relative flex-1 min-w-0 w-full max-w-3xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
        <button
          type="button"
          onClick={openSearch}
          className={cn(
            'flex min-h-[44px] w-full items-center border px-3 py-2 text-left',
            'pl-9 h-11 text-sm rounded-xl border-border/50 bg-card/70 shadow-none',
            'text-muted-foreground/80 hover:bg-card hover:border-primary/25',
            'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/25',
            'transition-all duration-200 touch-manipulation',
          )}
          aria-label="Search workspace"
        >
          <span className="truncate">Search resumes, keywords, tools...</span>
        </button>
        <kbd className="hidden sm:inline-flex absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/80 border border-border/50 rounded px-1.5 py-0.5 pointer-events-none">
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
