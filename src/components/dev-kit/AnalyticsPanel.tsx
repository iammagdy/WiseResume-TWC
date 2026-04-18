import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  RefreshCw, BarChart2, Users, Eye, Zap, Globe, Lock, TrendingUp, Activity,
  Smartphone, Link2, MapPin, Calendar, Layers, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { getDevKitToken, useDevKitSession } from '@/contexts/DevKitSessionContext';
import { useIsMounted, useVisibleInterval } from '@/lib/devkit/hooks';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, LineChart, Line, Legend,
} from 'recharts';

import { RangeSwitcher } from './analytics/RangeSwitcher';
import { KpiCard } from './analytics/KpiCard';
import { SectionCard } from './analytics/SectionCard';
import { Sparkline } from './analytics/Sparkline';
import { HeatmapDowHour } from './analytics/HeatmapDowHour';
import { Donut } from './analytics/Donut';
import { RankedList } from './analytics/RankedList';
import { EmptyState } from './analytics/EmptyState';
import type { AnalyticsRange, PremiumAnalyticsData } from './analytics/types';

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'hsl(var(--foreground))',
};

function prettyFeatureName(raw: string): string {
  return raw.replace(/^ai\./, '').replace(/_/g, ' ');
}

function formatShortDate(s: string, bucket: 'hour' | 'day'): string {
  if (bucket === 'hour') return s.slice(11, 16);
  return s.slice(5);
}

