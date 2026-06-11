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
  jobLabel?: string;
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
          {jobLabel ?? 'Tailored resume'}
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
          <p className="th-hub-hero__eyebrow">AI Tailoring Hub</p>
          <h2 className="th-hub-hero__title">Your job tailoring command center</h2>
          <p className="th-hub-hero__desc">
            Save postings, track tailored versions, and launch a new tailoring session when you are ready —
            without jumping straight into a form.
          </p>
        </div>
        <div className="th-hub-hero__actions">
          <Button type="button" size="lg" className="th-hub-hero__cta h-11 rounded-xl" onClick={handleStart}>
            <Wand2 className="w-4 h-4 mr-2" aria-hidden />
            Start new tailoring
          </Button>
          <Button type="button" variant="outline" size="lg" className="h-11 rounded-xl" onClick={onImportJob}>
            <Link2 className="w-4 h-4 mr-2" aria-hidden />
            Import job posting
          </Button>
        </div>
      </section>

      <section className="th-hub-stats" aria-label="Tailoring overview">
        <HubStatCard
          label="Saved jobs"
          value={jobsLoading ? '…' : jobs.length}
          hint="Postings in your workspace"
          icon={Bookmark}
          tone="sky"
        />
        <HubStatCard
          label="Tailored CVs"
          value={resumesLoading ? '…' : tailoredResumes.length}
          hint="Versions created for roles"
          icon={FileStack}
          tone="violet"
        />
        <HubStatCard
          label="Tailoring sessions"
          value={historyLoading ? '…' : history.length}
          hint="Recent match & rewrite runs"
          icon={Sparkles}
          tone="rose"
        />
      </section>

      <div className="th-hub-grid">
        <section className="th-hub-panel">
          <header className="th-hub-panel__head">
            <div>
              <h3 className="th-hub-panel__title">Saved jobs</h3>
              <p className="th-hub-panel__subtitle">Import once, reuse for every tailoring run</p>
            </div>
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs shrink-0" onClick={onImportJob}>
              <Plus className="w-3.5 h-3.5 mr-1" aria-hidden />
              Import
            </Button>
          </header>
          <div className="th-hub-panel__body">
            {jobsLoading ? (
              <p className="th-hub-empty">Loading saved jobs…</p>
            ) : showSavedJobsEmpty ? (
              <div className="th-hub-empty-block">
                <p className="text-sm font-medium text-foreground">No saved jobs yet</p>
                <p className="text-xs text-muted-foreground mt-1">Import a LinkedIn, Indeed, or careers URL to build your library.</p>
                <Button type="button" size="sm" className="mt-3 h-8 rounded-lg text-xs" onClick={onImportJob}>
                  Import job posting
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
              <h3 className="th-hub-panel__title">Recent tailoring</h3>
              <p className="th-hub-panel__subtitle">Jump back into results and compare scores</p>
            </div>
          </header>
          <div className="th-hub-panel__body">
            {historyLoading ? (
              <p className="th-hub-empty">Loading history…</p>
            ) : history.length === 0 ? (
              <div className="th-hub-empty-block">
                <p className="text-sm font-medium text-foreground">No tailoring history yet</p>
                <p className="text-xs text-muted-foreground mt-1">Your completed sessions and match scores will appear here.</p>
                <Button type="button" size="sm" variant="outline" className="mt-3 h-8 rounded-lg text-xs" onClick={handleStart}>
                  Start tailoring
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
            <h3 className="th-hub-panel__title">Tailored CVs</h3>
            <p className="th-hub-panel__subtitle">
              {tailoredResumes.length > 0
                ? `${tailoredResumes.length} resume${tailoredResumes.length !== 1 ? 's' : ''} linked to saved roles`
                : 'Resume versions generated for specific job postings'}
            </p>
          </div>
        </header>
        <div className="th-hub-panel__body">
          {resumesLoading ? (
            <p className="th-hub-empty">Loading tailored resumes…</p>
          ) : tailoredResumes.length === 0 ? (
            <div className="th-hub-empty-block">
              <p className="text-sm font-medium text-foreground">No tailored CVs yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Start a session to generate a job-specific version of your resume.
              </p>
            </div>
          ) : (
            <div className="th-hub-list th-hub-list--grid">
              {tailoredResumes.slice(0, 8).map((resume) => {
                const meta = historyByResumeId.get(resume.$id);
                const jobLabel = meta
                  ? `${meta.jobTitle}${meta.company ? ` @ ${meta.company}` : ''}`
                  : undefined;
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
