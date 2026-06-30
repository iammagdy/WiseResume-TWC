import { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wand2,
  Bookmark,
  FileStack,
  History,
  Link2,
  Plus,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useJobs, type Job } from '@/hooks/useJobs';
import { useCombinedTailorHistory } from '@/hooks/useCombinedTailorHistory';
import { useResumes, type DatabaseResume } from '@/hooks/useResumes';
import { isTailoredResume } from '@/lib/resumeLineage';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useLocale } from '@/i18n/LocaleProvider';

interface TailoringHubLandingProps {
  persistedTailoredIds: Set<string>;
  onStartTailoring: () => void;
  onImportJob: () => void;
  onSelectSavedJob: (job: Job) => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

function HubStatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: typeof Bookmark;
  tone: 'sky' | 'violet' | 'rose';
}) {
  const toneClass = {
    sky: 'th-hub-stat--sky',
    violet: 'th-hub-stat--violet',
    rose: 'th-hub-stat--rose',
  }[tone];

  return (
    <article className={cn('th-hub-stat', toneClass)}>
      <div className="th-hub-stat__head">
        <p className="th-hub-stat__label">{label}</p>
        <span className="th-hub-stat__icon-wrap">
          <Icon className="w-4 h-4" aria-hidden />
        </span>
      </div>
      <p className="th-hub-stat__value">{value}</p>
      <p className="th-hub-stat__hint">{hint}</p>
    </article>
  );
}

function SavedJobRow({ job, onClick }: { job: Job; onClick: () => void }) {
  return (
    <button type="button" className="th-hub-list-item" onClick={onClick}>
      <span className="th-hub-list-item__icon">
        <Briefcase className="w-4 h-4 text-primary" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-semibold text-foreground truncate">{job.title}</span>
        <span className="block text-xs text-muted-foreground truncate">
          {job.company}
          {job.created_at ? ` · ${formatDate(job.created_at)}` : ''}
        </span>
      </span>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
    </button>
  );
}

function HistoryRow({
  title,
  subtitle,
  score,
  onClick,
}: {
  title: string;
  subtitle: string;
  score?: number;
  onClick: () => void;
}) {
  return (
    <button type="button" className="th-hub-list-item" onClick={onClick}>
      <span className="th-hub-list-item__icon">
        <History className="w-4 h-4 text-primary" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-semibold text-foreground truncate">{title}</span>
        <span className="block text-xs text-muted-foreground truncate">{subtitle}</span>
      </span>
      {score != null && score > 0 ? (
        <span className="th-hub-score-pill">
          <TrendingUp className="w-2.5 h-2.5" aria-hidden />
          {score}%
        </span>
      ) : null}
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
    </button>
  );
}

function TailoredCvRow({
  resume,
  jobLabel,
  onClick,
}: {
  resume: DatabaseResume;
  jobLabel: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="th-hub-list-item" onClick={onClick}>
      <span className="th-hub-list-item__icon">
        <FileStack className="w-4 h-4 text-primary" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-semibold text-foreground truncate">{resume.title}</span>
        <span className="block text-xs text-muted-foreground truncate">
          {jobLabel}
          {resume.$updatedAt ? ` · ${formatDate(resume.$updatedAt)}` : ''}
        </span>
      </span>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
    </button>
  );
}

