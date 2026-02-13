import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Bell, BarChart3, Lock, Briefcase, Layers, FileText, Scissors, Search, Mail, MapPin, Building2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useJobApplications, useJobApplicationMutations, usePendingReminders } from '@/hooks/useJobApplications';
import { useJobs, useJobMutations, Job } from '@/hooks/useJobs';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { useJobActivityStats } from '@/hooks/useJobActivityStats';
import { useAuth } from '@/hooks/useAuth';
import { JobActivityStatsCard } from '@/components/applications/JobActivityStats';
import { ActivityTimeline } from '@/components/applications/ActivityTimeline';
import { AddApplicationSheet } from '@/components/applications/AddApplicationSheet';
import { ApplicationDetailSheet } from '@/components/applications/ApplicationDetailSheet';
import { ResumeListSheet } from '@/components/applications/ResumeListSheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { JobApplication } from '@/hooks/useJobApplications';
import { motion, AnimatePresence } from 'framer-motion';

type TabKey = 'applications' | 'jobs';

function JobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="glass-card rounded-2xl p-4 flex items-start gap-3 w-full text-left hover:bg-muted/30 transition-colors"
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
    </motion.button>
  );
}

export default function ApplicationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const stats = useJobActivityStats();
  const [activeTab, setActiveTab] = useState<TabKey>('applications');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: jobs = [] } = useJobs();
  const { data: applications = [] } = useJobApplications();
  const [resumeListOpen, setResumeListOpen] = useState(false);
  const [resumeListFilter, setResumeListFilter] = useState<'originals' | 'tailored'>('originals');

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['job-activity-stats'] });
    await queryClient.invalidateQueries({ queryKey: ['activity-timeline'] });
    await queryClient.invalidateQueries({ queryKey: ['jobs'] });
    await queryClient.invalidateQueries({ queryKey: ['job-applications'] });
    haptics.success();
    toast.success('Activity refreshed');
  }, [queryClient]);

  // Gate for guests
  if (!user) {
    const mockStats = [
      { label: 'Resumes Created', value: 12, icon: FileText, color: 'text-primary' },
      { label: 'Tailored Versions', value: 8, icon: Scissors, color: 'text-accent-foreground' },
      { label: 'Jobs Analyzed', value: 5, icon: Search, color: 'text-warning' },
      { label: 'Cover Letters', value: 3, icon: Mail, color: 'text-success' },
    ];

    const features = [
      { icon: Briefcase, text: 'Track application status' },
      { icon: Bell, text: 'Set follow-up reminders' },
      { icon: BarChart3, text: 'View activity insights' },
      { icon: Layers, text: 'Manage all jobs in one place' },
    ];

    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden pb-20">
        <header className="shrink-0 sticky top-0 z-50 glass border-b border-border px-4 py-3 pt-safe">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-3 -ml-3 rounded-full hover:bg-muted active:scale-95 transition-all touch-manipulation min-w-[48px] min-h-[48px] flex items-center justify-center"
              aria-label="Go back"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-display font-semibold">My Activity</h1>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 relative">
          {/* Blurred mock stats */}
          <div className="blur-sm select-none pointer-events-none">
            <div className="grid grid-cols-2 gap-3 mb-6">
              {mockStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="glass-surface rounded-2xl p-4 border border-border/20 flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center ${stat.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground text-center leading-tight">{stat.label}</p>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Recent Activity</h2>
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-surface rounded-xl p-3 border border-border/20 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted/40" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 rounded bg-muted/40" />
                    <div className="h-2.5 w-1/2 rounded bg-muted/30" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center px-6">
            <div className="glass-elevated rounded-3xl p-6 max-w-sm w-full text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto animate-pulse">
                <Lock className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold">Track Your Job Applications</h2>
                <p className="text-sm text-muted-foreground mt-1">Sign in to unlock your activity dashboard</p>
              </div>
              <ul className="space-y-2.5 text-left">
                {features.map((f) => {
                  const Icon = f.icon;
                  return (
                    <li key={f.text} className="flex items-center gap-2.5 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <span>{f.text}</span>
                    </li>
                  );
                })}
              </ul>
              <Button
                onClick={() => navigate('/auth?mode=signup')}
                className="w-full gradient-primary text-primary-foreground h-12 rounded-xl font-semibold"
              >
                Sign In to Get Started
              </Button>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Continue as guest
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'applications', label: 'My Applications' },
    { key: 'jobs', label: 'Saved Jobs' },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden pb-4">
      {/* Header */}
      <header className="shrink-0 sticky top-0 z-50 glass border-b border-border px-4 py-3 pt-safe">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-3 -ml-3 rounded-full hover:bg-muted active:scale-95 transition-all touch-manipulation min-w-[48px] min-h-[48px] flex items-center justify-center"
              aria-label="Go back"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-display font-semibold">My Activity</h1>
            </div>
          </div>
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
      </header>

      {/* Tabs */}
      <div className="px-4 pt-3 pb-1 flex gap-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { haptics.selection(); setActiveTab(t.key); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeTab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content with Pull-to-Refresh */}
      <PullToRefresh onRefresh={handleRefresh} className="flex-1 overflow-hidden">
        <div className="px-4 py-4 space-y-6">
          {activeTab === 'applications' ? (
            <>
              {/* Stats */}
              <JobActivityStatsCard
                stats={stats}
                onOriginalsTap={() => {
                  setResumeListFilter('originals');
                  setResumeListOpen(true);
                }}
                onTailoredTap={() => {
                  setResumeListFilter('tailored');
                  setResumeListOpen(true);
                }}
              />

              {/* Application Cards */}
              {applications.length > 0 ? (
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold text-muted-foreground">Applications</h2>
                  {applications.map(app => (
                    <motion.button
                      key={app.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => navigate(`/application/${app.id}`)}
                      className="glass-card rounded-2xl p-4 flex items-start gap-3 w-full text-left hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{app.job_title}</p>
                        <p className="text-xs text-muted-foreground truncate">{app.company}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{app.status}</Badge>
                    </motion.button>
                  ))}
                </div>
              ) : null}

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
              {jobs.length > 0 ? (
                <div className="space-y-2">
                  {jobs.map(job => (
                    <JobCard key={job.id} job={job} onClick={() => navigate(`/job/${job.id}`)} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Briefcase className="w-12 h-12 mb-3 opacity-30" />
                  <p className="font-medium">No saved jobs yet</p>
                  <p className="text-sm mt-1">Jobs you save will appear here</p>
                </div>
              )}
            </>
          )}
        </div>
      </PullToRefresh>

      <AddApplicationSheet open={showAdd} onOpenChange={setShowAdd} />
      <ApplicationDetailSheet
        application={selectedApp}
        open={!!selectedApp}
        onOpenChange={(open) => !open && setSelectedApp(null)}
      />
      <ResumeListSheet
        open={resumeListOpen}
        onOpenChange={setResumeListOpen}
        filter={resumeListFilter}
      />
    </div>
  );
}
