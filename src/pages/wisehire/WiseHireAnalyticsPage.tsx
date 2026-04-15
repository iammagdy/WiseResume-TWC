import { WiseHireShell } from '@/components/wisehire/WiseHireShell';
import { HRAnalyticsSkeleton } from '@/components/wisehire/analytics/AnalyticsSkeleton';
import { useHRAnalytics } from '@/hooks/wisehire/useHRAnalytics';
import { BarChart2, Users, Zap, Clock, Star, Eye, Briefcase, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGE_COLORS: Record<string, string> = {
  shortlisted: '#3b82f6',
  screening: '#8b5cf6',
  interview: '#f59e0b',
  offer: '#10b981',
  hired: '#22c55e',
  rejected: '#ef4444',
};

function StatCard({
  label,
  value,
  icon: Icon,
  suffix = '',
  color = 'blue',
}: {
  label: string;
  value: number | string | null;
  icon: React.ElementType;
  suffix?: string;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <div className={cn('inline-flex p-2 rounded-lg mb-3', colorMap[color] ?? colorMap.blue)}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        {value !== null && value !== undefined ? `${value}${suffix}` : '—'}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <p className="text-xs text-slate-600 dark:text-slate-400 w-24 shrink-0 capitalize">{label}</p>
      <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color ?? '#3b82f6' }}
        />
      </div>
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-6 text-right">{value}</span>
    </div>
  );
}

function MiniBarChart({ data }: { data: { month: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-2 h-24">
      {data.map((d) => {
        const pct = Math.max((d.count / max) * 100, d.count > 0 ? 8 : 2);
        return (
          <div key={d.month} className="flex flex-col items-center gap-1 flex-1">
            <div
              className="w-full rounded-t bg-blue-500 dark:bg-blue-600 transition-all duration-700"
              style={{ height: `${pct}%`, minHeight: '2px' }}
            />
            <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function WiseHireAnalyticsPage() {
  const { data, isLoading, error } = useHRAnalytics();

  return (
    <WiseHireShell>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Analytics</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Hiring metrics computed from your pipeline activity — no setup required.
          </p>
        </div>

        {isLoading ? (
          <HRAnalyticsSkeleton />
        ) : error ? (
          <div className="py-12 text-center text-sm text-slate-500">Failed to load analytics. Please refresh.</div>
        ) : data ? (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total candidates" value={data.totalCandidates} icon={Users} color="blue" />
              <StatCard label="Resumes screened" value={data.totalScreened} icon={Zap} color="purple" />
              <StatCard
                label="Avg match score"
                value={data.avgMatchScore}
                icon={Star}
                suffix="%"
                color="amber"
              />
              <StatCard
                label="Avg time to hire"
                value={data.avgTimeToHire}
                icon={Clock}
                suffix=" days"
                color="emerald"
              />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Active roles" value={data.activeRoles} icon={Briefcase} color="blue" />
              <StatCard label="Briefs generated" value={data.briefsGenerated} icon={FileText} color="purple" />
              <StatCard label="Talent pool views" value={data.talentPoolViews} icon={Eye} color="amber" />
              <StatCard
                label="Hired"
                value={data.candidatesByStage.find((s) => s.stage === 'hired')?.count ?? 0}
                icon={Users}
                color="emerald"
              />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Candidates by stage */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Candidates by stage</h2>
                {data.candidatesByStage.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4">No pipeline data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {data.candidatesByStage
                      .sort((a, b) => b.count - a.count)
                      .map((s) => (
                        <BarRow
                          key={s.stage}
                          label={s.stage}
                          value={s.count}
                          max={data.totalCandidates}
                          color={STAGE_COLORS[s.stage]}
                        />
                      ))}
                  </div>
                )}
              </div>

              {/* Candidates over time */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">
                  New candidates over time
                </h2>
                <MiniBarChart data={data.candidatesOverTime} />
              </div>
            </div>

            {/* Top skills */}
            {data.topSkills.length > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">
                  Top skills in your applicant pool
                </h2>
                <div className="space-y-2.5">
                  {data.topSkills.map((s) => (
                    <BarRow
                      key={s.skill}
                      label={s.skill}
                      value={s.count}
                      max={data.topSkills[0].count}
                      color="#8b5cf6"
                    />
                  ))}
                </div>
              </div>
            )}

            {data.totalCandidates === 0 && (
              <div className="text-center py-10 text-slate-400 text-sm">
                Add candidates to your pipeline to see metrics populate here.
              </div>
            )}
          </>
        ) : null}
      </div>
    </WiseHireShell>
  );
}