export function AnalyticsPanel() {
  const { isUnlocked } = useDevKitSession();
  const [data, setData] = useState<PremiumAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [range, setRange] = useState<AnalyticsRange>('7d');

  const isMounted = useIsMounted();

  const fetchAnalytics = useCallback(async (r: AnalyticsRange) => {
    const token = getDevKitToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-analytics', {
        body: { password: token, range: r },
      });
      const result = unwrapAdminResponse<{ data?: PremiumAnalyticsData }>(tuple, 'admin-analytics');
      const raw = result.data;
      if (!raw) throw new Error('No data returned');
      if (!isMounted()) return;
      setData({ ...raw, lastUpdatedAt: new Date() });
      setSecondsAgo(0);
    } catch (e) {
      if (!isMounted()) return;
      setError(formatEdgeError(e, 'Failed to load analytics'));
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    if (isUnlocked) {
      // Keep previously rendered numbers visible while the new range
      // loads — only the inline refresh spinner indicates the fetch
      // is in flight. Avoids a full skeleton flash on range switch.
      setError(null);
      fetchAnalytics(range);
    } else {
      setData(null);
      setError(null);
    }
  }, [isUnlocked, range, fetchAnalytics]);

  useEffect(() => {
    if (!isUnlocked) return;
    const interval = setInterval(() => setSecondsAgo(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isUnlocked]);

  // Auto-refresh only on "Today" (other ranges are slower-moving)
  useEffect(() => {
    if (!isUnlocked || range !== 'today') return;
    const interval = setInterval(() => fetchAnalytics(range), 30_000);
    return () => clearInterval(interval);
  }, [isUnlocked, range, fetchAnalytics]);

  const viewsSpark = useMemo(
    () => data?.activitySeries.map(p => ({ date: p.date, value: p.views })) ?? [],
    [data?.activitySeries],
  );
  const usersSpark = useMemo(
    () => data?.activitySeries.map(p => ({ date: p.date, value: p.users })) ?? [],
    [data?.activitySeries],
  );

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

  const lastUpdatedLabel = secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.floor(secondsAgo / 60)}m ago`;
  const showDelta = range !== 'all';
  const rangeLabel: Record<AnalyticsRange, string> = {
    today: 'today', '7d': 'last 7 days', '30d': 'last 30 days', '90d': 'last 90 days', all: 'all time',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">App Analytics</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Showing {rangeLabel[range]}{data && <> · last updated {lastUpdatedLabel}{range === 'today' && ' · auto-refreshes every 30s'}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RangeSwitcher value={range} onChange={setRange} disabled={loading} />
          <Button variant="outline" size="sm" onClick={() => fetchAnalytics(range)} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>
      )}

      {loading && !data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />)}
          </div>
          <div className="h-64 rounded-xl bg-muted/40 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-56 rounded-xl bg-muted/40 animate-pulse" />
            <div className="h-56 rounded-xl bg-muted/40 animate-pulse" />
          </div>
        </>
      )}

      {data && (
        <>
          {/* KPI hero strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="Views" value={data.rangeKpis.views.current.toLocaleString()}
              sub={`vs previous ${rangeLabel[range]}`}
              icon={Eye} accent="primary"
              current={data.rangeKpis.views.current} previous={data.rangeKpis.views.previous}
              trend={viewsSpark} hideDelta={!showDelta}
            />
            <KpiCard
              label="Active users" value={data.rangeKpis.activeUsers.current.toLocaleString()}
              sub={`distinct in ${rangeLabel[range]}`}
              icon={Users} accent="green"
              current={data.rangeKpis.activeUsers.current} previous={data.rangeKpis.activeUsers.previous}
              trend={usersSpark} hideDelta={!showDelta}
            />
            <KpiCard
              label="AI credits" value={data.rangeKpis.aiCredits.current.toLocaleString()}
              sub={`vs previous ${rangeLabel[range]}`}
              icon={Zap} accent="amber"
              current={data.rangeKpis.aiCredits.current} previous={data.rangeKpis.aiCredits.previous}
              hideDelta={!showDelta}
            />
            <KpiCard
              label="Portfolio views" value={data.rangeKpis.portfolioViews.current.toLocaleString()}
              sub={`vs previous ${rangeLabel[range]}`}
              icon={Globe} accent="purple"
              current={data.rangeKpis.portfolioViews.current} previous={data.rangeKpis.portfolioViews.previous}
              hideDelta={!showDelta}
            />
          </div>

          {/* Secondary KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="DAU" value={data.rangeKpis.dau.toLocaleString()} sub="last 24h"
              icon={Activity} accent="blue" hideDelta />
            <KpiCard label="WAU" value={data.rangeKpis.wau.toLocaleString()} sub="last 7 days"
              icon={Users} accent="blue" hideDelta />
            <KpiCard label="Stickiness" value={`${data.rangeKpis.stickiness}%`} sub="DAU / WAU"
              icon={TrendingUp} accent="rose" hideDelta />
            <KpiCard label="Countries" value={data.totalCountries.toLocaleString()}
              sub="distinct countries" icon={MapPin} accent="primary" hideDelta />
          </div>

          {/* Traffic over time */}
          <SectionCard
            title="Traffic & active users"
            description={`Events and unique active users per ${data.bucket}, with 7-day rolling average where applicable.`}
            icon={TrendingUp}
          >
            {data.activitySeries.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data.activitySeries.map((p, idx) => ({
                  ...p,
                  rolling: data.dauRollingSeries[idx]?.value ?? p.users,
                  label: formatShortDate(p.date, data.bucket),
                }))} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g-views" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area yAxisId="left" type="monotone" dataKey="views" name="Events" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#g-views)" />
                  <Line yAxisId="right" type="monotone" dataKey="users" name="Active users" stroke="#10b981" strokeWidth={2} dot={false} />
                  {data.bucket === 'day' && (
                    <Line yAxisId="right" type="monotone" dataKey="rolling" name="Users (7d avg)" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </SectionCard>

          {/* New vs returning */}
          {data.bucket === 'day' && (
            <SectionCard
              title="New vs returning users"
              description="Distinct users per day, split by whether their account was created that day."
              icon={Users}
            >
              {data.newVsReturning.every(p => p.newUsers + p.returningUsers === 0) ? <EmptyState /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.newVsReturning.map(p => ({ ...p, label: formatShortDate(p.date, 'day') }))} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="newUsers" name="New" stackId="u" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="returningUsers" name="Returning" stackId="u" fill="#a855f7" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          )}

          {/* Two-column: Heatmap + Top features */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard
              title="Activity by hour & day"
              description="UTC hour-of-day vs day-of-week. Darker = more events in window."
              icon={Calendar}
            >
              {data.heatmap.flat().every(v => v === 0) ? <EmptyState /> : <HeatmapDowHour matrix={data.heatmap} />}
            </SectionCard>

            <SectionCard
              title="Top features (with trend)"
              description="Most-used events in the selected window plus a mini sparkline per feature."
              icon={Layers}
            >
              {data.topFeaturesRanged.length === 0 ? <EmptyState /> : (
                <ul className="space-y-3">
                  {data.topFeaturesRanged.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate font-medium text-foreground">{prettyFeatureName(f.name)}</span>
                          <span className="text-muted-foreground tabular-nums">{f.count.toLocaleString()}</span>
                        </div>
                        <div className="mt-1 h-8">
                          {f.trend.length > 0 ? <Sparkline data={f.trend} height={32} /> : <div className="h-full" />}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          {/* Top pages / routes */}
          <SectionCard
            title="Top pages"
            description="Most-visited routes in the selected window. Empty until client-side page-view tracking is enabled."
            icon={FileText}
          >
            {data.topPages.length === 0
              ? <EmptyState message="No page-view data yet — instrument route changes to populate this section" />
              : <RankedList items={data.topPages} maxItems={10} />}
          </SectionCard>

          {/* Two-column: Referrers + Devices */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard
              title="Top referrers"
              description="Where portfolio visits originated from in the selected window."
              icon={Link2}
            >
              {data.topReferrers.length === 0 ? <EmptyState message="No referrer data in this window" /> : (
                <RankedList items={data.topReferrers} maxItems={8} />
              )}
            </SectionCard>

            <SectionCard
              title="Device breakdown"
              description="Portfolio visits by device class (mobile / desktop / tablet)."
              icon={Smartphone}
            >
              {data.deviceBreakdown.length === 0 ? <EmptyState message="No device data in this window" /> : (
                <Donut items={data.deviceBreakdown} />
              )}
            </SectionCard>
          </div>

          {/* Geo ranking — all-time profile geography (intentionally not range-scoped) */}
          <div className="grid grid-cols-1 gap-4">
            <SectionCard
              title="Geographic distribution"
              description="Top countries by registered profile count (all-time, not affected by the time-range selector)."
              icon={Globe}
            >
              {data.countryRanking.length === 0 ? <EmptyState /> : (
                <RankedList items={data.countryRanking.map(c => ({ name: c.country, count: c.count }))} maxItems={8} />
              )}
            </SectionCard>

          </div>
        </>
      )}
    </div>
  );
}
