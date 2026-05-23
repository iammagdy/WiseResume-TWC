import { memo } from 'react';
import { Plus, Upload, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { DatabaseResume } from '@/hooks/useResumes';
import { ResumeHealthScore } from '@/hooks/useResumeScore';
import { DashboardNextActionCard } from './DashboardNextActionCard';
import { DashboardRecentActivity } from './DashboardRecentActivity';

interface DashboardUtilityRailProps {
  healthScore?: ResumeHealthScore | null;
  resumes: DatabaseResume[];
  healthScores: Record<string, ResumeHealthScore>;
  onReview: () => void;
  onTailor: () => void;
  onImport: () => void;
  onOptimize: () => void;
  onCreateNew: () => void;
  onOpenResume: (id: string) => void;
  className?: string;
}

export const DashboardUtilityRail = memo(function DashboardUtilityRail({
  healthScore,
  resumes,
  healthScores,
  onReview,
  onTailor,
  onImport,
  onOptimize,
  onCreateNew,
  onOpenResume,
  className,
}: DashboardUtilityRailProps) {
  return (
    <aside
      className={cn(
        'dashboard-utility-rail flex flex-col gap-3 mt-3 lg:mt-0 lg:sticky lg:top-3 lg:self-start',
        className,
      )}
      aria-label="Workspace utilities"
    >
      <DashboardNextActionCard
        healthScore={healthScore}
        onReview={onReview}
        onTailor={onTailor}
        className="w-full lg:max-w-none"
      />

      <div className="dashboard-utility-section rounded-2xl border border-border/80 bg-card/90 p-3 shadow-soft-sm">
        <h4 className="dashboard-utility-section__title mb-2">Quick actions</h4>
        <div className="grid gap-1.5">
          <Button
            size="sm"
            className="w-full h-10 min-h-[44px] rounded-xl justify-start gap-2 font-medium"
            onClick={() => {
              haptics.light();
              onOptimize();
            }}
          >
            <Wand2 className="w-4 h-4 shrink-0" />
            Tailor to Job
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-10 min-h-[44px] rounded-xl justify-start gap-2 font-medium"
            onClick={() => {
              haptics.light();
              onImport();
            }}
          >
            <Upload className="w-4 h-4 shrink-0" />
            Import CV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-10 min-h-[44px] rounded-xl justify-start gap-2 font-medium text-muted-foreground hover:text-foreground"
            onClick={() => {
              haptics.light();
              onCreateNew();
            }}
          >
            <Plus className="w-4 h-4 shrink-0" />
            New resume
          </Button>
        </div>
      </div>

      <DashboardRecentActivity
        resumes={resumes}
        healthScores={healthScores}
        onOpenResume={onOpenResume}
      />
    </aside>
  );
});
