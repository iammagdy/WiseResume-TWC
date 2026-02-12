import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Briefcase, ArrowLeft } from 'lucide-react';
import { useJobApplications, useJobApplicationMutations, ApplicationStatus } from '@/hooks/useJobApplications';
import { useAuth } from '@/hooks/useAuth';
import { ApplicationCard } from '@/components/applications/ApplicationCard';
import { AddApplicationSheet } from '@/components/applications/AddApplicationSheet';
import { StatusFilter } from '@/components/applications/StatusFilter';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';

export default function ApplicationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);

  const { data: applications, isLoading } = useJobApplications(
    statusFilter === 'all' ? undefined : statusFilter
  );
  const { updateApplication, deleteApplication } = useJobApplicationMutations();

  const handleStatusChange = useCallback((id: string, status: ApplicationStatus) => {
    updateApplication.mutate({ id, status });
  }, [updateApplication]);

  const handleDelete = useCallback((id: string) => {
    deleteApplication.mutate(id);
  }, [deleteApplication]);

  const counts = applications?.reduce(
    (acc, app) => {
      acc[app.status as ApplicationStatus] = (acc[app.status as ApplicationStatus] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) || {};

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
            <h1 className="text-lg font-display font-semibold">Applications</h1>
          </div>
          <Button
            size="sm"
            onClick={() => {
              haptics.medium();
              setShowAdd(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </header>

      {/* Stats Row */}
      <div className="shrink-0 px-4 py-3 flex gap-3">
        {[
          { label: 'Applied', count: counts.applied || 0, color: 'text-primary' },
          { label: 'Interviewing', count: counts.interviewing || 0, color: 'text-warning' },
          { label: 'Offers', count: counts.offer || 0, color: 'text-success' },
          { label: 'Rejected', count: counts.rejected || 0, color: 'text-destructive' },
        ].map((stat) => (
          <div key={stat.label} className="flex-1 glass-surface rounded-xl p-3 text-center border border-border/20">
            <p className={`text-lg font-bold ${stat.color}`}>{stat.count}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="shrink-0 px-4 pb-3">
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : applications?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No applications yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start tracking your job applications here
            </p>
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Track First Application
            </Button>
          </div>
        ) : (
          applications?.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      <AddApplicationSheet open={showAdd} onOpenChange={setShowAdd} />
    </div>
  );
}
