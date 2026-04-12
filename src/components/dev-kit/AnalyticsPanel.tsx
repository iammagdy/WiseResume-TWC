import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Minus, BarChart2, Users, Eye, Zap, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/safeClient';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line,
} from 'recharts';


interface AnalyticsData {
  pageViewsAllTime: number;
  pageViewsToday: number;
  activeUsersToday: number;
  activeUsersYesterday: number;
  topFeatures: { name: string; count: number }[];
  portfolioViewsTotal: number;
  signupsLast14Days: { date: string; count: number }[];
  aiCreditsToday: number;
  aiCreditsYesterday: number;
  countryDistribution: { country: string; count: number }[];
  lastUpdatedAt: Date;
}

interface UsageEventRow {
  id: string;
  user_id: string | null;
}

interface UsageEventTypeRow {
  event_type: string;
}

interface ProfileCreatedRow {
  created_at: string;
}

interface AiCreditsRow {
  daily_usage: number | null;
  usage_date: string | null;
}

interface ProfileCountryRow {
  country: string | null;
}

function DeltaIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  const delta = current - previous;
  const pct = previous > 0 ? Math.round((delta / previous) * 100) : (current > 0 ? 100 : 0);

  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-green-600 dark:text-green-400 font-medium">
        <TrendingUp className="w-3 h-3" /> +{pct}%
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-destructive font-medium">
        <TrendingDown className="w-3 h-3" /> {pct}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground font-medium">
      <Minus className="w-3 h-3" /> 0%
    </span>
  );
}

