import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Briefcase, ChevronRight, Link2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useJobs, type Job } from '@/hooks/useJobs';
import { buildTailoringHubJobUrl } from '@/hooks/useSavedJobPostings';
import { haptics } from '@/lib/haptics';
import { useLocale } from '@/i18n/LocaleProvider';

interface DashboardSavedJobsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportJob?: () => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

function SavedJobRow({ job, onOpen }: { job: Job; onOpen: (job: Job) => void }) {
  const { t } = useLocale();

  return (
    <button
      type="button"
      className="w-full rounded-xl border border-border/50 bg-card/60 p-3.5 text-left transition-colors hover:border-border/80 hover:bg-card/90 active:scale-[0.99] touch-manipulation"
      onClick={() => onOpen(job)}
      aria-label={t('app.tailoringHubPage.savedJobs.openAria', 'افتح {{title}} في {{company}}', {
        title: job.title,
        company: job.company,
      })}
    >
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
          <Briefcase className="w-4 h-4 text-primary" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground leading-snug truncate">{job.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            <Building2 className="w-3 h-3 inline mr-0.5 -mt-px" aria-hidden />
            {job.company}
            {job.location ? ` · ${job.location}` : ''}
          </p>
          {job.created_at ? (
            <p className="text-[10px] text-muted-foreground/80 mt-1">
              {t('app.tailoringHubPage.savedJobs.savedOn', 'تم الحفظ {{date}}', {
                date: formatDate(job.created_at),
              })}
            </p>
          ) : null}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2" aria-hidden />
      </div>
    </button>
  );
}

export const DashboardSavedJobsDialog = memo(function DashboardSavedJobsDialog({
  open,
  onOpenChange,
  onImportJob,
}: DashboardSavedJobsDialogProps) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { data: jobs = [], isLoading } = useJobs();
  const savedCount = jobs.length;

  const handleOpenJob = (job: Job) => {
    haptics.light();
    onOpenChange(false);
    navigate(buildTailoringHubJobUrl(job));
  };

  const handleImport = () => {
    haptics.light();
    onOpenChange(false);
    onImportJob?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[min(90vh,640px)] flex flex-col p-0 gap-0" fullScreenOnMobile>
        <DialogHeader className="px-4 sm:px-6 pt-5 pb-3 shrink-0 text-left">
          <DialogTitle>{t('app.tailoringHubPage.savedJobs.title', 'الوظائف المحفوظة')}</DialogTitle>
          <DialogDescription>
            {savedCount > 0
              ? t(
                  'app.tailoringHubPage.savedJobs.dialogDescriptionCount',
                  'لديك {{count}} وظيفة محفوظة في مساحة العمل. افتح واحدة لتخصيص السيرة الذاتية.',
                  { count: savedCount, suffix: savedCount !== 1 ? 's' : '' },
                )
              : t(
                  'app.tailoringHubPage.savedJobs.dialogDescriptionEmpty',
                  'استورد إعلان وظيفة لحفظ تفاصيل الدور من أجل التخصيص واحتساب درجة التوافق.',
                )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 px-4 sm:px-6 pb-5">
          {isLoading ? (
            <div className="rounded-xl border border-dashed border-border/50 bg-card/30 px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {t('app.tailoringHubPage.savedJobs.loading', 'جارٍ تحميل الوظائف المحفوظة...')}
              </p>
            </div>
          ) : savedCount === 0 ? (
            <div className="rounded-xl border border-dashed border-border/50 bg-card/30 px-4 py-8 text-center space-y-3">
              <p className="text-sm font-medium text-foreground">
                {t('app.tailoringHubPage.savedJobs.emptyTitle', 'لا توجد وظائف محفوظة بعد')}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                {t(
                  'app.tailoringHubPage.savedJobs.emptyDescription',
                  'الصق رابط LinkedIn أو Indeed أو صفحة وظائف لاستيراد الإعلان إلى مساحة العمل.',
                )}
              </p>
              {onImportJob ? (
                <Button type="button" size="sm" className="h-9 rounded-lg" onClick={handleImport}>
                  <Link2 className="w-3.5 h-3.5 mr-1.5" aria-hidden />
                  {t('app.tailoringHubPage.hero.import', 'استيراد إعلان وظيفة')}
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2.5 pr-2">
              {jobs.map((job) => (
                <SavedJobRow key={job.id} job={job} onOpen={handleOpenJob} />
              ))}
            </div>
          )}
        </ScrollArea>

        {savedCount > 0 && onImportJob ? (
          <div className="shrink-0 px-4 sm:px-6 py-3.5 border-t border-border/40">
            <Button type="button" variant="outline" className="w-full h-10 rounded-xl" onClick={handleImport}>
              <Plus className="w-4 h-4 mr-2" aria-hidden />
              {t('app.tailoringHubPage.savedJobs.importAnother', 'استيراد وظيفة أخرى')}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
});
