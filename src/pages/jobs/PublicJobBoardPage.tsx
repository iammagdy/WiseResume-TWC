import { useParams } from 'react-router-dom';
import { Briefcase, Globe, MapPin, Wifi, SearchX } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { JobCard } from '@/components/wisehire/job-board/JobCard';
import { usePublicCompanyJobs, useAllPublishedRoles } from '@/hooks/wisehire/usePublicJobs';

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#00061a]">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-2">
          <Globe className="h-4 w-4 text-blue-600" />
          <span className="font-bold text-blue-700 dark:text-blue-400 tracking-tight">WiseHire</span>
          <span className="text-slate-300 dark:text-slate-700 mx-1">·</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">Job Board</span>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3">
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AllJobsBoard() {
  const { data: roles = [], isLoading } = useAllPublishedRoles();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Open Positions</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Roles posted by companies hiring on WiseHire.
        </p>
      </div>
      {isLoading ? (
        <BoardSkeleton />
      ) : roles.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <SearchX className="h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">No open positions right now. Check back soon.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map((r) => (
            <JobCard key={r.id} role={r} showCompany />
          ))}
        </div>
      )}
    </div>
  );
}

function CompanyJobsBoard({ companySlug }: { companySlug: string }) {
  const { data, isLoading } = usePublicCompanyJobs(companySlug);

  if (isLoading) return <BoardSkeleton />;

  if (!data?.company) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <Briefcase className="h-12 w-12 text-slate-300 mb-4" />
        <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">Company not found</p>
        <p className="text-sm text-slate-400 mt-1">This company may not have a public job board.</p>
      </div>
    );
  }

  const { company, roles } = data;

  return (
    <div className="space-y-6">
      {/* Company header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-lg font-bold">
          {company.name[0]}
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{company.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {roles.length} open position{roles.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {roles.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <SearchX className="h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">No open positions right now. Check back soon.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map((r) => (
            <JobCard key={r.id} role={r} companySlug={companySlug} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PublicJobBoardPage() {
  const { companySlug } = useParams<{ companySlug?: string }>();

  return (
    <PageShell>
      {companySlug ? (
        <CompanyJobsBoard companySlug={companySlug} />
      ) : (
        <AllJobsBoard />
      )}
    </PageShell>
  );
}
