import { WiseHireShell } from '@/components/wisehire/WiseHireShell';
import { HRAnalyticsSkeleton } from '@/components/wisehire/analytics/AnalyticsSkeleton';
import { useHRAnalytics } from '@/hooks/wisehire/useHRAnalytics';
import { BarChart2, Users, Zap, Clock, Star, Eye, Briefcase, FileText, TrendingDown, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGE_COLORS: Record<string, string> = {
  shortlisted: '#3b82f6',
  contacted: '#8b5cf6',
  interviewing: '#f59e0b',
  offer_sent: '#f97316',
  hired: '#22c55e',
  rejected: '#ef4444',
};

const SOURCE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#f97316', '#ec4899'];

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

function BarRow({
  label,
  value,
  max,
  color,
  suffix = '',
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
  suffix?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <p className="text-xs text-slate-600 dark:text-slate-400 w-28 shrink-0 truncate capitalize">{label}</p>
      <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color ?? '#3b82f6' }}
        />
      </div>
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-12 text-right shrink-0">
        {value}{suffix}
      </span>
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

function FunnelChart({ data }: { data: { stage: string; label: string; count: number; pct: number }[] }) {
  if (data.every((d) => d.count === 0)) {
    return <p className="text-xs text-slate-400 py-4">No pipeline data yet.</p>;
  }
  return (
    <div className="space-y-2">
      {data.map((entry, i) => (
        <div key={entry.stage} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{entry.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{entry.count}</span>
              {i > 0 && (
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                  {entry.pct}%
                </span>
              )}
            </div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${entry.pct}%`,
                backgroundColor: i === 0 ? '#3b82f6' : i === 1 ? '#8b5cf6' : i === 2 ? '#f59e0b' : i === 3 ? '#f97316' : '#22c55e',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WiseHireAnalyticsPage() {
  const { data, isLoading, error } = useHRAnalytics();

  return (
    <WiseHireShell>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
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
            {/* Stat cards row 1 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total candidates" value={data.totalCandidates} icon={Users} color="blue" />
              <StatCard label="Resumes screened" value={data.totalScreened} icon={Zap} color="purple" />
              <StatCard label="Avg match score" value={data.avgMatchScore} icon={Star} suffix="%" color="amber" />
              <StatCard label="Avg time to hire" value={data.avgTimeToHire} icon={Clock} suffix=" days" color="emerald" />
            </div>

            {/* Stat cards row 2 */}
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

            {/* Charts row: stage distribution + over time */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                          label={s.stage.replace('_', ' ')}
                          value={s.count}
                          max={data.totalCandidates}
                          color={STAGE_COLORS[s.stage]}
                        />
                      ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">
                  New candidates over time
                </h2>
                <MiniBarChart data={data.candidatesOverTime} />
              </div>
            </div>

            {/* Conversion funnel + Source breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingDown className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Hiring funnel</h2>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3">
                  Percentage of shortlisted candidates that reached each stage.
                </p>
                <FunnelChart data={data.stageFunnel} />
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Candidate sources</h2>
                </div>
                {data.sourceBreakdown.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4">No data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {data.sourceBreakdown.map((s, i) => (
                      <BarRow
                        key={s.source}
                        label={s.source}
                        value={s.count}
                        max={data.sourceBreakdown[0].count}
                        color={SOURCE_COLORS[i % SOURCE_COLORS.length]}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Avg days per stage + top skills */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {data.avgDaysPerStage.length > 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                    <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Avg days per stage</h2>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3">
                    How long candidates typically stay in each stage before moving.
                  </p>
                  <div className="space-y-3">
                    {data.avgDaysPerStage.map((s) => (
                      <BarRow
                        key={s.stage}
                        label={s.label}
                        value={s.avgDays}
                        max={Math.max(...data.avgDaysPerStage.map((d) => d.avgDays), 1)}
                        color={STAGE_COLORS[s.stage] ?? '#3b82f6'}
                        suffix=" d"
                      />
                    ))}
                  </div>
                </div>
              )}

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
            </div>

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
