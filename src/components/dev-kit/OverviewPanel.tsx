import { useState, useCallback, useEffect } from 'react';
import type { ElementType } from 'react';
import { RefreshCw, Users, Crown, AlertTriangle, Shield, Clock, FileText, TrendingUp, TrendingDown, CalendarDays, Briefcase, User, Zap, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { getDevKitToken } from '@/contexts/DevKitSessionContext';
import type { AdminUser } from './AdminUsersPanel';

interface OverviewStats {
  total: number;
  loadedCount: number;
  free: number;
  pro: number;
  premium: number;
  trial: number;
  suspended: number;
  totalResumes: number;
  totalLinks: number;
  newestUser: string | null;
  lastLoadedAt: Date;
  hrCount: number;
  jobSeekerCount: number;
  aiCreditsToday: number | null;
  aiCreditsYesterday: number | null;
}

type TrendDir = 'up' | 'down' | 'neutral';

function TrendChip({ current, previous }: { current: number; previous: number }) {
  const delta = current - previous;
  const pct = previous > 0 ? Math.round(Math.abs(delta / previous) * 100) : (current > 0 ? 100 : 0);
  const dir: TrendDir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral';

  if (dir === 'up') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
        <TrendingUp className="w-2.5 h-2.5" />
        +{pct}%
      </span>
    );
  }
  if (dir === 'down') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500">
        <TrendingDown className="w-2.5 h-2.5" />
        -{pct}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
      <Minus className="w-2.5 h-2.5" />
      0%
    </span>
  );
}

