import { memo, useMemo } from 'react';
import { Upload, Wand2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { safeFormatDistanceToNow } from '@/lib/dateUtils';
import { DatabaseResume } from '@/hooks/useResumes';
import { ResumeHealthScore } from '@/hooks/useResumeScore';
import { HeroAtsScoreRing } from './HeroAtsScoreRing';

interface DashboardWorkspaceHeaderProps {
  userName?: string | null;
  featuredResume?: DatabaseResume | null;
  healthScore?: ResumeHealthScore | null;
  isScoring?: boolean;
  hasResumes: boolean;
  onOptimize: () => void;
  onImport: () => void;
  onOpenEditor: () => void;
  onBuild?: () => void;
  className?: string;
}

export const DashboardWorkspaceHeader = memo(function DashboardWorkspaceHeader({
  userName,
  featuredResume,
  healthScore,
  isScoring = false,
  hasResumes,
  onOptimize,
  onImport,
  onOpenEditor,
  onBuild,
  className,
}: DashboardWorkspaceHeaderProps) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = userName?.trim().split(/\s+/)[0] ?? '';
  const score = healthScore?.overallScore ?? 0;
  const gapCount = healthScore?.keywordGaps?.length ?? 0;

  const statusLine = featuredResume
    ? gapCount > 0
      ? `${gapCount} keyword gap${gapCount === 1 ? '' : 's'} on your active resume`
      : healthScore?.topImprovement ?? 'Ready for your next application'
    : null;

  const updatedLabel = featuredResume
    ? safeFormatDistanceToNow(
        featuredResume.$updatedAt || featuredResume.$createdAt || Date.now(),
        { addSuffix: true },
      )
    : null;

  const templateLabel = featuredResume?.template
    ? `${featuredResume.template.charAt(0).toUpperCase()}${featuredResume.template.slice(1)}`
    : null;

  return (
    <header
      className={cn('px-4 pt-3 pb-2 dashboard-workspace-header', className)}
      aria-label="Resume workspace"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="dashboard-workspace-eyebrow">
            {hasResumes ? 'AI career workspace' : 'WiseResume workspace'}
          </p>
          <h1
            data-dashboard-heading
            className="text-lg sm:text-xl font-semibold tracking-tight text-foreground leading-snug"
          >
            {firstName ? `${greeting}, ${firstName}` : greeting}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
            {hasResumes
              ? 'Your resumes and ATS signals — pick up where you left off.'
              : 'Upload or build a resume, then tailor it to each role you target.'}
          </p>

          {featuredResume && (
            <div className="dashboard-workspace-featured flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-2xl border border-border/80 bg-card/90 shadow-soft-sm">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                  Active resume
                </p>
                <p className="font-semibold text-foreground truncate">{featuredResume.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {[updatedLabel, templateLabel && `${templateLabel} template`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {statusLine && (
                  <p className="text-xs text-foreground/80 mt-1 line-clamp-2">{statusLine}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <HeroAtsScoreRing
                  score={score}
                  size={64}
                  isLoading={isScoring && !healthScore}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 min-h-[44px] rounded-xl hidden sm:inline-flex"
                  onClick={() => {
                    haptics.light();
                    onOpenEditor();
                  }}
                >
                  <Pencil className="w-4 h-4 mr-1.5" />
                  Edit
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-row gap-2 w-full lg:w-auto shrink-0">
          <Button
            variant="outline"
            size="default"
            className="rounded-xl border-border bg-card/80 flex-1 lg:flex-none min-h-[44px] h-10 px-3 text-sm shadow-none hover:border-primary/25"
            onClick={() => {
              haptics.light();
              onImport();
            }}
          >
            <Upload className="w-4 h-4 shrink-0" />
            Import CV
          </Button>
          <Button
            size="default"
            className="font-semibold flex-1 lg:flex-none min-h-[44px] h-10 px-3 text-sm rounded-xl shadow-soft-sm"
            onClick={() => {
              haptics.light();
              if (hasResumes) onOptimize();
              else onBuild?.();
            }}
          >
            <Wand2 className="w-4 h-4 shrink-0" />
            {hasResumes ? 'Tailor to Job' : 'Get Started'}
          </Button>
        </div>
      </div>
    </header>
  );
});
