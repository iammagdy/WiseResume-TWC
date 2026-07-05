import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Briefcase,
  Search,
  ExternalLink,
  Wand2,
  Bookmark,
  CheckCircle2,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  Tag,
  Filter,
  RefreshCw,
  XCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useRemoteJobs } from '@/hooks/useRemoteJobs';
import { type NormalizedRemoteJob, type JobSource } from '@/lib/remoteJobsFeed';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function RemoteJobsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRtl = i18n.language === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<JobSource | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [confirmingAppliedJobId, setConfirmingAppliedJobId] = useState<string | null>(null);

  const { jobs, userActions, isLoading, isSynced, error, refetch, trackAction } = useRemoteJobs({
    source: selectedSource,
    category: selectedCategory,
    query: searchQuery,
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const j of jobs) {
      if (j.category) set.add(j.category);
    }
    return Array.from(set).sort();
  }, [jobs]);

  const handleApplyClick = (job: NormalizedRemoteJob) => {
    if (job.apply_url) {
      window.open(job.apply_url, '_blank', 'noopener,noreferrer');
      setConfirmingAppliedJobId(job.$id || job.dedupe_key);
    }
  };

  const handleMarkApplied = async (job: NormalizedRemoteJob) => {
    const res = await trackAction(job, 'mark_applied');
    setConfirmingAppliedJobId(null);
    if (res.ok) {
      toast.success(t('remoteJobs.alreadyApplied', 'Marked as applied!'));
    } else {
      toast.error(res.error || 'Failed to update status');
    }
  };

  const handleToggleSave = async (job: NormalizedRemoteJob, isCurrentlySaved: boolean) => {
    const action = isCurrentlySaved ? 'undo' : 'save';
    const res = await trackAction(job, action);
    if (res.ok) {
      toast.success(isCurrentlySaved ? 'Removed from saved jobs' : 'Job saved!');
    } else {
      toast.error(res.error || 'Failed to update save status');
    }
  };

  const handleDismiss = async (job: NormalizedRemoteJob) => {
    const res = await trackAction(job, 'dismiss');
    if (res.ok) {
      toast.info('Job dismissed');
    }
  };

  const handleTailorClick = (job: NormalizedRemoteJob) => {
    const desc = job.description_html || job.description_excerpt || `${job.title} at ${job.company}`;
    const targetUrl = `/tailoring-hub?job=${encodeURIComponent(desc)}&title=${encodeURIComponent(job.title)}&company=${encodeURIComponent(job.company)}&url=${encodeURIComponent(job.apply_url)}`;
    navigate(targetUrl);
  };

  const formatSourceBadge = (source: JobSource) => {
    switch (source) {
      case 'remotive':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">Remotive</Badge>;
      case 'weworkremotely':
        return <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 font-medium">We Work Remotely</Badge>;
      case 'jobicy':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-medium">Jobicy</Badge>;
      default:
        return <Badge variant="outline">{source}</Badge>;
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="min-h-full bg-background/50 p-4 md:p-8 space-y-6 max-w-7xl mx-auto" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Briefcase className="w-6 h-6 text-[#9E1B22]" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {t('remoteJobs.title', 'Remote Jobs Feed')}
            </h1>
            <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5 bg-primary/10 text-[#9E1B22] border-none">
              MVP
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {t('remoteJobs.subtitle', 'Discover verified remote opportunities aggregated from official remote job feeds.')}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isLoading}
          className="self-start md:self-auto gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          {t('common.refresh', 'Refresh')}
        </Button>
      </div>

      {/* Filter and Search controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
            <Input
              type="text"
              placeholder={t('remoteJobs.searchPlaceholder', 'Search by job title, company, or keyword...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rtl:pr-9 rtl:pl-3 bg-card"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">{t('remoteJobs.categoryFilter', 'All Categories')}</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Source filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-muted-foreground mr-1 shrink-0" />
          {[
            { id: 'all', label: t('remoteJobs.sourceFilter', 'All Sources') },
            { id: 'remotive', label: 'Remotive' },
            { id: 'weworkremotely', label: 'We Work Remotely' },
            { id: 'jobicy', label: 'Jobicy' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSource(s.id as JobSource | 'all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                selectedSource === s.id
                  ? 'bg-[#9E1B22] text-white shadow-sm'
                  : 'bg-card border border-border text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="rounded-2xl border border-border bg-card p-6 space-y-4 animate-pulse">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-2 flex-1">
                  <div className="h-6 w-1/3 bg-muted rounded-md" />
                  <div className="h-4 w-1/4 bg-muted rounded-md" />
                </div>
                <div className="h-6 w-20 bg-muted rounded-full" />
              </div>
              <div className="h-12 w-full bg-muted rounded-md" />
              <div className="flex gap-2 pt-2">
                <div className="h-9 w-32 bg-muted rounded-lg" />
                <div className="h-9 w-40 bg-muted rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : !isSynced && jobs.length === 0 ? (
        /* Unsynced state */
        <div className="rounded-2xl border border-border bg-card/60 p-12 text-center space-y-4 max-w-lg mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {t('remoteJobs.unsyncedTitle', 'Jobs feed is not synced yet.')}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t(
              'remoteJobs.unsyncedSubtitle',
              'Remote job feeds are periodically aggregated server-side. Check back shortly for updated listings.',
            )}
          </p>
        </div>
      ) : jobs.length === 0 ? (
        /* Empty state */
        <div className="rounded-2xl border border-border bg-card/60 p-12 text-center space-y-4 max-w-lg mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-muted text-muted-foreground mx-auto flex items-center justify-center">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {t('remoteJobs.emptyTitle', 'No remote jobs found')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('remoteJobs.emptySubtitle', 'Try adjusting your search keywords or clearing source filters.')}
          </p>
        </div>
      ) : (
        /* Jobs List */
        <div className="grid grid-cols-1 gap-4">
          {jobs.map((job) => {
            const jobId = job.$id || job.dedupe_key;
            const action = userActions.get(jobId);
            const isApplied = action?.status === 'applied';
            const isSaved = action?.status === 'saved';
            const isDismissed = action?.status === 'dismissed';
            const isConfirming = confirmingAppliedJobId === jobId;

            if (isDismissed) return null;

            return (
              <div
                key={jobId}
                className={`group rounded-2xl border transition-all duration-200 bg-card hover:shadow-md ${
                  isApplied ? 'border-emerald-500/30 bg-emerald-500/[0.02]' : 'border-border hover:border-primary/30'
                }`}
              >
                <div className="p-5 md:p-6 space-y-4">
                  {/* Card Top Row */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {job.title}
                        </h2>
                        {formatSourceBadge(job.source)}
                        {isApplied && (
                          <Badge className="bg-emerald-600 text-white gap-1 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t('remoteJobs.alreadyApplied', 'Already applied')}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium text-foreground/80">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          {job.company}
                        </span>
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {job.location}
                          </span>
                        )}
                        {job.published_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(job.published_at)}
                          </span>
                        )}
                        {(job.salary_min || job.salary_max) && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <DollarSign className="w-3.5 h-3.5" />
                            {job.salary_min && job.salary_max
                              ? `${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()} ${job.salary_currency || ''}`
                              : `${(job.salary_min || job.salary_max)?.toLocaleString()} ${job.salary_currency || ''}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick action icons */}
                    <div className="flex items-center gap-1.5 self-end sm:self-start">
                      <button
                        onClick={() => void handleToggleSave(job, Boolean(isSaved))}
                        title={isSaved ? 'Remove save' : 'Save job'}
                        className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                          isSaved
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={() => void handleDismiss(job)}
                        title="Dismiss job"
                        className="p-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent hover:text-destructive transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Excerpt */}
                  {job.description_excerpt && (
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {job.description_excerpt}
                    </p>
                  )}

                  {/* Category / Tags */}
                  {job.tags && job.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {job.tags.slice(0, 5).map((tag, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-secondary text-secondary-foreground">
                          <Tag className="w-3 h-3 text-muted-foreground" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Inline "Did you apply?" prompt banner */}
                  {isConfirming && (
                    <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#9E1B22]" />
                        <span className="text-xs font-semibold text-foreground">
                          {t('remoteJobs.didYouApply', 'Did you apply on their website?')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                          size="sm"
                          onClick={() => void handleMarkApplied(job)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 flex-1 sm:flex-initial"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t('remoteJobs.markApplied', 'Yes, mark as applied')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmingAppliedJobId(null)}
                          className="text-xs text-muted-foreground flex-1 sm:flex-initial"
                        >
                          {t('remoteJobs.notYet', 'Not yet')}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Bottom Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApplyClick(job)}
                        className="bg-[#9E1B22] hover:bg-[#80161B] text-white gap-1.5 text-xs font-semibold shadow-sm"
                      >
                        {t('remoteJobs.applyButton', 'Apply on website')}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTailorClick(job)}
                        className="gap-1.5 text-xs font-medium border-border hover:bg-accent"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-[#9E1B22]" />
                        {t('remoteJobs.tailorResume', 'Tailor my resume for this job')}
                      </Button>
                    </div>

                    <div className="text-[11px] text-muted-foreground italic">
                      Via {job.source === 'remotive' ? 'Remotive API' : job.source === 'weworkremotely' ? 'We Work Remotely' : 'Jobicy API'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
