import { useState } from 'react';
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
  RefreshCw,
  Clock,
  Sparkles,
  Layers,
  Sparkle,
} from 'lucide-react';
import { useRemoteJobs } from '@/hooks/useRemoteJobs';
import {
  type NormalizedRemoteJob,
  type JobSource,
  type RoleGroup,
  ROLE_GROUPS,
} from '@/lib/remoteJobsFeed';
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
  const [selectedRoleGroup, setSelectedRoleGroup] = useState<RoleGroup | 'all'>('all');
  const [confirmingAppliedJobId, setConfirmingAppliedJobId] = useState<string | null>(null);

  const {
    jobs,
    userActions,
    total,
    isLoading,
    isSynced,
    lastSyncedAt,
    roleGroupCounts,
    error,
    refetch,
    trackAction,
  } = useRemoteJobs({
    source: selectedSource,
    roleGroup: selectedRoleGroup,
    query: searchQuery,
    limit: 50,
  });

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
      case 'remoteok':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium">Remote OK</Badge>;
      case 'arbeitnow':
        return <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-medium">Arbeitnow</Badge>;
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

  const formatLastSynced = (dateStr?: string | null) => {
    if (!dateStr) return 'Not yet synced';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString(isRtl ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }) + ', ' +
        d.toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Unknown';
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
            {t('remoteJobs.subtitle', 'Discover entry-level, customer support, data entry, marketing, sales, writing, and tech opportunities from verified remote sources.')}
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

      {/* Freshness & Sources Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/5 dark:bg-slate-100/5 border border-border/60 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <Clock className="w-3.5 h-3.5 text-[#9E1B22]" />
            Last updated: {formatLastSynced(lastSyncedAt)}
          </span>
          <span className="hidden md:inline text-border">•</span>
          <span>New jobs are synced every 6 hours</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="text-muted-foreground">Sources:</span>
          <span className="font-semibold text-foreground">Remotive, WWR, Jobicy, Remote OK, Arbeitnow</span>
        </div>
      </div>

      {/* Role Group Pills Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#9E1B22]" />
            Role Categories ({total} remote jobs available)
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {ROLE_GROUPS.map(group => {
            const count = group.id === 'all' ? total : (roleGroupCounts?.get(group.id) || 0);
            const isSelected = selectedRoleGroup === group.id;

            return (
              <button
                key={group.id}
                onClick={() => setSelectedRoleGroup(group.id as RoleGroup | 'all')}
                className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-[#9E1B22] text-white shadow-sm'
                    : 'bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {group.id === 'easy_entry_level' && <Sparkle className="w-3 h-3 text-amber-300 fill-amber-300" />}
                <span>{group.label}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-background/80 text-muted-foreground'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('remoteJobs.searchPlaceholder', 'Search by job title, company, or keywords...')}
            className="pl-9 bg-background"
          />
        </div>

        {/* Source Dropdown Filter */}
        <select
          value={selectedSource}
          onChange={e => setSelectedSource(e.target.value as JobSource | 'all')}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All Sources</option>
          <option value="remotive">Remotive</option>
          <option value="weworkremotely">We Work Remotely</option>
          <option value="jobicy">Jobicy</option>
          <option value="remoteok">Remote OK</option>
          <option value="arbeitnow">Arbeitnow</option>
        </select>
      </div>

      {/* Content State Handling */}
      {!isSynced && !isLoading && (
        <div className="p-8 text-center rounded-2xl border border-dashed border-border/80 bg-card space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {t('remoteJobs.unsyncedTitle', 'Jobs feed is not synced yet')}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {t('remoteJobs.unsyncedDesc', 'The Appwrite serverless job ingestion engine is setting up. Jobs will appear automatically after the initial feed sync.')}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-card border border-border/60 animate-pulse p-5 space-y-4">
              <div className="h-6 w-3/4 bg-muted rounded" />
              <div className="h-4 w-1/2 bg-muted rounded" />
              <div className="h-12 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : jobs.length === 0 && isSynced ? (
        <div className="p-12 text-center rounded-2xl border border-border/60 bg-card space-y-3">
          <Briefcase className="w-8 h-8 text-muted-foreground mx-auto" />
          <h3 className="text-base font-semibold text-foreground">
            {t('remoteJobs.noJobsFound', 'No remote jobs found matching your filters')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('remoteJobs.tryChangingFilters', 'Try selecting another role category or clearing your search query.')}
          </p>
          <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setSelectedSource('all'); setSelectedRoleGroup('all'); }}>
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map(job => {
            const itemId = job.$id || job.dedupe_key;
            const action = userActions.get(itemId);
            const isSaved = action?.status === 'saved';
            const isApplied = action?.status === 'applied';
            const formattedDate = formatDate(job.published_at);
            const isConfirming = confirmingAppliedJobId === itemId;

            return (
              <div
                key={itemId}
                className={`group relative flex flex-col justify-between rounded-xl border p-5 transition-all hover:shadow-md ${
                  isApplied
                    ? 'bg-emerald-500/5 border-emerald-500/30'
                    : 'bg-card border-border/60 hover:border-primary/40'
                }`}
              >
                <div className="space-y-3">
                  {/* Top line: Source badge, Role Group & Date */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {formatSourceBadge(job.source)}
                      {job.role_group === 'easy_entry_level' && (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 font-medium">
                          Easy / Entry Level
                        </Badge>
                      )}
                      {job.category && (
                        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {job.category}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {formattedDate && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formattedDate}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 ${isSaved ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`}
                        onClick={() => void handleToggleSave(job, isSaved)}
                        title={isSaved ? 'Remove from saved' : 'Save job'}
                      >
                        <Bookmark className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Job title & company */}
                  <div>
                    <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {job.title}
                    </h2>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                      {job.company}
                    </p>
                  </div>

                  {/* Location & Salary Info */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium pt-1">
                    <span className="flex items-center gap-1 bg-secondary/60 px-2 py-1 rounded-md">
                      <MapPin className="w-3 h-3 text-primary shrink-0" />
                      {job.location || job.remote_region || 'Remote'}
                    </span>

                    <span className={`flex items-center gap-1 px-2 py-1 rounded-md ${
                      job.salary_display && job.salary_display !== 'Salary not listed'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold'
                        : 'bg-secondary/60 text-muted-foreground'
                    }`}>
                      <DollarSign className="w-3 h-3 shrink-0" />
                      {job.salary_display || 'Salary not listed'}
                    </span>
                  </div>

                  {/* Description Excerpt */}
                  {job.description_excerpt && (
                    <p className="text-xs text-muted-foreground/90 line-clamp-3 leading-relaxed border-t border-border/40 pt-2.5">
                      {job.description_excerpt}
                    </p>
                  )}
                </div>

                {/* Actions Bar */}
                <div className="pt-4 mt-4 border-t border-border/60 space-y-2">
                  {/* Inline Confirmation Prompt if applied link was clicked */}
                  {isConfirming && (
                    <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-1">
                      <span className="text-xs font-semibold text-[#9E1B22] flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Did you apply on their site?
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-xs bg-[#9E1B22] text-white hover:bg-[#80141a]"
                          onClick={() => void handleMarkApplied(job)}
                        >
                          Yes, mark applied
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => setConfirmingAppliedJobId(null)}
                        >
                          Not yet
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleApplyClick(job)}
                      className="bg-[#9E1B22] hover:bg-[#80141a] text-white gap-1.5 text-xs font-medium"
                    >
                      {isApplied ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Already applied
                        </>
                      ) : (
                        <>
                          Apply on website
                          <ExternalLink className="w-3.5 h-3.5" />
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTailorClick(job)}
                      className="gap-1.5 text-xs font-medium text-foreground hover:border-primary/50"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-[#9E1B22]" />
                      Tailor my resume
                    </Button>
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