export const TailoringHubLanding = memo(function TailoringHubLanding({
  persistedTailoredIds,
  onStartTailoring,
  onImportJob,
  onSelectSavedJob,
}: TailoringHubLandingProps) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { data: jobs = [], isLoading: jobsLoading, isFetched: jobsFetched } = useJobs();
  const showSavedJobsEmpty = jobsFetched && !jobsLoading && jobs.length === 0;
  const { history, isLoading: historyLoading } = useCombinedTailorHistory(12);
  const { data: allResumes = [], isLoading: resumesLoading } = useResumes();

  const tailoredResumes = useMemo(() => {
    const ids = new Set<string>([...persistedTailoredIds]);
    history.forEach((h) => {
      if (h.tailoredResumeId) ids.add(h.tailoredResumeId);
    });
    return allResumes
      .filter((r) => isTailoredResume(r, ids))
      .sort(
        (a, b) =>
          new Date(b.$updatedAt ?? b.$createdAt ?? 0).getTime() -
          new Date(a.$updatedAt ?? a.$createdAt ?? 0).getTime(),
      );
  }, [allResumes, persistedTailoredIds, history]);

  const historyByResumeId = useMemo(() => {
    const map = new Map<string, { jobTitle: string; company: string }>();
    history.forEach((entry) => {
      if (entry.tailoredResumeId) {
        map.set(entry.tailoredResumeId, { jobTitle: entry.jobTitle, company: entry.company });
      }
    });
    return map;
  }, [history]);

  const handleStart = () => {
    haptics.medium();
    onStartTailoring();
  };

  return (
    <div className="th-hub">
      <section className="th-hub-hero">
        <div className="th-hub-hero__copy">
          <p className="th-hub-hero__eyebrow">{t('app.tailoringHubPage.hero.eyebrow')}</p>
          <h2 className="th-hub-hero__title">{t('app.tailoringHubPage.hero.title')}</h2>
          <p className="th-hub-hero__desc">{t('app.tailoringHubPage.hero.description')}</p>
        </div>
        <div className="th-hub-hero__actions">
          <Button type="button" size="lg" className="th-hub-hero__cta h-11 rounded-xl" onClick={handleStart}>
            <Wand2 className="w-4 h-4 mr-2" aria-hidden />
            {t('app.tailoringHubPage.hero.start')}
          </Button>
          <Button type="button" variant="outline" size="lg" className="h-11 rounded-xl" onClick={onImportJob}>
            <Link2 className="w-4 h-4 mr-2" aria-hidden />
            {t('app.tailoringHubPage.hero.import')}
          </Button>
        </div>
      </section>

      <section className="th-hub-stats" aria-label={t('app.tailoringHubPage.overviewAria')}>
        <HubStatCard
          label={t('app.tailoringHubPage.stats.savedJobs.label')}
          value={jobsLoading ? '…' : jobs.length}
          hint={t('app.tailoringHubPage.stats.savedJobs.hint')}
          icon={Bookmark}
          tone="sky"
        />
        <HubStatCard
          label={t('app.tailoringHubPage.stats.tailoredCvs.label')}
          value={resumesLoading ? '…' : tailoredResumes.length}
          hint={t('app.tailoringHubPage.stats.tailoredCvs.hint')}
          icon={FileStack}
          tone="violet"
        />
        <HubStatCard
          label={t('app.tailoringHubPage.stats.sessions.label')}
          value={historyLoading ? '…' : history.length}
          hint={t('app.tailoringHubPage.stats.sessions.hint')}
          icon={Sparkles}
          tone="rose"
        />
      </section>

      <div className="th-hub-grid">
        <section className="th-hub-panel">
          <header className="th-hub-panel__head">
            <div>
              <h3 className="th-hub-panel__title">{t('app.tailoringHubPage.savedJobs.title')}</h3>
              <p className="th-hub-panel__subtitle">{t('app.tailoringHubPage.savedJobs.subtitle')}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs shrink-0" onClick={onImportJob}>
              <Plus className="w-3.5 h-3.5 mr-1" aria-hidden />
              {t('app.tailoringHubPage.savedJobs.import')}
            </Button>
          </header>
          <div className="th-hub-panel__body">
            {jobsLoading ? (
              <p className="th-hub-empty">{t('app.tailoringHubPage.savedJobs.loading')}</p>
            ) : showSavedJobsEmpty ? (
              <div className="th-hub-empty-block">
                <p className="text-sm font-medium text-foreground">{t('app.tailoringHubPage.savedJobs.emptyTitle')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('app.tailoringHubPage.savedJobs.emptyDescription')}</p>
                <Button type="button" size="sm" className="mt-3 h-8 rounded-lg text-xs" onClick={onImportJob}>
                  {t('app.tailoringHubPage.hero.import')}
                </Button>
              </div>
            ) : (
              <div className="th-hub-list">
                {jobs.slice(0, 6).map((job) => (
                  <SavedJobRow
                    key={job.id}
                    job={job}
                    onClick={() => {
                      haptics.selection();
                      onSelectSavedJob(job);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="th-hub-panel">
          <header className="th-hub-panel__head">
            <div>
              <h3 className="th-hub-panel__title">{t('app.tailoringHubPage.recent.title')}</h3>
              <p className="th-hub-panel__subtitle">{t('app.tailoringHubPage.recent.subtitle')}</p>
            </div>
          </header>
          <div className="th-hub-panel__body">
            {historyLoading ? (
              <p className="th-hub-empty">{t('app.tailoringHubPage.recent.loading')}</p>
            ) : history.length === 0 ? (
              <div className="th-hub-empty-block">
                <p className="text-sm font-medium text-foreground">{t('app.tailoringHubPage.recent.emptyTitle')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('app.tailoringHubPage.recent.emptyDescription')}</p>
                <Button type="button" size="sm" variant="outline" className="mt-3 h-8 rounded-lg text-xs" onClick={handleStart}>
                  {t('app.tailoringHubPage.recent.start')}
                </Button>
              </div>
            ) : (
              <div className="th-hub-list">
                {history.slice(0, 6).map((entry) => (
                  <HistoryRow
                    key={entry.id}
                    title={entry.jobTitle}
                    subtitle={`${entry.company}${entry.createdAt ? ` · ${formatDate(entry.createdAt)}` : ''}`}
                    score={entry.scoreBeforeAfter?.after}
                    onClick={() => {
                      haptics.light();
                      if (entry.tailoredResumeId) {
                        navigate(`/tailoring-hub/result/${entry.tailoredResumeId}`);
                      } else {
                        onStartTailoring();
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="th-hub-panel th-hub-panel--wide">
        <header className="th-hub-panel__head">
          <div>
            <h3 className="th-hub-panel__title">{t('app.tailoringHubPage.tailored.title')}</h3>
            <p className="th-hub-panel__subtitle">
              {tailoredResumes.length > 0
                ? t('app.tailoringHubPage.tailored.count', { count: tailoredResumes.length })
                : t('app.tailoringHubPage.tailored.subtitle')}
            </p>
          </div>
        </header>
        <div className="th-hub-panel__body">
          {resumesLoading ? (
            <p className="th-hub-empty">{t('app.tailoringHubPage.tailored.loading')}</p>
          ) : tailoredResumes.length === 0 ? (
            <div className="th-hub-empty-block">
              <p className="text-sm font-medium text-foreground">{t('app.tailoringHubPage.tailored.emptyTitle')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('app.tailoringHubPage.tailored.emptyDescription')}
              </p>
            </div>
          ) : (
            <div className="th-hub-list th-hub-list--grid">
              {tailoredResumes.slice(0, 8).map((resume) => {
                const meta = historyByResumeId.get(resume.$id);
                const jobLabel = meta
                  ? t('app.tailoringHubPage.tailored.jobLabel', {
                      title: meta.jobTitle,
                      company: meta.company || '',
                    })
                  : t('app.tailoringHubPage.tailored.resumeLabel');
                return (
                  <TailoredCvRow
                    key={resume.$id}
                    resume={resume}
                    jobLabel={jobLabel}
                    onClick={() => {
                      haptics.light();
                      navigate(`/tailoring-hub/result/${resume.$id}`);
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
});
