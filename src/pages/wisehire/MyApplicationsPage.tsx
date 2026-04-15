import { formatDistanceToNow } from 'date-fns';
import { Briefcase, MapPin, Wifi, CheckCircle2, Clock, SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/layout/AppShell';
import { useMyApplications } from '@/hooks/wisehire/useApplications';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  applied: { label: 'Applied', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  shortlisted: { label: 'Shortlisted', color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
  screening: { label: 'Screening', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  interview: { label: 'Interview', color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
  offer: { label: 'Offer Received', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  hired: { label: 'Hired', color: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' },
  rejected: { label: 'Not Selected', color: 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700' },
};

export default function MyApplicationsPage() {
  const { data: applications = [], isLoading } = useMyApplications();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Applications</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Track your WiseHire job board applications and their status.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <SearchX className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No applications yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Browse open roles on the{' '}
            <Link to="/jobs" className="text-blue-500 hover:underline">WiseHire job board</Link>
            {' '}and apply with one click.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const role = app.role as Record<string, unknown> | null | undefined;
            const roleTitle = role?.title as string | undefined;
            const companyData = role?.wisehire_companies as Record<string, unknown> | null | undefined;
            const companyName = companyData?.name as string | undefined;
            const companySlug = companyData?.slug as string | undefined;
            const roleSlug = role?.slug as string | undefined;
            const location = role?.location as string | undefined;
            const remoteOk = role?.remote_ok as boolean | undefined;
            const status = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.applied;

            const jobUrl = companySlug && roleSlug ? `/jobs/${companySlug}/${roleSlug}` : null;

            return (
              <div
                key={app.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {jobUrl ? (
                      <Link
                        to={jobUrl}
                        className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate block"
                      >
                        {roleTitle ?? 'Unknown Role'}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {roleTitle ?? 'Unknown Role'}
                      </p>
                    )}
                    {companyName && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{companyName}</p>
                    )}
                  </div>
                  <Badge className={cn('shrink-0 text-[10px] border', status.color)}>
                    {status.label}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-2.5 text-[11px] text-slate-400">
                  {location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{location}
                    </span>
                  )}
                  {remoteOk && (
                    <span className="flex items-center gap-1 text-blue-500">
                      <Wifi className="h-3 w-3" />Remote
                    </span>
                  )}
                  <span className="flex items-center gap-1 ml-auto">
                    <Clock className="h-3 w-3" />
                    Applied {formatDistanceToNow(new Date(app.applied_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
