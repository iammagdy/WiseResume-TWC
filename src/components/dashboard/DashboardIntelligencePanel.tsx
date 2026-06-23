import { memo, useMemo, useState, useCallback } from 'react';
import {
  Sparkles,
  ChevronRight,
  Wand2,
  Hash,
  BarChart3,
  FileEdit,
  Clock,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { ResumeHealthScore } from '@/hooks/useResumeScore';
import { DatabaseResume } from '@/hooks/useResumes';
import { buildActivityFeedFromLog, mergeActivityItems } from '@/components/dashboard/dashboardActivityLabels';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import {
  buildIntelligenceSignals,
  buildIntelligenceQuickActions,
  type IntelligencePrimaryAction,
  type IntelligenceQuickAction,
} from '@/components/dashboard/dashboardIntelligenceUtils';
import { useWorkspaceActivityStore } from '@/store/workspaceActivityStore';
import { DashboardMissingKeywordsDialog } from '@/components/dashboard/DashboardMissingKeywordsDialog';
import { DashboardAtsPortfolioDialog } from '@/components/dashboard/DashboardAtsPortfolioDialog';
import { DashboardImproveQuickDialog } from '@/components/dashboard/DashboardImproveQuickDialog';

const QUICK_ACTION_ICONS: Record<
  IntelligencePrimaryAction,
  typeof Wand2
> = {
  tailor: Wand2,
  keywords: Hash,
  ats: BarChart3,
  improve: FileEdit,
  'wise-ai': MessageCircle,
};

interface DashboardIntelligencePanelProps {
  healthScore?: ResumeHealthScore | null;
  featuredResume?: DatabaseResume | null;
  resumes?: DatabaseResume[];
  healthScores?: Record<string, ResumeHealthScore>;
  atsAverage?: number | null;
  scoringId?: string | null;
  scoresLoading?: boolean;
  onOpenImportJob: () => void;
  onEditResume: (resumeId: string) => void;
  onTailorResume: (resumeId: string) => void;
  className?: string;
}

export const DashboardIntelligencePanel = memo(function DashboardIntelligencePanel({
  healthScore,
  featuredResume = null,
  resumes = [],
  healthScores = {},
  atsAverage = null,
  scoringId = null,
  scoresLoading = false,
  onOpenImportJob,
  onEditResume,
  onTailorResume,
  className,
}: DashboardIntelligencePanelProps) {
  const [improveOpen, setImproveOpen] = useState(false);
  const [keywordsOpen, setKeywordsOpen] = useState(false);
  const [atsOpen, setAtsOpen] = useState(false);

  const signals = useMemo(
    () => buildIntelligenceSignals(healthScore, featuredResume),
    [healthScore, featuredResume],
  );

  const quickActions = useMemo(
    () => buildIntelligenceQuickActions(signals, healthScore, healthScores, resumes, atsAverage),
    [signals, healthScore, healthScores, resumes, atsAverage],
  );

  const activityEvents = useWorkspaceActivityStore((s) => s.events);
  const { data: serverActivity = [], isLoading: activityLoading } = useActivityFeed(6);
  const activityItems = useMemo(
    () => mergeActivityItems(serverActivity, buildActivityFeedFromLog(activityEvents, 6), 6),
    [serverActivity, activityEvents],
  );

  const openDialog = useCallback(
    (action: IntelligencePrimaryAction) => {
      haptics.light();
      switch (action) {
        case 'keywords':
          setKeywordsOpen(true);
          break;
        case 'ats':
          setAtsOpen(true);
          break;
        case 'tailor':
          onOpenImportJob();
          break;
        case 'wise-ai':
          window.dispatchEvent(new Event('open-wise-ai'));
          break;
        case 'improve':
        default:
          if (healthScore && healthScore.overallScore > 0) setImproveOpen(true);
          else setAtsOpen(true);
          break;
      }
    },
    [healthScore, onOpenImportJob],
  );

  const renderQuickAction = (action: IntelligenceQuickAction) => {
    const Icon = QUICK_ACTION_ICONS[action.id];
    return (
      <button
        key={action.id}
        type="button"
        className="dashboard-ai-rail__link dashboard-ai-rail__link--rich"
        onClick={() => openDialog(action.id)}
      >
        <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-xs font-medium text-foreground">{action.label}</span>
          <span className="block text-[10px] text-muted-foreground leading-snug mt-0.5">
            {action.description}
          </span>
        </span>
        <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
      </button>
    );
  };

  return (
    <>
      <aside
        className={cn('dashboard-ai-rail flex flex-col gap-2.5', className)}
        aria-label="AI workspace"
      >
        <section className="dashboard-ai-rail__card dashboard-ai-rail__featured rounded-2xl p-3.5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-primary shrink-0" aria-hidden />
              <p className="text-sm font-semibold text-foreground truncate">AI Workspace</p>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
              {scoresLoading ? 'Loading scores…' : signals.badge}
            </span>
          </div>
          {featuredResume?.title && (
            <p className="text-[11px] text-muted-foreground mb-2 truncate">
              Focus: <span className="text-foreground font-medium">{featuredResume.title}</span>
            </p>
          )}
          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Recommended next step
            </p>
            <p className="text-[15px] font-semibold text-foreground leading-snug">{signals.opportunityTitle}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{signals.opportunity}</p>
            <Button
              variant="default"
              size="sm"
              className="dashboard-ai-cta w-full h-10 min-h-[44px] rounded-xl text-sm font-medium shadow-none mt-1"
              onClick={() => openDialog(signals.primaryAction)}
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              {signals.cta}
            </Button>
            {signals.showImpact && (
              <div className="flex items-center gap-1.5 text-[10px] text-primary/90 pt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/80 shrink-0" aria-hidden />
                Highest impact for your focus resume
              </div>
            )}
          </div>
        </section>

        {quickActions.length > 0 && (
          <section className="dashboard-ai-rail__card rounded-2xl p-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground mb-0.5">
              Other tools
            </p>
            <p className="text-[10px] text-muted-foreground/80 mb-2 leading-snug">
              Different from your recommended step above
            </p>
            <div className="flex flex-col gap-1">
              {quickActions.map(renderQuickAction)}
            </div>
          </section>
        )}

        <section className="dashboard-ai-rail__card rounded-2xl p-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground mb-2">
            Recent Activity
          </p>
          {activityLoading && activityItems.length === 0 ? (
            <div className="space-y-1.5" aria-hidden>
              {[0, 1, 2].map((i) => (
                <div key={i} className="dashboard-ai-rail__activity">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="h-3 w-2/3 rounded bg-muted/60 animate-pulse" />
                    <div className="h-2.5 w-1/2 rounded bg-muted/40 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : activityItems.length > 0 ? (
            <div className="space-y-1.5">
              {activityItems.map((item) => {
                const row = (
                  <>
                    <p className="text-xs font-medium text-foreground leading-snug">{item.label}</p>
                    {item.detail && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.detail}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/90 mt-0.5 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 shrink-0" aria-hidden />
                      {item.time}
                    </p>
                  </>
                );
                return item.resumeId ? (
                  <button
                    key={item.id}
                    type="button"
                    className="dashboard-ai-rail__activity w-full text-left min-h-[44px] touch-manipulation"
                    onClick={() => {
                      haptics.light();
                      onEditResume(item.resumeId!);
                    }}
                  >
                    <div className="min-w-0 flex-1">{row}</div>
                  </button>
                ) : (
                  <div key={item.id} className="dashboard-ai-rail__activity">
                    <div className="min-w-0 flex-1">{row}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed">
              Duplicate, delete, tailor, or import a job — your actions will appear here.
            </p>
          )}
        </section>
      </aside>

      {healthScore && healthScore.overallScore > 0 && featuredResume && (
        <DashboardImproveQuickDialog
          open={improveOpen}
          onOpenChange={setImproveOpen}
          resumeTitle={featuredResume.title}
          healthScore={healthScore}
          onReviewKeywords={() => setKeywordsOpen(true)}
          onViewAtsBreakdown={() => setAtsOpen(true)}
          onTailorToJob={onOpenImportJob}
        />
      )}

      <DashboardMissingKeywordsDialog
        open={keywordsOpen}
        onOpenChange={setKeywordsOpen}
        resumes={resumes}
        healthScores={healthScores}
        onEditResume={onEditResume}
      />

      <DashboardAtsPortfolioDialog
        open={atsOpen}
        onOpenChange={setAtsOpen}
        resumes={resumes}
        healthScores={healthScores}
        atsAverage={atsAverage}
        scoringId={scoringId}
        onEditResume={onEditResume}
        onTailorResume={onTailorResume}
      />
    </>
  );
});
