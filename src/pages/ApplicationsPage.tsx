import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Bell, BarChart3 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useJobApplications, useJobApplicationMutations, usePendingReminders } from '@/hooks/useJobApplications';
import { useJobActivityStats } from '@/hooks/useJobActivityStats';
import { useAuth } from '@/hooks/useAuth';
import { JobActivityStatsCard } from '@/components/applications/JobActivityStats';
import { ActivityTimeline } from '@/components/applications/ActivityTimeline';
import { AddApplicationSheet } from '@/components/applications/AddApplicationSheet';
import { ApplicationDetailSheet } from '@/components/applications/ApplicationDetailSheet';
import { ResumeListSheet } from '@/components/applications/ResumeListSheet';
import { SignInPromptDialog } from '@/components/auth/SignInPromptDialog';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { JobApplication } from '@/hooks/useJobApplications';

export default function ApplicationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const stats = useJobActivityStats();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const [showRemindersOnly, setShowRemindersOnly] = useState(false);
  const { data: reminderCount = 0 } = usePendingReminders();
  const [resumeListOpen, setResumeListOpen] = useState(false);
  const [resumeListFilter, setResumeListFilter] = useState<'originals' | 'tailored'>('originals');

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['job-activity-stats'] });
    await queryClient.invalidateQueries({ queryKey: ['activity-timeline'] });
    haptics.success();
    toast.success('Activity refreshed');
  }, [queryClient]);

  // Gate for guests
  if (!user) {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden pb-4">
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
        <SignInPromptDialog
          open={true}
          onOpenChange={(open) => { if (!open) navigate('/dashboard'); }}
          title="Track Your Job Applications"
          description="Sign in to unlock job tracking and activity insights."
          benefits={[
            'Track application status',
            'Set follow-up reminders',
            'View activity insights',
            'Manage all jobs in one place',
          ]}
          onContinueAsGuest={() => navigate('/dashboard')}
        />
      </div>
    );
  }

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                haptics.selection();
                setShowRemindersOnly(prev => !prev);
              }}
              className={`relative p-2.5 rounded-xl transition-all touch-manipulation ${showRemindersOnly ? 'bg-warning/15 text-warning' : 'hover:bg-muted/50 text-muted-foreground'}`}
              aria-label="Pending reminders"
            >
              <Bell className="w-5 h-5" />
              {reminderCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {reminderCount > 9 ? '9+' : reminderCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Content with Pull-to-Refresh */}
      <PullToRefresh onRefresh={handleRefresh} className="flex-1 overflow-hidden">
        <div className="px-4 py-4 space-y-6">
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

          {/* Timeline */}
          <div id="activity-timeline">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Recent Activity</h2>
            <ActivityTimeline />
          </div>

          {/* Add manually */}
          <div className="flex justify-center pt-2 pb-4">
            <button
              onClick={() => {
                haptics.medium();
                setShowAdd(true);
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add job manually
            </button>
          </div>
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
