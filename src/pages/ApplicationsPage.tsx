import { useState, useCallback, useMemo, useDeferredValue } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, Navigate } from 'react-router-dom';
import { Plus, Bell, BarChart3, Briefcase, FileText, Search, MapPin, Building2, Calendar, Mic, Mail, Scissors, CheckCircle2 } from 'lucide-react';
import { useJobApplications, useJobApplicationMutations, ApplicationStatus } from '@/hooks/useJobApplications';
import { useJobs, Job } from '@/hooks/useJobs';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { useJobActivityStats } from '@/hooks/useJobActivityStats';
import { useAuth } from '@/hooks/useAuth';
import { useResumes, dbToResumeData } from '@/hooks/useResumes';
import { JobActivityStatsCard } from '@/components/applications/JobActivityStats';
import { ActivityTimeline } from '@/components/applications/ActivityTimeline';
import { AddApplicationSheet } from '@/components/applications/AddApplicationSheet';
import { ResumeListSheet } from '@/components/applications/ResumeListSheet';
import { JobSearchSheet, JobFilters } from '@/components/applications/JobSearchSheet';
import { SaveJobSheet } from '@/components/applications/SaveJobSheet';
import { JobMatchScore } from '@/components/applications/JobMatchScore';
import { StatusFilter } from '@/components/applications/StatusFilter';
import { FollowUpEmailSheet } from '@/components/applications/FollowUpEmailSheet';
import { Badge } from '@/components/ui/badge';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { format, isBefore, addDays } from 'date-fns';
import { scoreJobMatch, JobMatchResult } from '@/lib/jobMatchScorer';

type TabKey = 'applications' | 'jobs';

const STATUS_BADGE_CLASSES: Record<ApplicationStatus, string> = {
  saved: 'bg-muted/50 text-muted-foreground border-muted',
  applied: 'bg-primary/10 text-primary border-primary/30',
  screening: 'bg-warning/10 text-warning border-warning/30',
  interviewing: 'bg-accent/20 text-accent-foreground border-accent/30',
  offer: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
};

function JobCard({ job, onClick, matchScore, onTailor, onMarkApplied }: { job: Job; onClick: () => void; matchScore: JobMatchResult | null; onTailor: () => void; onMarkApplied: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-4 space-y-2"
    >
      <button
        onClick={onClick}
        className="flex items-start gap-3 w-full text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Briefcase className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{job.title}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Building2 className="w-3 h-3" />
            <span className="truncate">{job.company}</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {job.location && (
              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                <MapPin className="w-3 h-3" /> {job.location}
              </span>
            )}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{job.job_type}</Badge>
            {job.salary_range && (
              <span className="text-[11px] text-muted-foreground">{job.salary_range}</span>
            )}
          </div>
        </div>
        <JobMatchScore score={matchScore} jobTitle={job.title} />
      </button>
      {/* Action buttons */}
      <div className="flex gap-2 pl-[52px]">
        <button
          onClick={(e) => { e.stopPropagation(); haptics.light(); onTailor(); }}
          className="flex items-center gap-1 text-[11px] text-primary font-medium px-2 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/15 transition-colors min-h-[44px] touch-manipulation active:scale-95"
        >
          <Scissors className="w-3 h-3" /> Tailor Resume
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); haptics.light(); onMarkApplied(); }}
          className="flex items-center gap-1 text-[11px] text-success font-medium px-2 py-1.5 rounded-lg bg-success/10 hover:bg-success/15 transition-colors min-h-[44px] touch-manipulation active:scale-95"
        >
          <CheckCircle2 className="w-3 h-3" /> Mark Applied
        </button>
      </div>
    </motion.div>
  );
}

