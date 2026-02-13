import { useState, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Plus, ArrowLeft, Bell, BarChart3, Lock, Briefcase, Layers, FileText, Scissors, Search, Mail, MapPin, Building2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useJobApplications } from '@/hooks/useJobApplications';
import { useJobs, Job } from '@/hooks/useJobs';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { useJobActivityStats } from '@/hooks/useJobActivityStats';
import { useAuth } from '@/hooks/useAuth';
import { JobActivityStatsCard } from '@/components/applications/JobActivityStats';
import { ActivityTimeline } from '@/components/applications/ActivityTimeline';
import { AddApplicationSheet } from '@/components/applications/AddApplicationSheet';
import { ResumeListSheet } from '@/components/applications/ResumeListSheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

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

  // Auth guard
  if (!user) {
    return <Navigate to="/auth" replace />;
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
      <ResumeListSheet
        open={resumeListOpen}
        onOpenChange={setResumeListOpen}
        filter={resumeListFilter}
      />
    </div>
  );
}
