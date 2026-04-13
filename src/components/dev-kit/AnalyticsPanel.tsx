import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Minus, BarChart2, Users, Eye, Zap, Globe, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { getDevKitToken } from '@/contexts/DevKitSessionContext';
import { useDevKitSession } from '@/contexts/DevKitSessionContext';
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
  const { isUnlocked } = useDevKitSession();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  const fetchAnalytics = useCallback(async () => {
    const token = getDevKitToken();
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const { data: responseData, error: invokeError } = await edgeFunctions.functions.invoke('admin-analytics', {
        body: { password: token },
      });

      if (invokeError) throw new Error(invokeError.message);

      const result = responseData as { success?: boolean; error?: string; data?: AnalyticsData };
      if (result?.success === false) throw new Error(result.error ?? 'Failed to load analytics');

      const raw = result?.data;
      if (!raw) throw new Error('No data returned');

      setData({
        ...raw,
        topFeatures: raw.topFeatures.map(f => ({
          ...f,
          name: f.name.replace('ai.', '').replace(/_/g, ' '),
        })),
        signupsLast14Days: raw.signupsLast14Days.map(s => ({
          ...s,
          date: s.date.slice(5),
        })),
        lastUpdatedAt: new Date(),
      });
      setSecondsAgo(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isUnlocked) {
      fetchAnalytics();
    } else {
      setData(null);
      setError(null);
    }
  }, [isUnlocked, fetchAnalytics]);

  useEffect(() => {
    if (!isUnlocked) return;
    const interval = setInterval(() => {
      setSecondsAgo(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isUnlocked]);

  useEffect(() => {
    if (!isUnlocked) return;
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 30_000);
    return () => clearInterval(interval);
  }, [isUnlocked, fetchAnalytics]);

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Lock className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Analytics locked</p>
        <p className="text-xs text-muted-foreground/60">Unlock the admin panel to view analytics data.</p>
      </div>
    );
  }

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
