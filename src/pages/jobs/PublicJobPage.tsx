import { useParams, Link } from 'react-router-dom';
import { Globe, MapPin, Wifi, DollarSign, Briefcase, ArrowLeft, SearchX } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ApplyButton } from '@/components/wisehire/job-board/ApplyButton';
import { usePublicRole } from '@/hooks/wisehire/usePublicJobs';
import { formatDistanceToNow } from 'date-fns';

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
  freelance: 'Freelance',
};

function formatSalary(min: number | null, max: number | null) {
  if (!min && !max) return null;
  const fmt = (n: number) => n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)} / year`;
  if (min) return `From ${fmt(min)} / year`;
  return `Up to ${fmt(max!)} / year`;
}

export default function PublicJobPage() {
  const { companySlug, roleSlug } = useParams<{ companySlug: string; roleSlug: string }>();
  const { data: role, isLoading } = usePublicRole(companySlug, roleSlug);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#00061a]">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-2">
          <Globe className="h-4 w-4 text-blue-600" />
          <span className="font-bold text-blue-700 dark:text-blue-400 tracking-tight">WiseHire</span>
          <span className="text-slate-300 dark:text-slate-700 mx-1">·</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">Job Board</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !role ? (
          <div className="flex flex-col items-center py-20 text-center">
            <SearchX className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">Role not found</p>
            <p className="text-sm text-slate-400 mt-1">This role may have been removed or is no longer open.</p>
            {companySlug && (
              <Link
                to={`/jobs/${companySlug}`}
                className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to all jobs
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Back link */}
            {companySlug && (
              <Link
                to={`/jobs/${companySlug}`}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to {role.company?.name ?? 'all jobs'}
              </Link>
            )}

            {/* Header */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{role.title}</h1>
                  {role.company && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{role.company.name}</p>
                  )}
                </div>
                <ApplyButton roleId={role.id} roleTitle={role.title} />
              </div>

              {/* Meta tags */}
              <div className="flex flex-wrap gap-2">
                {role.employment_type && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Briefcase className="h-3 w-3" />
                    {EMPLOYMENT_LABELS[role.employment_type] ?? role.employment_type}
                  </Badge>
                )}
                {role.location && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <MapPin className="h-3 w-3" />
                    {role.location}
                  </Badge>
                )}
                {role.remote_ok && (
                  <Badge className="gap-1 text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                    <Wifi className="h-3 w-3" />
                    Remote OK
                  </Badge>
                )}
                {(role.salary_min || role.salary_max) && (
                  <Badge variant="outline" className="gap-1 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                    <DollarSign className="h-3 w-3" />
                    {formatSalary(role.salary_min, role.salary_max)}
                  </Badge>
                )}
              </div>

              <p className="text-xs text-slate-400">
                Posted {formatDistanceToNow(new Date(role.created_at), { addSuffix: true })}
              </p>
            </div>

            {/* JD */}
            {role.jd_text && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Job Description</h2>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {role.jd_text}
                  </pre>
                </div>
              </div>
            )}

            {/* Apply CTA */}
            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 p-6 flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Interested in this role?</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Apply with your WiseResume profile in one click.
                </p>
              </div>
              <ApplyButton roleId={role.id} roleTitle={role.title} />
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-slate-400 pb-4">
              Powered by{' '}
              <a href="/" className="text-blue-500 hover:underline">thewise.cloud</a>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