function MetricCard({
  label, value, sub, icon: Icon, color, delta,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
  delta?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3 shadow-sm">
      <div className={`rounded-lg p-2 ${color} shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-bold text-foreground tabular-nums leading-none">{value}</p>
          {delta}
        </div>
        <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const CUSTOM_TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'hsl(var(--foreground))',
};

export function AnalyticsPanel() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();

      const [
        allEventsResult,
        todayEventsResult,
        yesterdayEventsResult,
        featureEventsResult,
        portfolioEventsResult,
        signupProfilesResult,
        aiTodayResult,
        aiYesterdayResult,
        countryResult,
      ] = await Promise.all([
        supabase.from('usage_events').select('id', { count: 'exact', head: true }),
        supabase.from('usage_events').select('id, user_id', { count: 'exact' })
          .gte('created_at', `${today}T00:00:00Z`)
          .lt('created_at', `${today}T23:59:59Z`),
        supabase.from('usage_events').select('id, user_id', { count: 'exact' })
          .gte('created_at', `${yesterday}T00:00:00Z`)
          .lt('created_at', `${yesterday}T23:59:59Z`),
        supabase.from('usage_events').select('event_type')
          .order('created_at', { ascending: false })
          .limit(2000),
        supabase.from('portfolio_visits').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('created_at')
          .gte('created_at', fourteenDaysAgo)
          .order('created_at', { ascending: true }),
        supabase.from('ai_credits').select('daily_usage, usage_date')
          .eq('usage_date', today),
        supabase.from('ai_credits').select('daily_usage, usage_date')
          .eq('usage_date', yesterday),
        supabase.from('profiles').select('country').not('country', 'is', null).limit(1000),
      ]);

      const pageViewsAllTime = allEventsResult.count ?? 0;
      const pageViewsToday = todayEventsResult.count ?? 0;

      const todayEventRows = (todayEventsResult.data ?? []) as UsageEventRow[];
      const yesterdayEventRows = (yesterdayEventsResult.data ?? []) as UsageEventRow[];
      const todayUsers = new Set(todayEventRows.map(e => e.user_id)).size;
      const yesterdayUsers = new Set(yesterdayEventRows.map(e => e.user_id)).size;

      const featureRows = (featureEventsResult.data ?? []) as UsageEventTypeRow[];
      const featureCounts: Record<string, number> = {};
      for (const row of featureRows) {
        const key = row.event_type ?? 'unknown';
        featureCounts[key] = (featureCounts[key] || 0) + 1;
      }
      const topFeatures = Object.entries(featureCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name: name.replace('ai.', '').replace(/_/g, ' '), count }));

      const portfolioViewsTotal = portfolioEventsResult.count ?? 0;

      const signupByDay: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
        signupByDay[d] = 0;
      }
      const profileRows = (signupProfilesResult.data ?? []) as ProfileCreatedRow[];
      for (const p of profileRows) {
        const d = p.created_at?.split('T')[0];
        if (d && d in signupByDay) signupByDay[d]++;
      }
      const signupsLast14Days = Object.entries(signupByDay).map(([date, count]) => ({
        date: date.slice(5),
        count,
      }));

      const aiTodayRows = (aiTodayResult.data ?? []) as AiCreditsRow[];
      const aiYesterdayRows = (aiYesterdayResult.data ?? []) as AiCreditsRow[];
      const aiCreditsToday = aiTodayRows.reduce((sum, r) => sum + (r.daily_usage ?? 0), 0);
      const aiCreditsYesterday = aiYesterdayRows.reduce((sum, r) => sum + (r.daily_usage ?? 0), 0);

      const countryRows = (countryResult.data ?? []) as ProfileCountryRow[];
      const countryCounts: Record<string, number> = {};
      for (const row of countryRows) {
        if (row.country) {
          countryCounts[row.country] = (countryCounts[row.country] || 0) + 1;
        }
      }
      const countryDistribution = Object.entries(countryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([country, count]) => ({ country, count }));

      setData({
        pageViewsAllTime,
        pageViewsToday,
        activeUsersToday: todayUsers,
        activeUsersYesterday: yesterdayUsers,
        topFeatures,
        portfolioViewsTotal,
        signupsLast14Days,
        aiCreditsToday,
        aiCreditsYesterday,
        countryDistribution,
        lastUpdatedAt: new Date(),
      });
      setSecondsAgo(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  const lastUpdatedLabel = secondsAgo < 60
    ? `${secondsAgo}s ago`
    : `${Math.floor(secondsAgo / 60)}m ago`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">App Analytics</h2>
          {data && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Last updated {lastUpdatedLabel} · auto-refreshes every 30s
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading} className="flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>
      )}

      {loading && !data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Page Views (All Time)"
              value={data.pageViewsAllTime.toLocaleString()}
              icon={Eye}
              color="bg-primary/10 text-primary"
            />
            <MetricCard
              label="Page Views Today"
              value={data.pageViewsToday.toLocaleString()}
              icon={Eye}
              color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
            <MetricCard
              label="Active Users Today"
              value={data.activeUsersToday.toLocaleString()}
              sub={`vs ${data.activeUsersYesterday} yesterday`}
              icon={Users}
              color="bg-green-500/10 text-green-600 dark:text-green-400"
              delta={<DeltaIndicator current={data.activeUsersToday} previous={data.activeUsersYesterday} />}
            />
            <MetricCard
              label="Portfolio Views"
              value={data.portfolioViewsTotal.toLocaleString()}
              sub="all time aggregate"
              icon={Globe}
              color="bg-purple-500/10 text-purple-600 dark:text-purple-400"
            />
            <MetricCard
              label="AI Credits Today"
              value={data.aiCreditsToday.toLocaleString()}
              sub={`vs ${data.aiCreditsYesterday} yesterday`}
              icon={Zap}
              color="bg-amber-500/10 text-amber-600 dark:text-amber-400"
              delta={<DeltaIndicator current={data.aiCreditsToday} previous={data.aiCreditsYesterday} />}
            />
          </div>

          {/* Top Features */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              Top 10 Features (by event count)
            </p>
            {data.topFeatures.length === 0 ? (
              <p className="text-xs text-muted-foreground">No feature events recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.topFeatures} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Signups last 14 days */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              New Signups – Last 14 Days
            </p>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={data.signupsLast14Days} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Country Distribution */}
          {data.countryDistribution.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Geographic Distribution
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.countryDistribution} margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="country" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2">
                {data.countryDistribution.map(({ country, count }) => (
                  <span key={country} className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                    {country} · {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
