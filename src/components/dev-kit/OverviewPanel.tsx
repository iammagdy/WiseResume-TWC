import { useState, useCallback, useEffect } from 'react';
import type { ElementType } from 'react';
import { RefreshCw, Users, Crown, AlertTriangle, Shield, Clock, FileText, TrendingUp, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import type { AdminUser } from './AdminUsersPanel';

interface OverviewPanelProps {
  password: string;
}

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
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: number | string;
  icon: ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4 shadow-sm">
      <div className={`rounded-lg p-2.5 ${color} shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground tabular-nums leading-none mb-1">{value}</p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function PlanBar({ free, pro, premium, trial, suspended, total }: {
  free: number; pro: number; premium: number; trial: number; suspended: number; total: number;
}) {
  if (total === 0) return null;
  const pct = (n: number) => `${((n / total) * 100).toFixed(0)}%`;
  const segments = [
    { count: free, color: 'bg-muted-foreground/40', label: 'Free', pct: pct(free) },
    { count: pro, color: 'bg-blue-500', label: 'Pro', pct: pct(pro) },
    { count: premium, color: 'bg-amber-500', label: 'Premium', pct: pct(premium) },
    { count: trial, color: 'bg-purple-500', label: 'Trial', pct: pct(trial) },
    { count: suspended, color: 'bg-red-500', label: 'Suspended', pct: pct(suspended) },
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
            title={`${s.label}: ${s.count} (${s.pct})`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${s.color}`} />
            <span className="text-xs text-muted-foreground">{s.label} <span className="font-medium text-foreground">{s.count}</span> <span className="text-muted-foreground/60">({s.pct})</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OverviewPanel({ password }: OverviewPanelProps) {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
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

      const now = new Date();
      for (const u of allUsers) {
        totalResumes += u.resume_count ?? 0;
        totalLinks += u.link_count ?? 0;
        if (u.is_suspended) { suspended++; continue; }
        const trialActive = u.trial_plan && u.trial_expires_at && new Date(u.trial_expires_at) > now;
        if (trialActive) { trial++; continue; }
        if (u.plan_name === 'premium') premium++;
        else if (u.plan_name === 'pro') pro++;
        else free++;
      }

      const newestUser = allUsers.length > 0 ? allUsers[0].created_at : null;

      setStats({ total, loadedCount: allUsers.length, free, pro, premium, trial, suspended, totalResumes, totalLinks, newestUser, lastLoadedAt: new Date() });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load overview');
    } finally {
      setLoading(false);
    }
  }, [password]);

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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-foreground">Overview</h2>
            {stats && stats.loadedCount < stats.total && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-3 h-3" />
                Showing statistics for {stats.loadedCount.toLocaleString()} of {stats.total.toLocaleString()} users (sampled)
              </span>
            )}
          </div>
          {stats && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Last updated {stats.lastLoadedAt.toLocaleTimeString()}
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Users"
              value={stats.total}
              icon={Users}
              color="bg-primary/10 text-primary"
            />
            <StatCard
              label="Free Plan"
              value={stats.free}
              icon={Shield}
              color="bg-muted text-muted-foreground"
            />
            <StatCard
              label="Pro Plan"
              value={stats.pro}
              icon={Crown}
              color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
            <StatCard
              label="Premium Plan"
              value={stats.premium}
              icon={Crown}
              color="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            />
            <StatCard
              label="Active Trials"
              value={stats.trial}
              icon={Clock}
              color="bg-purple-500/10 text-purple-600 dark:text-purple-400"
            />
            <StatCard
              label="Suspended"
              value={stats.suspended}
              icon={AlertTriangle}
              color={stats.suspended > 0 ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-muted text-muted-foreground'}
            />
            <StatCard
              label="Total Resumes"
              value={stats.totalResumes}
              icon={FileText}
              color="bg-green-500/10 text-green-600 dark:text-green-400"
            />
            <StatCard
              label="Newest Signup"
              value={stats.newestUser ? formatRelative(stats.newestUser) : '—'}
              icon={CalendarDays}
              color="bg-primary/10 text-primary"
            />
          </div>

          <PlanBar
            free={stats.free}
            pro={stats.pro}
            premium={stats.premium}
            trial={stats.trial}
            suspended={stats.suspended}
            total={stats.total}
          />
        </>
      )}
    </div>
  );
}
