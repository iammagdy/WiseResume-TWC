import { cn } from '@/lib/utils';
import { useLocale } from '@/i18n/LocaleProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  MapPin,
  DollarSign,
  Bookmark,
  Calendar,
  Wand2,
  CheckCircle2,
  Sparkles,
  Eye,
  Check,
  ExternalLink,
} from 'lucide-react';
import type { NormalizedRemoteJob, UserJobAction } from '@/lib/remoteJobsFeed';

export interface JobCardProps {
  job: NormalizedRemoteJob;
  action?: UserJobAction;
  isTailoring?: boolean;
  confirmingApplied?: boolean;
  onApplyClick: (job: NormalizedRemoteJob) => void;
  onFastTailor: (job: NormalizedRemoteJob) => void;
  onToggleSave: (job: NormalizedRemoteJob, isSaved: boolean) => void;
  onMarkApplied: (job: NormalizedRemoteJob) => void;
  onCancelConfirm: () => void;
  onViewJob: (job: NormalizedRemoteJob) => void;
  formatDate: (date: string | null | undefined) => string;
}

export function JobCard({
  job,
  action,
  isTailoring = false,
  confirmingApplied = false,
  onApplyClick,
  onFastTailor,
  onToggleSave,
  onMarkApplied,
  onCancelConfirm,
  onViewJob,
  formatDate,
}: JobCardProps) {
  const { t, direction } = useLocale();
  const isRtl = direction === 'rtl';

  const isSaved = action?.status === 'saved';
  const isApplied = action?.status === 'applied';
  const isTailored = action?.status === 'tailored' || action?.status === 'ready_to_apply';
  const formattedDate = formatDate(job.published_at);
  const locationText = job.location || job.remote_region || 'Remote';
  const hasRealSalary = Boolean(job.salary_display && job.salary_display !== 'Salary not listed');

  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between rounded-xl border bg-card p-4 sm:p-5 transition-all hover:shadow-md',
        isApplied
          ? 'bg-emerald-500/5 border-emerald-500/30'
          : isTailored
          ? 'bg-amber-500/5 border-amber-500/30'
          : 'border-border/70 hover:border-primary/40',
        confirmingApplied && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="space-y-3">
        {/* Top Badges & Bookmark */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isApplied && (
              <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[10px] py-0.5">
                <CheckCircle2 className="w-3 h-3" />
                {t('jobs.applied', 'Applied')}
              </Badge>
            )}
            {isTailored && !isApplied && (
              <Badge
                variant="secondary"
                className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 font-semibold text-[10px] py-0.5 gap-1"
              >
                <Sparkles className="w-3 h-3" />
                {t('jobs.tailored', 'Tailored')}
              </Badge>
            )}
            {job.role_group === 'easy_entry_level' && (
              <Badge
                variant="secondary"
                className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 text-[10px] py-0.5 font-medium"
              >
                {t('jobs.entryLevel', 'Entry Level')}
              </Badge>
            )}
            {job.seniority_level && job.seniority_level !== 'all' && job.seniority_level !== 'unknown' && (
              <Badge
                variant="outline"
                className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-border bg-slate-900/5 dark:bg-slate-100/5 py-0.5"
              >
                {job.seniority_level.replace(/_/g, ' ')}
              </Badge>
            )}
            {job.category && (
              <span className="text-[11px] text-muted-foreground font-medium truncate max-w-[120px]">
                {job.category}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Demoted Source Badge — small, muted */}
            <span className="text-[10px] text-muted-foreground/70 font-mono uppercase px-1.5 py-0.5 rounded bg-muted/40">
              {job.source}
            </span>
            {job.apply_url && onApplyClick && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => onApplyClick(job)}
                title={t('jobs.applyOnWebsite', 'Apply on website')}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-7 w-7 text-muted-foreground hover:text-foreground',
                isSaved && 'text-amber-500 hover:text-amber-600',
              )}
              onClick={() => onToggleSave(job, isSaved)}
              title={isSaved ? t('jobs.unsave', 'Remove from saved') : t('jobs.save', 'Save job')}
            >
              <Bookmark className={cn('w-4 h-4', isSaved && 'fill-amber-500 text-amber-500')} />
            </Button>
          </div>
        </div>

        {/* Priority 1 & 2: Title and Company */}
        <div>
          <h2
            onClick={() => onViewJob(job)}
            className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 cursor-pointer leading-snug"
          >
            {job.title}
          </h2>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1.5 mt-1">
            <Building2 className="w-3.5 h-3.5 text-primary/70 shrink-0" />
            <span className="truncate">{job.company}</span>
          </p>
        </div>

        {/* Priority 3, 4, 5: Location, Posted Date & Salary */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 bg-secondary/60 px-2 py-0.5 rounded-md font-medium">
            <MapPin className="w-3 h-3 text-primary shrink-0" />
            <span className="truncate max-w-[140px]">{locationText}</span>
          </span>

          {formattedDate && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/90 font-medium">
              <Calendar className="w-3 h-3 shrink-0" />
              <span>{formattedDate}</span>
            </span>
          )}

          {hasRealSalary && (
            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md font-semibold text-[11px]">
              <DollarSign className="w-3 h-3 shrink-0" />
              <span>{job.salary_display}</span>
            </span>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="pt-3 mt-4 border-t border-border/50">
        {confirmingApplied ? (
          <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between gap-2 animate-in fade-in duration-150">
            <span className="text-xs font-semibold text-primary flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {t('jobs.confirmAppliedPrompt', 'Did you apply on their site?')}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                className="h-7 px-2.5 text-xs font-semibold"
                onClick={() => onMarkApplied(job)}
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                {t('common.yes', 'Yes')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={onCancelConfirm}
              >
                {t('common.notYet', 'Not yet')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            {/* Primary Action: View Job */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewJob(job)}
              className="h-8 px-3 text-xs font-medium border-border/80 hover:border-primary/40 hover:bg-muted/50 gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-primary" />
              {t('jobs.viewJob', 'View Job')}
            </Button>

            {/* Secondary Action: Fast Tailor */}
            <Button
              variant="default"
              size="sm"
              onClick={() => onFastTailor(job)}
              className="h-8 px-3 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 gap-1.5 shadow-sm"
              disabled={isTailoring}
            >
              <Wand2 className="w-3.5 h-3.5 text-slate-950" />
              {t('jobs.fastTailor', 'Fast Tailor')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
