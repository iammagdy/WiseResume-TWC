import { lazy, memo, Suspense } from 'react';
import { Search, Plus, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { haptics } from '@/lib/haptics';
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

      {/* Mobile: shell has tabs in bottom bar; duplicate key actions here */}
      <div className="flex items-center gap-1.5 shrink-0 lg:hidden">
        <Suspense
          fallback={
            <div className="h-9 w-[7.5rem] rounded-xl animate-pulse bg-muted/40" aria-hidden />
          }
        >
          <DashboardUploadWidget variant="toolbar" />
        </Suspense>
        <Button
          size="sm"
          className="h-9 px-3 rounded-xl text-sm font-medium shadow-none"
          onClick={() => {
            haptics.light();
            onImportJob();
          }}
        >
          <Plus className="w-4 h-4 mr-1" />
          Import
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            haptics.light();
            onOpenWiseAI();
          }}
          className="h-9 px-3 rounded-xl text-sm font-medium shadow-none gap-1.5 border-primary/30"
          aria-label="Ask Wise AI"
        >
          <MessageCircle className="w-4 h-4 text-primary shrink-0" aria-hidden />
          Wise AI
        </Button>
      </div>
    </div>
  );
});
