import { useState, useCallback, useMemo, useDeferredValue, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, Navigate } from 'react-router-dom';
import { Plus, Bell, BarChart3, Briefcase, FileText, Search, MapPin, Building2, Calendar, Mic, Mail, Scissors, CheckCircle2, FlaskConical, Zap, Wand2, BookOpen, LayoutGrid, List } from 'lucide-react';
import { useJobApplications, useJobApplicationMutations, ApplicationStatus } from '@/hooks/useJobApplications';
import { useJobs, useJobMutations, Job } from '@/hooks/useJobs';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { useJobActivityStats } from '@/hooks/useJobActivityStats';
import { useAuth } from '@/hooks/useAuth';
import { useResumes, dbToResumeData } from '@/hooks/useResumes';
import { usePlan } from '@/hooks/usePlan';
import { UpgradeWall } from '@/components/plan/UpgradeWall';
import { useResumeStore } from '@/store/resumeStore';
import { JobActivityStatsCard } from '@/components/applications/JobActivityStats';
import { ActivityTimeline } from '@/components/applications/ActivityTimeline';
import { ActivityStreak } from '@/components/applications/ActivityStreak';

import { AddApplicationSheet } from '@/components/applications/AddApplicationSheet';
import { QuickAddSheet } from '@/components/applications/QuickAddSheet';
import { ResumeListSheet } from '@/components/applications/ResumeListSheet';
import { JobSearchSheet, JobFilters } from '@/components/applications/JobSearchSheet';
import { SaveJobSheet } from '@/components/applications/SaveJobSheet';
import { JobMatchScore } from '@/components/applications/JobMatchScore';
import { StatusFilter } from '@/components/applications/StatusFilter';
import { FollowUpEmailSheet } from '@/components/applications/FollowUpEmailSheet';
import { KanbanBoard } from '@/components/applications/KanbanBoard';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

import { format, isBefore, addDays } from 'date-fns';
import { scoreJobMatch, scoreJobMatchAI, getCachedAIScore, JobMatchResult } from '@/lib/jobMatchScorer';

type TabKey = 'applications' | 'jobs';

const STATUS_BADGE_CLASSES: Record<ApplicationStatus, string> = {
  saved: 'bg-muted/50 text-muted-foreground border-muted',
  applied: 'bg-primary/10 text-primary border-primary/30',
  screening: 'bg-warning/10 text-warning border-warning/30',
  interviewing: 'bg-accent/20 text-accent-foreground border-accent/30',
  offer: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30'
};

function JobCard({ job, onClick, matchScore, onTailor, onMarkApplied }: {job: Job;onClick: () => void;matchScore: JobMatchResult | null;onTailor: () => void;onMarkApplied: () => void;}) {
  return (
    <div className="bg-card border border-border shadow-soft-sm rounded-2xl p-4 space-y-2">
      <button
        onClick={onClick}
        className="flex items-start gap-3 w-full text-left">
        
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Briefcase className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" title={job.title}>{job.title}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Building2 className="w-3 h-3" />
            <span className="truncate">{job.company}</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {job.location &&
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                <MapPin className="w-3 h-3" /> {job.location}
              </span>
            }
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{job.job_type}</Badge>
            {job.salary_range &&
            <span className="text-[11px] text-muted-foreground">{job.salary_range}</span>
            }
          </div>
        </div>
        <JobMatchScore score={matchScore} jobTitle={job.title} />
      </button>
      {/* Action buttons */}
      <div className="flex gap-2 pl-[52px]">
        <button
          onClick={(e) => {e.stopPropagation();haptics.light();onTailor();}}
          className="flex items-center gap-1 text-[11px] text-primary font-medium px-2 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/15 transition-colors min-h-[44px] touch-manipulation active:scale-95">
          
          <Scissors className="w-3 h-3" /> Tailor Resume
        </button>
        <button
          onClick={(e) => {e.stopPropagation();haptics.light();onMarkApplied();}}
          className="flex items-center gap-1 text-[11px] text-success font-medium px-2 py-1.5 rounded-lg bg-success/10 hover:bg-success/15 transition-colors min-h-[44px] touch-manipulation active:scale-95">
          
          <CheckCircle2 className="w-3 h-3" /> Mark Applied
        </button>
      </div>
    </div>);

}