export default function ApplicationsPage() {
  const { createApplication } = useJobApplicationMutations();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const stats = useJobActivityStats();
  const [activeTab, setActiveTab] = useState<TabKey>('applications');
  const [showAdd, setShowAdd] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSaveJob, setShowSaveJob] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [followUpApp, setFollowUpApp] = useState<{ company: string; jobTitle: string } | null>(null);
  const [filters, setFilters] = useState<JobFilters>({ query: '', jobTypes: [], location: '' });
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: jobs = [] } = useJobs();
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
    const primary = resumes?.find(r => r.is_primary) || resumes?.[0];
    return primary ? dbToResumeData(primary) : null;
  }, [resumes]);

  // Compute match scores
  const matchScores = useMemo(() => {
    if (!primaryResume) return {};
    const scores: Record<string, JobMatchResult> = {};
    for (const job of jobs) {
      scores[job.id] = scoreJobMatch(primaryResume, job);
    }
    return scores;
  }, [primaryResume, jobs]);

  const deferredQuery = useDeferredValue(filters.query);

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (deferredQuery) {
        const q = deferredQuery.toLowerCase();
        if (!job.title.toLowerCase().includes(q) && !job.company.toLowerCase().includes(q)) return false;
      }
      if (filters.jobTypes.length > 0) {
        if (!filters.jobTypes.some(t => t.toLowerCase() === job.job_type.toLowerCase())) return false;
      }
      if (filters.location) {
        if (!job.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
      }
      return true;
    });
  }, [jobs, deferredQuery, filters.jobTypes, filters.location]);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['job-activity-stats'] });
    await queryClient.invalidateQueries({ queryKey: ['activity-timeline'] });
    await queryClient.invalidateQueries({ queryKey: ['jobs'] });
    await queryClient.invalidateQueries({ queryKey: ['job-applications'] });
    haptics.success();
    toast.success('Activity refreshed');
  }, [queryClient]);

  // Auth guard handled by ProtectedRoute

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'applications', label: 'My Applications' },
    { key: 'jobs', label: 'Saved Jobs' },
  ];

  const hasActiveFilters = filters.query || filters.jobTypes.length > 0 || filters.location;

  return (
    <div className="flex-1 flex flex-col min-h-0 pb-4">
      {/* Header */}
      <header className="shrink-0 sticky top-0 z-50 glass border-b border-border px-4 py-3 pt-safe">
        <div className="flex items-center justify-between max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-display font-semibold">My Activity</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { haptics.light(); setShowSearch(true); }}
              className={`relative p-2.5 rounded-xl hover:bg-muted/50 transition-all touch-manipulation ${hasActiveFilters ? 'text-primary' : 'text-muted-foreground'}`}
              aria-label="Search jobs"
            >
              <Search className="w-5 h-5" />
              {hasActiveFilters && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
              )}
            </button>
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2.5 rounded-xl hover:bg-muted/50 text-muted-foreground transition-all touch-manipulation"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* All scrollable content inside PullToRefresh */}
      <PullToRefresh onRefresh={handleRefresh} className="flex-1">
        <div className="px-4 py-4 space-y-6 max-w-3xl mx-auto w-full">
          {/* Tabs */}
          <div className="flex gap-2 w-full -mt-2">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => { haptics.selection(); setActiveTab(t.key); }}
                className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors min-h-[48px] flex-1 ${
                  activeTab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {activeTab === 'applications' ? (
            <>
              {/* Status Filter */}
              <StatusFilter value={statusFilter} onChange={setStatusFilter} counts={statusCounts} />

              {/* Stats - hide when no data at all */}
              {(stats.applicationsSubmitted > 0 || stats.originals > 0) && <JobActivityStatsCard
                stats={stats}
                onOriginalsTap={() => {
                  setResumeListFilter('originals');
                  setResumeListOpen(true);
                }}
                onTailoredTap={() => {
                  setResumeListFilter('tailored');
                  setResumeListOpen(true);
                }}
              />}

              {/* Application Cards */}
              {applications.length > 0 ? (
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold text-muted-foreground">Applications</h2>
                  {applications.map(app => {
                    const isInterviewing = app.status === 'interviewing' || app.status === 'screening';
                    const remindDue = app.remind_at && isBefore(new Date(app.remind_at), addDays(new Date(), 1));
                    const deadlineSoon = app.deadline && !isInterviewing && isBefore(new Date(app.deadline), addDays(new Date(), 3)) && !isBefore(new Date(app.deadline), new Date());
                    return (
                      <motion.div
                        key={app.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-2xl p-4 space-y-2"
                      >
                        <button
                          onClick={() => navigate(`/application/${app.id}`)}
                          className="flex items-start gap-3 w-full text-left"
                        >
                          <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-secondary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{app.job_title}</p>
                            <p className="text-xs text-muted-foreground truncate">{app.company}</p>
                            {app.applied_at && (
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3" />
                                Applied {format(new Date(app.applied_at), 'MMM d, yyyy')}
                              </p>
                            )}
                            {app.deadline && isInterviewing && (
                              <p className="text-[11px] text-primary flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3" />
                                Interview: {format(new Date(app.deadline), 'MMM d, h:mm a')}
                              </p>
                            )}
                            {deadlineSoon && (
                              <Badge variant="secondary" className="text-[10px] mt-1 bg-destructive/15 text-destructive border-destructive/30">
                                Deadline soon
                              </Badge>
                            )}
                            {remindDue && (
                              <Badge variant="secondary" className="text-[10px] mt-1 bg-warning/15 text-warning border-warning/30">
                                Follow-up due
                              </Badge>
                            )}
                          </div>
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${STATUS_BADGE_CLASSES[app.status as ApplicationStatus] || ''}`}>{app.status}</Badge>
                        </button>

                        {/* Action buttons */}
                        <div className="flex gap-2 pl-[52px]">
                          {isInterviewing && (
                            <button
                              onClick={() => { haptics.light(); navigate('/interview'); }}
                              className="flex items-center gap-1 text-[11px] text-primary font-medium px-2 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/15 transition-colors min-h-[44px] touch-manipulation active:scale-95"
                            >
                              <Mic className="w-3 h-3" /> Prep
                            </button>
                          )}
                          <button
                            onClick={() => { haptics.light(); setFollowUpApp({ company: app.company, jobTitle: app.job_title }); }}
                            className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium px-2 py-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors min-h-[44px] touch-manipulation active:scale-95"
                          >
                            <Mail className="w-3 h-3" /> Follow-up
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mb-3 opacity-30" />
                  <p className="font-medium">
                    {statusFilter !== 'all' ? `No ${statusFilter} applications` : 'No applications yet'}
                  </p>
                  <p className="text-sm mt-1 mb-4 text-center px-4">
                    {statusFilter !== 'all' ? 'Try a different filter or add a new application' : 'Start tracking your job applications to stay organized'}
                  </p>
                  <div className="flex gap-3">
                    {statusFilter !== 'all' && (
                      <button
                        onClick={() => { haptics.light(); setStatusFilter('all'); }}
                        className="flex items-center gap-1.5 text-xs font-medium text-foreground px-4 py-2.5 rounded-full bg-muted hover:bg-muted/80 transition-colors min-h-[44px] touch-manipulation active:scale-95"
                      >
                        Show All
                      </button>
                    )}
                    <button
                      onClick={() => { haptics.light(); setShowAdd(true); }}
                      className="flex items-center gap-1.5 text-xs font-medium text-primary px-4 py-2.5 rounded-full bg-primary/10 hover:bg-primary/15 transition-colors min-h-[44px] touch-manipulation active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Application
                    </button>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div id="activity-timeline">
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">Recent Activity</h2>
                <ActivityTimeline />
              </div>

              {/* Add manually */}
              <div className="flex justify-center pt-2 pb-4">
                <button
                  onClick={() => { haptics.medium(); setShowAdd(true); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add application manually
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Jobs List */}
              {filteredJobs.length > 0 ? (
                <div className="space-y-2">
                  {filteredJobs.map(job => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onClick={() => navigate(`/job/${job.id}`)}
                      matchScore={matchScores[job.id] || null}
                      onTailor={() => navigate(`/editor?tailor=true&jobTitle=${encodeURIComponent(job.title)}&company=${encodeURIComponent(job.company)}`)}
                      onMarkApplied={() => {
                        createApplication.mutate({
                          job_title: job.title,
                          company: job.company,
                          status: 'applied',
                          url: job.source_url || undefined,
                        }, {
                          onSuccess: () => {
                            queryClient.invalidateQueries({ queryKey: ['job-applications'] });
                            queryClient.invalidateQueries({ queryKey: ['job-activity-stats'] });
                            queryClient.invalidateQueries({ queryKey: ['activity-timeline'] });
                            setActiveTab('applications');
                            haptics.success();
                          },
                        });
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Briefcase className="w-12 h-12 mb-3 opacity-30" />
                  <p className="font-medium">{hasActiveFilters ? 'No jobs match filters' : 'No saved jobs yet'}</p>
                  <p className="text-sm mt-1 mb-4">{hasActiveFilters ? 'Try adjusting your filters' : 'Save jobs to start tracking your applications'}</p>
                  {!hasActiveFilters && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => { haptics.light(); setShowSearch(true); }}
                        className="flex items-center gap-1.5 text-xs font-medium text-primary px-4 py-2.5 rounded-full bg-primary/10 hover:bg-primary/15 transition-colors min-h-[44px] touch-manipulation"
                      >
                        <Search className="w-3.5 h-3.5" /> Search Jobs
                      </button>
                      <button
                        onClick={() => { haptics.light(); setShowSaveJob(true); }}
                        className="flex items-center gap-1.5 text-xs font-medium text-foreground px-4 py-2.5 rounded-full bg-muted hover:bg-muted/80 transition-colors min-h-[44px] touch-manipulation"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Manually
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </PullToRefresh>

      {/* Save Job FAB */}
      {activeTab === 'jobs' && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => { haptics.medium(); setShowSaveJob(true); }}
          className="fixed bottom-[7.5rem] sm:bottom-20 right-4 pr-safe z-50 w-16 h-16 rounded-full gradient-primary shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Save new job"
        >
          <Plus className="w-6 h-6 text-primary-foreground" />
        </motion.button>
      )}

      <AddApplicationSheet open={showAdd} onOpenChange={setShowAdd} />
      <ResumeListSheet
        open={resumeListOpen}
        onOpenChange={setResumeListOpen}
        filter={resumeListFilter}
      />
      <JobSearchSheet
        open={showSearch}
        onOpenChange={setShowSearch}
        filters={filters}
        onFiltersChange={setFilters}
      />
      <SaveJobSheet open={showSaveJob} onOpenChange={setShowSaveJob} />
      {followUpApp && (
        <FollowUpEmailSheet
          open={!!followUpApp}
          onOpenChange={(open) => { if (!open) setFollowUpApp(null); }}
          company={followUpApp.company}
          jobTitle={followUpApp.jobTitle}
        />
      )}
    </div>
  );
}
