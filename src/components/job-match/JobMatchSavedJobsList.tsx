import { Building2, Briefcase, ChevronRight, Link2, Plus } from 'lucide-react';
import { useJobs, type Job } from '@/hooks/useJobs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocale } from '@/i18n/LocaleProvider';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

interface JobMatchSavedJobsListProps {
  selectedJobId?: string | null;
  onSelectJob: (job: Job) => void;
  onImportJob?: () => void;
  className?: string;
}

function SavedJobItem({
  job,
  selected,
  onClick,
}: {
  job: Job;
  selected: boolean;
  onClick: () => void;
}) {
  const { t } = useLocale();

  return (
    <button
      type="button"
      className={cn('jmw-history-item', selected && 'ring-1 ring-primary/40 bg-primary/5')}
      onClick={onClick}
      aria-label={t('app.tailoringHubPage.savedJobs.openAria', 'افتح {{title}} في {{company}}', {
        title: job.title,
        company: job.company,
      })}
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
        <Briefcase className="w-4 h-4 text-primary" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-sm font-semibold text-foreground leading-snug truncate">{job.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          <Building2 className="w-3 h-3 inline mr-0.5 -mt-px" aria-hidden />
          {job.company}
          {job.created_at ? ` · ${formatDate(job.created_at)}` : ''}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
    </button>
  );
}

export function JobMatchSavedJobsList({
  selectedJobId,
  onSelectJob,
  onImportJob,
  className,
}: JobMatchSavedJobsListProps) {
  const { t } = useLocale();
  const { data: jobs = [], isLoading } = useJobs();

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t('app.tailoringHubPage.savedJobs.title', 'الوظائف المحفوظة')}
          </p>
        </div>
        {onImportJob ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] shrink-0"
            onClick={onImportJob}
          >
            <Plus className="w-3 h-3 mr-1" aria-hidden />
            {t('app.tailoringHubPage.savedJobs.import', 'استيراد')}
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-dashed border-border/50 bg-card/30 px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            {t('app.tailoringHubPage.savedJobs.loading', 'جارٍ تحميل الوظائف المحفوظة...')}
          </p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 bg-card/30 px-4 py-5 text-center space-y-2">
          <p className="text-sm font-medium text-foreground">
            {t('app.tailoringHubPage.savedJobs.emptyTitle', 'لا توجد وظائف محفوظة بعد')}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('app.tailoringHubPage.savedJobs.emptyDescription', 'استورد رابط إعلان وظيفة لاستخراج تفاصيل الدور والاحتفاظ بها هنا من أجل التخصيص.')}
          </p>
          {onImportJob ? (
            <Button type="button" size="sm" className="h-8 rounded-lg text-xs" onClick={onImportJob}>
              <Link2 className="w-3.5 h-3.5 mr-1.5" aria-hidden />
              {t('app.tailoringHubPage.hero.import', 'استيراد إعلان وظيفة')}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-[min(280px,40dvh)] overflow-y-auto pr-0.5">
          {jobs.slice(0, 12).map((job) => (
            <SavedJobItem
              key={job.id}
              job={job}
              selected={selectedJobId === job.id}
              onClick={() => onSelectJob(job)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