export default function ApplicationsPage() {
  const { createApplication } = useJobApplicationMutations();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro, isLoading: planLoading } = usePlan();
  const queryClient = useQueryClient();
  const stats = useJobActivityStats();
  const [activeTab, setActiveTab] = useState<TabKey>('applications');
  const [showAdd, setShowAdd] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSaveJob, setShowSaveJob] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [view, setView] = useState<'list' | 'board'>(
    () => (localStorage.getItem('activity-view') as 'list' | 'board') || 'list',
  );
  const [followUpApp, setFollowUpApp] = useState<{company: string;jobTitle: string;} | null>(null);
  const [filters, setFilters] = useState<JobFilters>({ query: '', jobTypes: [], location: '' });
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: jobs = [] } = useJobs();
  const { createJob } = useJobMutations();
  const [isSeeding, setIsSeeding] = useState(false);
  const [showSampleJobsPreview, setShowSampleJobsPreview] = useState(false);
  const { data: applications = [] } = useJobApplications(statusFilter === 'all' ? undefined : statusFilter);
  const { data: resumes } = useResumes();
  const [resumeListOpen, setResumeListOpen] = useState(false);
  const [resumeListFilter, setResumeListFilter] = useState<'originals' | 'tailored'>('originals');

  // Derive status counts from existing applications data — no extra network round-trip
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const app of applications) {
      counts[app.status] = (counts[app.status] || 0) + 1;
    }
    return counts;
  }, [applications]);

  // Get primary resume for match scoring
  const primaryResume = useMemo(() => {
    const primary = resumes?.find((r) => r.is_primary) || resumes?.[0];
    return primary ? dbToResumeData(primary) : null;
  }, [resumes]);

  // Compute heuristic match scores (instant)
  const heuristicScores = useMemo(() => {
    if (!primaryResume) return {};
    const scores: Record<string, JobMatchResult> = {};
    for (const job of jobs) {
      scores[job.id] = scoreJobMatch(primaryResume, job);
    }
    return scores;
  }, [primaryResume, jobs]);

  // AI scores state — overlays heuristic when available
  const [aiScores, setAiScores] = useState<Record<string, JobMatchResult>>({});
  const aiScoringRan = useRef(false);

  // Fire background AI scoring for visible jobs (once per mount/resume change)
  useEffect(() => {
    if (!primaryResume || jobs.length === 0 || activeTab !== 'jobs') return;
    const primaryResumeRaw = resumes?.find((r) => r.is_primary) || resumes?.[0];
    if (!primaryResumeRaw) return;

    // Reset flag when resume changes
    aiScoringRan.current = false;

    // Pre-fill from cache
    const fromCache: Record<string, JobMatchResult> = {};
    for (const job of jobs) {
      const cached = getCachedAIScore(primaryResumeRaw.id, job.id);
      if (cached) fromCache[job.id] = cached;
    }
    if (Object.keys(fromCache).length > 0) setAiScores(fromCache);

    // Score uncached jobs in background (max 5 concurrent to avoid rate limits)
    const uncached = jobs.filter((j) => !fromCache[j.id]);
    if (uncached.length === 0 || aiScoringRan.current) return;
    aiScoringRan.current = true;

    let cancelled = false;
    (async () => {
      for (let i = 0; i < uncached.length && !cancelled; i++) {
        const job = uncached[i];
        const result = await scoreJobMatchAI(primaryResume, job, primaryResumeRaw.id);
        if (result && !cancelled) {
          setAiScores((prev) => ({ ...prev, [job.id]: result }));
        }
      }
    })();

    return () => {cancelled = true;};
  }, [primaryResume, jobs, resumes, activeTab]);

  // Merged scores: AI overrides heuristic when available
  const matchScores = useMemo(() => {
    const merged: Record<string, JobMatchResult> = { ...heuristicScores };
    for (const [id, score] of Object.entries(aiScores)) {
      merged[id] = score;
    }
    return merged;
  }, [heuristicScores, aiScores]);

  const deferredQuery = useDeferredValue(filters.query);

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (deferredQuery) {
        const q = deferredQuery.toLowerCase();
        if (!job.title.toLowerCase().includes(q) && !job.company.toLowerCase().includes(q)) return false;
      }
      if (filters.jobTypes.length > 0) {
        if (!filters.jobTypes.some((t) => t.toLowerCase() === job.job_type.toLowerCase())) return false;
      }
      if (filters.location) {
        if (!job.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
      }
      return true;
    });
  }, [jobs, deferredQuery, filters.jobTypes, filters.location]);

  const handleViewChange = useCallback((v: 'list' | 'board') => {
    haptics.selection();
    setView(v);
    localStorage.setItem('activity-view', v);
  }, []);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['job-activity-stats'] });
    await queryClient.invalidateQueries({ queryKey: ['activity-timeline'] });
    await queryClient.invalidateQueries({ queryKey: ['jobs'] });
    await queryClient.invalidateQueries({ queryKey: ['job-applications'] });
    haptics.success();
    toast.success('Activity refreshed');
  }, [queryClient]);

  // Auth guard handled by ProtectedRoute

  const TABS: {key: TabKey;label: string;}[] = [
  { key: 'applications', label: 'My Applications' },
  { key: 'jobs', label: 'Saved Jobs' }];


  const hasActiveFilters = filters.query || filters.jobTypes.length > 0 || filters.location;

  // Feature gate: Application Tracker is Pro+
  if (planLoading) return null;
  if (!isPro) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <UpgradeWall
          requiredPlan="pro"
          featureName="Application Tracker"
          description="Track all your job applications in one place with status updates and activity insights."
          features={[
            'Pipeline view: Applied → Screening → Offer',
            'Resume match rate for saved jobs',
            'Activity streak & application stats',
            'Follow-up reminders & email drafts',
            'Saved jobs with AI match scores',
          ]}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 pb-4">
      {/* Header */}
      <header className="shrink-0 sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between lg:max-w-none mx-auto w-full">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h1 className="text-page-title">My Activity</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {haptics.light();setShowSearch(true);}}
              className={`relative p-2.5 rounded-xl hover:bg-muted/50 transition-all touch-manipulation ${hasActiveFilters ? 'text-primary' : 'text-muted-foreground'}`}
              aria-label="Search jobs">
              
              <Search className="w-5 h-5" />
              {hasActiveFilters &&
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
              }
            </button>
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2.5 rounded-xl hover:bg-muted/50 text-muted-foreground transition-all touch-manipulation"
              aria-label="Notifications">
              
              <Bell className="w-5 h-5" />
              {unreadCount > 0 &&
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              }
            </button>
          </div>
        </div>
      </header>

      {/* All scrollable content inside PullToRefresh */}
      <PullToRefresh onRefresh={handleRefresh} className="flex-1">
        <div className="px-4 py-4 space-y-4 lg:max-w-none mx-auto w-full">
          {/* Premium Tab Bar */}
          <div className="rounded-2xl bg-muted/50 p-1 flex gap-1 -mt-2">
            {TABS.map((t) =>
            <button
              key={t.key}
              onClick={() => {haptics.selection();setActiveTab(t.key);}}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] flex-1 touch-manipulation active:scale-95 ${
              activeTab === t.key ? 'bg-background text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'}`
              }>
              
                {t.label}
              </button>
            )}
          </div>
          {activeTab === 'applications' ?
          <>
              {/* View toggle row */}
              <div className="flex items-center gap-2">
                {view === 'list' ? (
                  <div className="flex-1 min-w-0">
                    <StatusFilter value={statusFilter} onChange={setStatusFilter} counts={statusCounts} />
                  </div>
                ) : (
                  <div className="flex-1" />
                )}
                <button
                  onClick={() => { haptics.medium(); setShowQuickAdd(true); }}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold active:scale-95 transition-transform touch-manipulation shrink-0"
                  aria-label="Quick add application"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Quick Add
                </button>
                <div className="flex items-center gap-0.5 bg-muted/60 border border-border rounded-xl p-1 shrink-0">
                  <button
                    onClick={() => handleViewChange('list')}
                    aria-label="List view"
                    className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-medium transition-all touch-manipulation ${view === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <List className="w-3.5 h-3.5" />
                    List
                  </button>
                  <button
                    onClick={() => handleViewChange('board')}
                    aria-label="Board view"
                    className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-medium transition-all touch-manipulation ${view === 'board' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Board
                  </button>
                </div>
              </div>

              {/* Board view */}
              {view === 'board' ? (
                <KanbanBoard />
              ) : (
              <>
              {/* Streak */}
              <ActivityStreak />

              {/* Stats - show above cards when meaningful */}
              {(stats.applicationsSubmitted > 0 || stats.originals > 0) && <JobActivityStatsCard
              stats={stats}
              onOriginalsTap={() => {
                setResumeListFilter('originals');
                setResumeListOpen(true);
              }}
              onTailoredTap={() => {
                setResumeListFilter('tailored');
                setResumeListOpen(true);
              }} />
            }

              {/* Recent Activity — primary content, always visible */}
              <div id="activity-timeline">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-primary" />
                  <h2 className="text-sm font-semibold">Recent Activity</h2>
                </div>
                <ActivityTimeline />
              </div>

              {/* Application Cards */}
              {applications.length > 0 ?
            <div className="space-y-2">
                  <h2 className="text-sm font-semibold text-muted-foreground">Applications</h2>
                  {applications.map((app) => {
                const isInterviewing = app.status === 'interviewing' || app.status === 'screening';
                const remindDue = app.remind_at && isBefore(new Date(app.remind_at), addDays(new Date(), 1));
                const deadlineSoon = app.deadline && !isInterviewing && isBefore(new Date(app.deadline), addDays(new Date(), 3)) && !isBefore(new Date(app.deadline), new Date());
                return (
                  <div
                    key={app.id}
                    className="bg-card border border-border shadow-soft-sm rounded-2xl p-4 space-y-2">
                    
                        <button
                      onClick={() => navigate(`/application/${app.id}`)}
                      className="flex items-start gap-3 w-full text-left">
                      
                          <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-secondary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" title={app.job_title}>{app.job_title}</p>
                            <p className="text-xs text-muted-foreground truncate">{app.company}</p>
                            {app.applied_at &&
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3" />
                                Applied {format(new Date(app.applied_at), 'MMM d, yyyy')}
                              </p>
                        }
                            {app.deadline && isInterviewing &&
                        <p className="text-[11px] text-primary flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3" />
                                Interview: {format(new Date(app.deadline), 'MMM d, h:mm a')}
                              </p>
                        }
                            {deadlineSoon &&
                        <Badge variant="secondary" className="text-[10px] mt-1 bg-destructive/15 text-destructive border-destructive/30">
                                Deadline soon
                              </Badge>
                        }
                            {remindDue &&
                        <Badge variant="secondary" className="text-[10px] mt-1 bg-warning/15 text-warning border-warning/30">
                                Follow-up due
                              </Badge>
                        }
                          </div>
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${STATUS_BADGE_CLASSES[app.status as ApplicationStatus] || ''}`}>{app.status}</Badge>
                        </button>

                        {/* Action buttons */}
                        <div className="flex gap-2 pl-[52px]">
                          {isInterviewing &&
                      <button
                        onClick={() => {
                          haptics.light();
                          if (!primaryResume || !primaryResume.contactInfo?.fullName) {
                            toast.error('Please select or create a resume first to start interview prep.');
                          } else {
                            navigate('/interview');
                          }
                        }}
                        className="flex items-center gap-1 text-[11px] text-primary font-medium px-2 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/15 transition-colors min-h-[44px] touch-manipulation active:scale-95">
                        
                              <Mic className="w-3 h-3" /> Prep
                            </button>
                      }
                          <button
                        onClick={() => {haptics.light();setFollowUpApp({ company: app.company, jobTitle: app.job_title });}}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium px-2 py-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors min-h-[44px] touch-manipulation active:scale-95">
                        
                            <Mail className="w-3 h-3" /> Follow-up
                          </button>
                        </div>
                      </div>);

              })}
                </div> :

            statusFilter === 'all' ? (
            /* Guided empty state for first-time users */
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-md">
                      <FileText className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-base font-semibold mb-1">Add your first application</h3>
                    <p className="text-sm text-muted-foreground mb-2 max-w-[260px]">
                      Track every job you apply to — stay organized and never miss a follow-up.
                    </p>
                    <p className="text-xs text-muted-foreground mb-6 max-w-[260px]">
                      Start with company name, role, and status. Takes under 5 seconds.
                    </p>
                    <div className="flex flex-col gap-3 w-full max-w-[260px]">
                      <button
                  onClick={() => {haptics.medium();setShowQuickAdd(true);}}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl gradient-primary text-primary-foreground text-sm font-semibold min-h-[44px] touch-manipulation active:scale-95 shadow-md">
                  
                          <Zap className="w-4 h-4" /> Quick Add
                        </button>
                      <button
                  onClick={() => {haptics.light();setShowAdd(true);}}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-muted text-foreground text-sm font-medium min-h-[44px] touch-manipulation active:scale-95">
                  
                          <Plus className="w-4 h-4" /> Full Form
                        </button>
                    </div>
                  </div>) : (

            /* Compact empty state for filtered view */
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">No {statusFilter} applications</p>
                      <p className="text-xs text-muted-foreground">Try a different filter</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                  onClick={() => {haptics.light();setStatusFilter('all');}}
                  className="px-3 py-2 rounded-full bg-muted text-foreground text-xs font-medium min-h-[44px] touch-manipulation active:scale-95">
                  
                        Show All
                      </button>
                      <button
                  onClick={() => {haptics.light();setShowQuickAdd(true);}}
                  className="px-3 py-2 rounded-full bg-primary/10 text-primary text-xs font-medium min-h-[44px] touch-manipulation active:scale-95">
                  
                        + Add
                      </button>
                    </div>
                  </div>)

            }

            </>
              )}

            </> :

          <>
              {/* Jobs List */}
              {filteredJobs.length > 0 ?
            <div className="space-y-2">
                  {filteredJobs.map((job) =>
              <JobCard
                key={job.id}
                job={job}
                onClick={() => navigate(`/job/${job.id}`)}
                matchScore={matchScores[job.id] || null}
                onTailor={() => {
                  // Store job description in Zustand so TailorSheet picks it up
                  const { setJobDescription } = useResumeStore.getState();
                  setJobDescription(job.description || '');
                  navigate(`/editor?tailor=true&jobTitle=${encodeURIComponent(job.title)}&company=${encodeURIComponent(job.company)}`);
                }}
                onMarkApplied={() => {
                  createApplication.mutate({
                    job_title: job.title,
                    company: job.company,
                    status: 'applied',
                    url: job.source_url || undefined
                  }, {
                    onSuccess: () => {
                      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
                      queryClient.invalidateQueries({ queryKey: ['job-activity-stats'] });
                      queryClient.invalidateQueries({ queryKey: ['activity-timeline'] });
                      setActiveTab('applications');
                      haptics.success();
                    }
                  });
                }} />

              )}
                </div> :

            hasActiveFilters ? (
            <div className="items-center justify-center text-muted-foreground py-[30px] my-[50px] flex flex-col">
                  <Briefcase className="w-12 h-12 mb-3 opacity-30" />
                  <p className="font-medium">No jobs match filters</p>
                  <p className="text-sm mt-1">Try adjusting your filters</p>
                </div>) : (

            /* Informative empty state for Saved Jobs */
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-md">
                    <Briefcase className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">No saved jobs yet</h3>
                  <p className="text-sm text-muted-foreground mb-1 max-w-[280px]">
                    Jobs you save from the AI Studio or Resume Tailoring flow appear here automatically.
                  </p>
                  <p className="text-xs text-muted-foreground mb-6 max-w-[260px]">
                    You can also save jobs manually or search to find new ones.
                  </p>
                  <div className="flex flex-col gap-3 w-full max-w-[280px]">
                    <button
                  onClick={() => {haptics.medium();navigate('/ai-studio');}}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl gradient-primary text-primary-foreground text-sm font-semibold min-h-[44px] touch-manipulation active:scale-95 shadow-md">
                  
                        <Wand2 className="w-4 h-4" /> Go to AI Studio
                      </button>
                    <button
                  onClick={() => {haptics.light();navigate('/editor?tailor=true');}}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-muted text-foreground text-sm font-medium min-h-[44px] touch-manipulation active:scale-95">
                  
                        <BookOpen className="w-4 h-4" /> Tailor a Resume
                      </button>
                    <div className="flex gap-2 justify-center mt-1">
                      <button
                  onClick={() => {haptics.light();setShowSearch(true);}}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary px-4 py-2.5 rounded-full bg-primary/10 hover:bg-primary/15 transition-colors min-h-[44px] touch-manipulation">
                  
                          <Search className="w-3.5 h-3.5" /> Search Jobs
                        </button>
                      <button
                  onClick={() => {haptics.light();setShowSaveJob(true);}}
                  className="flex items-center gap-1.5 text-xs font-medium text-foreground px-4 py-2.5 rounded-full bg-muted hover:bg-muted/80 transition-colors min-h-[44px] touch-manipulation">
                  
                          <Plus className="w-3.5 h-3.5" /> Add Manually
                        </button>
                    </div>
                    <button
                  onClick={() => { haptics.light(); setShowSampleJobsPreview(true); }}
                  className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground px-4 py-2 rounded-full border border-dashed border-border hover:border-primary/40 hover:text-primary transition-colors min-h-[44px] touch-manipulation">
                        <FlaskConical className="w-3.5 h-3.5" />
                        See Sample Jobs
                      </button>
                  </div>
                </div>)

            }
            </>
          }
        </div>
      </PullToRefresh>

      {/* FAB */}
      {activeTab === 'jobs' &&
      <button
        onClick={() => {haptics.medium();setShowSaveJob(true);}}
        className="fixed bottom-[7.5rem] sm:bottom-20 right-4 pr-safe z-50 w-14 h-14 rounded-full gradient-primary shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Save new job">
        
          <Plus className="w-6 h-6 text-primary-foreground" />
        </button>
      }

      <AddApplicationSheet open={showAdd} onOpenChange={setShowAdd} />
      <QuickAddSheet open={showQuickAdd} onOpenChange={setShowQuickAdd} />
      <ResumeListSheet
        open={resumeListOpen}
        onOpenChange={setResumeListOpen}
        filter={resumeListFilter} />
      
      <JobSearchSheet
        open={showSearch}
        onOpenChange={setShowSearch}
        filters={filters}
        onFiltersChange={setFilters} />
      
      <SaveJobSheet open={showSaveJob} onOpenChange={setShowSaveJob} />
      {followUpApp &&
      <FollowUpEmailSheet
        open={!!followUpApp}
        onOpenChange={(open) => {if (!open) setFollowUpApp(null);}}
        company={followUpApp.company}
        jobTitle={followUpApp.jobTitle} />

      }

      {/* Sample Jobs Preview — demo only, no data is saved */}
      <Dialog open={showSampleJobsPreview} onOpenChange={setShowSampleJobsPreview}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-muted-foreground" />
              Sample Job Listings
            </DialogTitle>
            <DialogDescription>
              These are example job listings to show you what the tracker looks like. Add your own real jobs using "Add Manually" or "Search Jobs" above.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {[
              { title: 'Frontend Engineer', company: 'Example Corp', location: 'Remote', type: 'Full-time', salary: '$90K–$130K' },
              { title: 'Product Designer', company: 'Design Co.', location: 'New York, NY', type: 'Full-time', salary: '$85K–$120K' },
              { title: 'Backend Developer', company: 'Cloud Inc.', location: 'San Francisco, CA', type: 'Contract', salary: '$70–$90/hr' },
              { title: 'Marketing Manager', company: 'Growth Agency', location: 'Chicago, IL', type: 'Full-time', salary: '$75K–$95K' },
              { title: 'Data Analyst Intern', company: 'Analytics LLC', location: 'Remote', type: 'Internship', salary: '$25/hr' },
            ].map((job, i) => (
              <div key={i} className="border border-border rounded-xl p-3 bg-muted/30 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm">{job.title}</p>
                  <Badge variant="outline" className="text-[10px] shrink-0">Demo</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{job.company} · {job.location}</p>
                <p className="text-xs text-muted-foreground">{job.type} · {job.salary}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Ready to track real applications? Use the buttons above to add your own.
          </p>
        </DialogContent>
      </Dialog>
    </div>);

}