function BigStatCard({
  label,
  value,
  icon: Icon,
  accentClass,
  trend,
}: {
  label: string;
  value: number | string;
  icon: ElementType;
  accentClass: string;
  trend?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`rounded-lg p-2 ${accentClass} shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
        {trend}
      </div>
      <div>
        <p className="text-3xl font-bold text-foreground tabular-nums leading-none">{value}</p>
        <p className="text-xs font-medium text-muted-foreground mt-1.5">{label}</p>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  count,
  description,
  accentBg,
  accentBorder,
  accentText,
  icon: Icon,
}: {
  title: string;
  count: number;
  description: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  icon: ElementType;
}) {
  return (
    <div className={`rounded-xl border p-5 ${accentBg} ${accentBorder}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${accentText}`}>{title}</p>
          <p className="text-3xl font-bold text-foreground tabular-nums mt-1.5">{count.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <div className={`rounded-lg p-2 bg-background/60 border ${accentBorder} shrink-0`}>
          <Icon className={`w-4 h-4 ${accentText}`} />
        </div>
      </div>
    </div>
  );
}

function PlanBar({ free, pro, premium, trial, suspended, total }: {
  free: number; pro: number; premium: number; trial: number; suspended: number; total: number;
}) {
  if (total === 0) return null;
  const segments = [
    { count: free, color: 'bg-muted-foreground/40', label: 'Free', pct: ((free / total) * 100).toFixed(0) },
    { count: pro, color: 'bg-blue-500', label: 'Pro', pct: ((pro / total) * 100).toFixed(0) },
    { count: premium, color: 'bg-amber-500', label: 'Premium', pct: ((premium / total) * 100).toFixed(0) },
    { count: trial, color: 'bg-purple-500', label: 'Trial', pct: ((trial / total) * 100).toFixed(0) },
    { count: suspended, color: 'bg-red-500', label: 'Suspended', pct: ((suspended / total) * 100).toFixed(0) },
  ].filter(s => s.count > 0);

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        Plan Distribution
      </p>
      <div className="flex rounded-full overflow-hidden h-3 gap-px">
        {segments.map((s) => (
          <div
            key={s.label}
            className={`${s.color} transition-all`}
            style={{ width: `${(s.count / total) * 100}%` }}
            title={`${s.label}: ${s.count} (${s.pct}%)`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${s.color}`} />
            <span className="text-xs text-muted-foreground">
              {s.label} <span className="font-medium text-foreground">{s.count}</span>{' '}
              <span className="text-muted-foreground/60">({s.pct}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OverviewPanel() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const password = getDevKitToken();

      const PAGE_SIZE = 200;
      const allUsers: AdminUser[] = [];
      let page = 1;
      let total = 0;

      while (true) {
        const { data, error: err } = await edgeFunctions.functions.invoke('admin-list-users', {
          body: { password, page, per_page: PAGE_SIZE, sort: 'newest' },
        });
        if (err) throw new Error(err.message);
        const result = data as { success?: boolean; users?: AdminUser[]; total?: number; error?: string };
        if (result?.success === false) throw new Error(result.error ?? 'Unknown error');

        const batch: AdminUser[] = result?.users ?? [];
        if (page === 1) total = result?.total ?? batch.length;
        allUsers.push(...batch);

        if (allUsers.length >= total || batch.length < PAGE_SIZE) break;
        page++;
      }

      let free = 0, pro = 0, premium = 0, trial = 0, suspended = 0;
      let totalResumes = 0, totalLinks = 0;
      let hrCount = 0, jobSeekerCount = 0;

      const now = new Date();
      for (const u of allUsers) {
        totalResumes += u.resume_count ?? 0;
        totalLinks += u.link_count ?? 0;
        if (u.account_type === 'hr') hrCount++;
        else jobSeekerCount++;
        if (u.is_suspended) { suspended++; continue; }
        const trialActive = u.trial_plan && u.trial_expires_at && new Date(u.trial_expires_at) > now;
        if (trialActive) { trial++; continue; }
        if (u.plan_name === 'premium') premium++;
        else if (u.plan_name === 'pro') pro++;
        else free++;
      }

      const newestUser = allUsers.length > 0 ? allUsers[0].created_at : null;

      let aiCreditsToday: number | null = null;
      let aiCreditsYesterday: number | null = null;
      try {
        const { data: analyticsData } = await edgeFunctions.functions.invoke('admin-analytics', {
          body: { password },
        });
        const analyticsResult = analyticsData as { success?: boolean; data?: { aiCreditsToday?: number; aiCreditsYesterday?: number } };
        if (analyticsResult?.data) {
          aiCreditsToday = analyticsResult.data.aiCreditsToday ?? null;
          aiCreditsYesterday = analyticsResult.data.aiCreditsYesterday ?? null;
        }
      } catch {
        // analytics is optional — don't fail the overview for it
      }

      setStats({
        total,
        loadedCount: allUsers.length,
        free,
        pro,
        premium,
        trial,
        suspended,
        totalResumes,
        totalLinks,
        newestUser,
        lastLoadedAt: new Date(),
        hrCount,
        jobSeekerCount,
        aiCreditsToday,
        aiCreditsYesterday,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  function formatRelative(iso: string | null): string {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Overview</h2>
          {stats && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Last updated {stats.lastLoadedAt.toLocaleTimeString()}
              {stats.loadedCount < stats.total && (
                <span className="ml-2 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3 h-3" />
                  Showing {stats.loadedCount.toLocaleString()} of {stats.total.toLocaleString()} (sampled)
                </span>
              )}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading} className="flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
          <p className="text-xs mt-1 opacity-70">Check that admin edge functions are deployed and DEV_KIT_PASSWORD is set.</p>
        </div>
      )}

      {loading && !stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      )}

      {stats && (
        <>
          {/* Primary 4-column tiles: total users, pro subscribers, free users, AI credits today */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <BigStatCard
              label="Total Users"
              value={stats.total.toLocaleString()}
              icon={Users}
              accentClass="bg-primary/10 text-primary"
              trend={stats.total > 0 ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Live
                </span>
              ) : undefined}
            />
            <BigStatCard
              label="Pro Subscribers"
              value={stats.pro.toLocaleString()}
              icon={Crown}
              accentClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
              trend={stats.total > 0 ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {Math.round((stats.pro / stats.total) * 100)}%
                </span>
              ) : undefined}
            />
            <BigStatCard
              label="Free Users"
              value={stats.free.toLocaleString()}
              icon={Shield}
              accentClass="bg-muted text-muted-foreground"
              trend={stats.total > 0 ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {Math.round((stats.free / stats.total) * 100)}%
                </span>
              ) : undefined}
            />
            <BigStatCard
              label="AI Credits Today"
              value={stats.aiCreditsToday !== null ? stats.aiCreditsToday.toLocaleString() : '—'}
              icon={Zap}
              accentClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
              trend={
                stats.aiCreditsToday !== null && stats.aiCreditsYesterday !== null
                  ? <TrendChip current={stats.aiCreditsToday} previous={stats.aiCreditsYesterday} />
                  : undefined
              }
            />
          </div>

          {/* Secondary row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <BigStatCard
              label="Job Seekers"
              value={stats.jobSeekerCount.toLocaleString()}
              icon={User}
              accentClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <BigStatCard
              label="HR Accounts"
              value={stats.hrCount.toLocaleString()}
              icon={Briefcase}
              accentClass={stats.hrCount > 0 ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-muted text-muted-foreground'}
            />
            <BigStatCard
              label="Total Resumes"
              value={stats.totalResumes.toLocaleString()}
              icon={FileText}
              accentClass="bg-green-500/10 text-green-600 dark:text-green-400"
            />
            <BigStatCard
              label="Newest Signup"
              value={stats.newestUser ? formatRelative(stats.newestUser) : '—'}
              icon={CalendarDays}
              accentClass="bg-primary/10 text-primary"
            />
          </div>

          {/* Plan distribution */}
          <PlanBar
            free={stats.free}
            pro={stats.pro}
            premium={stats.premium}
            trial={stats.trial}
            suspended={stats.suspended}
            total={stats.total}
          />

          {/* Color-coded summary cards */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Segment Summary</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SummaryCard
                title="Free Tier"
                count={stats.free}
                description="Users on the free plan — no subscription"
                accentBg="bg-slate-500/5"
                accentBorder="border-slate-500/20"
                accentText="text-slate-500 dark:text-slate-400"
                icon={Shield}
              />
              <SummaryCard
                title="Pro + Premium"
                count={stats.pro + stats.premium}
                description="Paying subscribers across all paid plans"
                accentBg="bg-blue-500/5"
                accentBorder="border-blue-500/20"
                accentText="text-blue-600 dark:text-blue-400"
                icon={Crown}
              />
              <SummaryCard
                title="WiseHire"
                count={stats.hrCount}
                description="HR accounts registered for WiseHire access"
                accentBg="bg-orange-500/5"
                accentBorder="border-orange-500/20"
                accentText="text-orange-600 dark:text-orange-400"
                icon={Briefcase}
              />
            </div>
          </div>

          {/* Suspended + Trial alerts */}
          <div className="space-y-3">
            {stats.suspended > 0 && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-destructive">{stats.suspended} suspended account{stats.suspended !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-muted-foreground">Go to Users → filter by Suspended to review</p>
                </div>
              </div>
            )}
            {stats.trial > 0 && (
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 flex items-center gap-3">
                <Clock className="w-4 h-4 text-purple-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">{stats.trial} active trial{stats.trial !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-muted-foreground">Users on a time-limited trial plan</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
