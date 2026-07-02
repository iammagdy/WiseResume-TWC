import { useState, useCallback, useEffect, useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import {
  RefreshCw, BarChart2, Users, Eye, Zap, Globe, Lock, TrendingUp, Activity,
  Smartphone, Link2, MapPin, Calendar, Layers, FileText,
  HeartPulse, AlertCircle, Download, BrainCircuit, CheckCircle2, Clock,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDevKitToken, useDevKitSession } from '@/contexts/DevKitSessionContext';
import { useIsMounted } from '@/lib/devkit/hooks';
import { invokeWithRetry, devKitCall } from '@/lib/devkit/devKitClient';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  Line, Legend,
} from 'recharts';

import { RangeSwitcher } from './analytics/RangeSwitcher';
import { KpiCard } from './analytics/KpiCard';
import { SectionCard } from './analytics/SectionCard';
import { Sparkline } from './analytics/Sparkline';
import { HeatmapDowHour } from './analytics/HeatmapDowHour';
import { Donut } from './analytics/Donut';
import { RankedList } from './analytics/RankedList';
import { EmptyState } from './analytics/EmptyState';
import type { AnalyticsRange, PremiumAnalyticsData, NamedCount } from './analytics/types';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { DevKitErrorCard } from './DevKitErrorCard';
import {
  normalizePageLabel, filterCleanPages, cleanReferrers,
  formatUnknown, isDevEnvironment,
} from './analytics/dataCleanup';

// ── Visitor analytics types (from admin-visitor-analytics) ──────────────────

interface VisitorKpis {
  totalVisitsToday: number;
  uniqueVisitorsToday: number;
  totalVisits: number;
  uniqueVisitors: number;
  newVisitors: number;
  returningVisitors: number;
  topCountry: string | null;
  topCountryCount: number;
  mobilePct: number;
  desktopPct: number;
  deviceBreakdown: NamedCount[];
  browserBreakdown: NamedCount[];
}

interface VisitorDashboard {
  kpis: VisitorKpis;
  countryDist: { country: string; count: number }[];
  topPages: { name: string; count: number }[];
  referrers?: NamedCount[];
  daily?: { date: string; pageviews: number; uniqueVisitors: number }[];
  heatmap?: number[][];
  funnel?: { pageview: number; sectionView: number; click: number; featureUse: number };
  live?: { liveCount: number };
  perfMetrics?: { avgLoadMs: number | null; avgFcpMs: number | null; p75LoadMs: number | null; fast: number; ok: number; slow: number; count: number };
  errors?: Record<string, string>;
  totals?: { pageviews: number; uniqueVisitors: number; sessions: number };
  windows?: Record<string, { visits: number; uniques: number; sessions: number }>;
  sessions?: { sessions: Array<{ session_id: string; anon_id: string; user_id?: string | null; firstSeen: string; lastSeen: string; pageCount: number; pages: string[]; country?: string; device_type?: string; browser?: string; referrer?: string; durationSeconds?: number }>; total: number };
  meta?: { truncated?: boolean; eventsInRange?: number };
}

interface HealthData {
  envFlags: { APPWRITE_API_KEY: boolean; APPWRITE_ENDPOINT: boolean; APPWRITE_PROJECT_ID: boolean; DEVKIT_PASSWORD: boolean };
  collectionExists: boolean;
  docCount: number;
  latestEventAt: string | null;
  missingSchemaFields: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  const isMounted = useIsMounted();
  const prefersReducedMotion = useReducedMotion();
  const [data, setData] = useState<PremiumAnalyticsData | null>(null);
  const [visitorData, setVisitorData] = useState<VisitorDashboard | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [range, setRange] = useState<AnalyticsRange>('7d');
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [exporting, setExporting] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  const isDev = isDevEnvironment();

  const fetchAnalytics = useCallback(async (r: AnalyticsRange) => {
    const token = getDevKitToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // Fire all three requests concurrently — visitor analytics and health
      // are best-effort so their failures must never block the primary call.
      const [tuple, visitorResult, healthResult] = await Promise.all([
        invokeWithRetry('admin-devkit-data', {
          headers: devKitAuthHeaders(),
          body: { action: 'analytics', range: r },
        }),
        devKitCall<VisitorDashboard>({
          functionId: 'admin-visitor-analytics',
          action: 'dashboard',
          payload: { range: r, page_num: 0 },
          timeoutMs: 300_000,
        }).catch(() => ({ ok: false as const, error: { code: 'NETWORK_ERROR' as const, message: 'visitor analytics unavailable' } })),
        devKitCall<HealthData>({
          functionId: 'admin-visitor-analytics',
          action: 'health',
          timeoutMs: 30_000,
        }).catch(() => ({ ok: false as const, error: { code: 'NETWORK_ERROR' as const, message: 'health unavailable' } })),
      ]);

      const result = unwrapAdminResponse<PremiumAnalyticsData>(tuple, 'admin-devkit-data');
      if (!result) throw new Error('No data returned');
      if (!isMounted()) return;
      setData({ ...result, lastUpdatedAt: new Date() });
      setSecondsAgo(0);

      if (visitorResult.ok && isMounted()) {
        setVisitorData(visitorResult.data);
      }
      if (healthResult.ok && isMounted()) {
        setHealth(healthResult.data);
      }

      setLastLoadedAt(new Date());
    } catch (e) {
      if (!isMounted()) return;
      setError(formatEdgeError(e, 'Failed to load analytics'));
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    if (isUnlocked) {
      setError(null);
      fetchAnalytics(range);
    } else {
      setData(null);
      setVisitorData(null);
      setHealth(null);
      setError(null);
    }
  }, [isUnlocked, range, fetchAnalytics]);

  useEffect(() => {
    if (!isUnlocked) return;
    const interval = setInterval(() => setSecondsAgo(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isUnlocked]);

  // Auto-refresh on "Today" only, gated on reduced motion
  useEffect(() => {
    if (!isUnlocked || range !== 'today' || prefersReducedMotion) return;
    const interval = setInterval(() => fetchAnalytics(range), 30_000);
    return () => clearInterval(interval);
  }, [isUnlocked, range, fetchAnalytics, prefersReducedMotion]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const result = await devKitCall<{ csv: string }>({
        functionId: 'admin-visitor-analytics',
        action: 'export',
        payload: { range },
        timeoutMs: 120_000,
      });
      if (result.ok && result.data.csv) {
        const blob = new Blob([result.data.csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visitor_events_${range}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch { /* ignore */ }
    finally { setExporting(false); }
  }, [range]);

  // Clean data for display
  const cleanTopPages = useMemo(() => {
    const pages = visitorData?.topPages ?? data?.topPages ?? [];
    return filterCleanPages(pages).slice(0, 10);
  }, [visitorData, data]);

  const cleanReferrerList = useMemo(() => {
    const referrers = visitorData?.referrers ?? data?.topReferrers ?? [];
    return cleanReferrers(referrers, isDev).slice(0, 8);
  }, [visitorData, data, isDev]);

  const visitorCountries = useMemo(() => {
    return (visitorData?.countryDist ?? []).map(c => ({
      name: formatUnknown(c.country),
      count: c.count,
    }));
  }, [visitorData]);

  const deviceBreakdown = useMemo(() => {
    return visitorData?.kpis?.deviceBreakdown ?? data?.deviceBreakdown ?? [];
  }, [visitorData, data]);

  // Growth funnel data
  const funnelSteps = useMemo(() => {
    if (!data?.rangeKpis) {
      return [
        { label: 'Visitors', count: visitorData?.kpis?.totalVisits ?? 0 },
        { label: 'Signups', count: 0 },
        { label: 'Created Resume', count: 0 },
        { label: 'Used AI', count: 0 },
        { label: 'Tailored', count: 0 },
        { label: 'Exported/Shared', count: 0 },
      ];
    }
    const visitors = visitorData?.kpis?.totalVisits ?? data.rangeKpis.views?.current ?? 0;
    const signups = data.rangeKpis.signups?.current ?? 0;
    const resumeEvents = data.topFeaturesRanged?.find(f => f.name.includes('resume') || f.name.includes('editor'))?.count ?? 0;
    const aiUsage = data.rangeKpis.aiCredits?.current ?? 0;
    const tailorEvents = data.topFeaturesRanged?.find(f => f.name.includes('tailor'))?.count ?? 0;
    const exportEvents = data.topFeaturesRanged?.find(f => f.name.includes('export') || f.name.includes('share'))?.count ?? 0;
    return [
      { label: 'Visitors', count: visitors },
      { label: 'Signups', count: signups },
      { label: 'Created Resume', count: resumeEvents },
      { label: 'Used AI', count: aiUsage },
      { label: 'Tailored', count: tailorEvents },
      { label: 'Exported/Shared', count: exportEvents },
    ];
  }, [visitorData, data]);

  const aiFeatures = useMemo(() => {
    return (data?.topFeaturesRanged ?? []).filter(f => f.name.startsWith('ai.')).slice(0, 6);
  }, [data]);

  const productFeatures = useMemo(() => {
    return (data?.topFeaturesRanged ?? []).filter(f => !f.name.startsWith('ai.')).slice(0, 6);
  }, [data]);

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
    today: 'today', '24h': 'last 24 hours', '7d': 'last 7 days', '30d': 'last 30 days', '90d': 'last 90 days', all: 'all time',
  };

  const maxFunnelCount = Math.max(...funnelSteps.map(s => s.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">App Analytics</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Command center overview · {rangeLabel[range]}
            {data && <> · last updated {lastUpdatedLabel}</>}
            {range === 'today' && !prefersReducedMotion && ' · auto-refreshes every 30s'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {visitorData?.live && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="tabular-nums">{visitorData.live.liveCount} live</span>
            </div>
          )}
          {lastLoadedAt && (
            <span className="text-[10px] text-muted-foreground/60 tabular-nums hidden sm:inline">
              {lastLoadedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <RangeSwitcher value={range} onChange={setRange} disabled={loading} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={loading || exporting}
            className="flex items-center gap-1.5"
          >
            {exporting ? <MiniSpinner size={14} /> : <Download className="w-3.5 h-3.5" />}
            <span className="text-xs">CSV</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchAnalytics(range)} disabled={loading} className="flex items-center gap-2">
            {loading ? <MiniSpinner size={16} /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <DevKitErrorCard error={error} title="Couldn't load analytics" context={{ panel: 'Analytics', function: 'admin-devkit-data' }} />
      )}

      {loading && !data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          {visitorData?.meta?.truncated && (
            <div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              This range reached the 5,000-event safety limit. Totals are partial; narrow the date range for exact detail.
            </div>
          )}
          {/* A. Hero summary */}
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span className="font-medium text-foreground">
                {visitorData?.kpis?.totalVisits?.toLocaleString() ?? data?.rangeKpis?.views?.current?.toLocaleString() ?? '0'}
              </span>
              <span className="text-muted-foreground">visitor events</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="font-medium text-foreground">{data?.rangeKpis?.activeUsers?.current?.toLocaleString() ?? 'Unavailable'}</span>
              <span className="text-muted-foreground">active users</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="font-medium text-foreground">{data?.rangeKpis?.aiCredits?.current?.toLocaleString() ?? '0'}</span>
              <span className="text-muted-foreground">AI credits</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="font-medium text-foreground">{data?.rangeKpis?.portfolioViews?.current?.toLocaleString() ?? '0'}</span>
              <span className="text-muted-foreground">portfolio views</span>
              {visitorData?.kpis?.topCountry && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="font-medium text-foreground">{formatUnknown(visitorData.kpis.topCountry)}</span>
                  <span className="text-muted-foreground">top visitor country</span>
                </>
              )}
            </div>
          </div>

          {/* B. KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <KpiCard
              label="Sessions today" value={visitorData?.windows?.today?.sessions?.toLocaleString() ?? ''}
              unavailable={!visitorData?.windows?.today} sub="Africa/Cairo · visitor_events" icon={Globe} accent="primary" hideDelta onClick={() => setSelectedMetric('sessions')}
            />
            <KpiCard
              label="Page views today" value={visitorData?.kpis?.totalVisitsToday?.toLocaleString() ?? ''}
              unavailable={!visitorData} sub="Africa/Cairo · visitor_events" icon={Eye} accent="purple" hideDelta onClick={() => setSelectedMetric('pageviews')}
            />
            <KpiCard
              label="Unique visitors today" value={visitorData?.kpis?.uniqueVisitorsToday?.toLocaleString() ?? ''}
              unavailable={!visitorData} sub="anonymous browsers · visitor_events" icon={Users} accent="green" hideDelta onClick={() => setSelectedMetric('visitors')}
            />
            <KpiCard
              label="New signups" value={data?.rangeKpis?.signups?.current?.toLocaleString() ?? ''}
              unavailable={data?.rangeKpis?.signups?.current == null} sub={`in ${rangeLabel[range]} · Appwrite Auth`} icon={Users} accent="green"
              current={data?.rangeKpis?.signups?.current} previous={data?.rangeKpis?.signups?.previous} onClick={() => setSelectedMetric('signups')}
            />
            <KpiCard
              label="Authenticated active users" value={data?.rangeKpis?.activeUsers?.current?.toLocaleString() ?? ''}
              unavailable={data?.rangeKpis?.activeUsers?.current == null} sub={`in ${rangeLabel[range]} · visitor_events.user_id`}
              icon={Activity} accent="blue"
              current={data?.rangeKpis?.activeUsers?.current} previous={data?.rangeKpis?.activeUsers?.previous}
              hideDelta={!showDelta} onClick={() => setSelectedMetric('active-users')}
            />
            <KpiCard
              label="Signup conversion" value={visitorData?.totals?.sessions && data?.rangeKpis?.signups?.current != null ? `${Math.round((data.rangeKpis.signups.current / visitorData.totals.sessions) * 100)}%` : ''}
              unavailable={!visitorData?.totals?.sessions || data?.rangeKpis?.signups?.current == null} sub="signups / sessions" icon={TrendingUp} accent="rose" hideDelta onClick={() => setSelectedMetric('conversion')}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="DAU" value={data?.rangeKpis?.dau?.toLocaleString() ?? '0'} sub="last 24h"
              icon={Activity} accent="blue" hideDelta />
            <KpiCard label="WAU" value={data?.rangeKpis?.wau?.toLocaleString() ?? '0'} sub="last 7 days"
              icon={Users} accent="blue" hideDelta />
            <KpiCard label="Stickiness" value={data?.rangeKpis?.stickiness != null ? `${data.rangeKpis.stickiness}%` : '0%'} sub="DAU / WAU"
              icon={TrendingUp} accent="rose" hideDelta />
            <KpiCard
              label="Portfolio views" value={data?.rangeKpis?.portfolioViews?.current?.toLocaleString() ?? '0'}
              sub={`vs previous ${rangeLabel[range]}`}
              icon={Eye} accent="purple"
              current={data?.rangeKpis?.portfolioViews?.current} previous={data?.rangeKpis?.portfolioViews?.previous}
              hideDelta={!showDelta}
            />
          </div>

          {/* C. Growth funnel — full width */}
          <SectionCard
            title="Growth funnel"
            description="Visitor → Signup → Created Resume → Used AI → Tailored → Exported/Shared"
            icon={TrendingUp}
          >
            <div className="space-y-2">
              {funnelSteps.map((step, i) => {
                const pct = Math.round((step.count / maxFunnelCount) * 100);
                const conversionPct = i > 0 && funnelSteps[0].count > 0
                  ? Math.round((step.count / funnelSteps[0].count) * 100)
                  : 100;
                return (
                  <div key={step.label} className="flex items-center gap-3">
                    <div className="w-32 text-xs text-muted-foreground shrink-0">{step.label}</div>
                    <div className="flex-1 h-7 rounded-md bg-muted/40 overflow-hidden">
                      <div
                        className="h-full rounded-md bg-primary/50 flex items-center px-2 transition-all"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      >
                        <span className="text-[10px] text-primary-foreground font-medium tabular-nums">
                          {step.count.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="w-14 text-right text-xs text-muted-foreground tabular-nums shrink-0">
                      {conversionPct}%
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* D. Traffic & active users chart — full width */}
          <SectionCard
            title="Traffic & active users"
            description={`Events and unique active users per ${data?.bucket ?? 'day'}, with 7-day rolling average where applicable.`}
            icon={BarChart2}
          >
            {(data?.activitySeries ?? []).length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={(data.activitySeries ?? []).map((p, idx) => ({
                  ...p,
                  rolling: (data.dauRollingSeries ?? [])[idx]?.value ?? p.users,
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

          {/* E. Product usage grid — two columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard
              title="Top product features"
              description="Most-used app features (non-AI) with trend"
              icon={Layers}
            >
              {productFeatures.length === 0 ? <EmptyState message="No product feature data yet" /> : (
                <ul className="space-y-3">
                  {productFeatures.map((f, i) => (
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

            <SectionCard
              title="Activity by hour & day"
              description="UTC hour-of-day vs day-of-week. Darker = more events."
              icon={Calendar}
            >
              {(visitorData?.heatmap ?? data?.heatmap ?? []).flat().every(v => v === 0)
                ? <EmptyState />
                : <HeatmapDowHour matrix={visitorData?.heatmap ?? data?.heatmap ?? []} />}
            </SectionCard>
          </div>

          {/* F. Acquisition grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard
              title="Top referrers"
              description="External sources sending traffic (visitor analytics)"
              icon={Link2}
            >
              {cleanReferrerList.length === 0 ? <EmptyState message="No referrer data in this window" /> : (
                <RankedList items={cleanReferrerList} maxItems={8} />
              )}
            </SectionCard>

            <SectionCard
              title="Top pages"
              description="Most visited page paths (visitor analytics)"
              icon={FileText}
            >
              {cleanTopPages.length === 0
                ? <EmptyState message="No page-view data yet" />
                : <RankedList items={cleanTopPages.map(p => ({ name: normalizePageLabel(p.name), count: p.count }))} maxItems={10} />
              }
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SectionCard
              title="Visitor countries"
              description="From visitor events (geo-resolved)"
              icon={MapPin}
            >
              {visitorCountries.length === 0
                ? <EmptyState message="No visitor country data yet" />
                : <RankedList items={visitorCountries} maxItems={8} />
              }
            </SectionCard>

            <SectionCard
              title="User profile countries"
              description="From registered user profiles (all-time)"
              icon={Globe}
            >
              {(data?.countryRanking ?? []).length === 0
                ? <EmptyState message="No profile country data yet" />
                : <RankedList items={(data.countryRanking ?? []).map(c => ({ name: formatUnknown(c.country), count: c.count }))} maxItems={8} />
              }
            </SectionCard>

            <SectionCard
              title="Devices"
              description="Visitor device breakdown"
              icon={Smartphone}
            >
              {deviceBreakdown.length === 0
                ? <EmptyState message="No device data yet" />
                : <Donut items={deviceBreakdown} />
              }
            </SectionCard>
          </div>

          {/* G. AI usage section */}
          <SectionCard
            title="AI usage"
            description={`Credits used: ${data?.rangeKpis?.aiCredits?.current?.toLocaleString() ?? '0'} · Most-used AI tools`}
            icon={BrainCircuit}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-foreground tabular-nums">{data?.aiCreditsToday?.toLocaleString() ?? '0'}</div>
                    <div className="text-[10px] text-muted-foreground">Credits today</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-foreground tabular-nums">{data?.aiCreditsYesterday?.toLocaleString() ?? '0'}</div>
                    <div className="text-[10px] text-muted-foreground">Yesterday</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-foreground tabular-nums">{data?.rangeKpis?.aiCredits?.current?.toLocaleString() ?? '0'}</div>
                    <div className="text-[10px] text-muted-foreground">In range</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  AI credits are consumed by resume tailoring, cover letter generation, and AI-powered features.
                </div>
              </div>
              <div>
                {aiFeatures.length === 0
                  ? <EmptyState message="No AI feature usage in this range" />
                  : (
                    <ul className="space-y-2">
                      {aiFeatures.map((f, i) => (
                        <li key={`${f.name}-${i}`} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="truncate font-medium text-foreground">{prettyFeatureName(f.name)}</span>
                              <span className="text-muted-foreground tabular-nums">{f.count.toLocaleString()}</span>
                            </div>
                            <div className="mt-1 h-6">
                              {f.trend.length > 0 ? <Sparkline data={f.trend} height={24} /> : <div className="h-full" />}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )
                }
              </div>
            </div>
          </SectionCard>

          {/* H. Performance & health section */}
          <SectionCard
            title="System health & tracking"
            description="Visitor tracking status, ingestion health, and performance metrics"
            icon={HeartPulse}
          >
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${health?.envFlags.APPWRITE_API_KEY ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-muted-foreground">API Key</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${health?.collectionExists ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-muted-foreground">Collection</span>
                  {health && (
                    <span className="text-muted-foreground/60 tabular-nums">({health.docCount.toLocaleString()})</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${data ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-muted-foreground">App Analytics</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${visitorData ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-muted-foreground">Visitor Analytics</span>
                </div>
              </div>

              {health?.latestEventAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Last visitor event: {new Date(health.latestEventAt).toLocaleString()}</span>
                </div>
              )}

              {visitorData?.perfMetrics && visitorData.perfMetrics.count > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-border">
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground tabular-nums">
                      {visitorData.perfMetrics.avgLoadMs != null ? `${visitorData.perfMetrics.avgLoadMs}ms` : '—'}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Avg load</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground tabular-nums">
                      {visitorData.perfMetrics.p75LoadMs != null ? `${visitorData.perfMetrics.p75LoadMs}ms` : '—'}
                    </div>
                    <div className="text-[10px] text-muted-foreground">p75 load</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-green-500 tabular-nums">{visitorData.perfMetrics.fast}</span>
                      <span className="text-amber-500 tabular-nums">{visitorData.perfMetrics.ok}</span>
                      <span className="text-red-500 tabular-nums">{visitorData.perfMetrics.slow}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">Fast / OK / Slow</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground tabular-nums">{visitorData.perfMetrics.count}</div>
                    <div className="text-[10px] text-muted-foreground">Samples</div>
                  </div>
                </div>
              )}

              {health?.missingSchemaFields && health.missingSchemaFields.length > 0 && (
                <div className="flex items-start gap-2 text-amber-500 pt-2 border-t border-border">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">Missing schema fields:</span>{' '}
                    <span className="font-mono text-[10px]">{health.missingSchemaFields.join(', ')}</span>
                    <div className="mt-1 text-muted-foreground text-[10px]">
                      Run <code className="bg-muted px-1 rounded">node scripts/setup_visitor_events_schema.cjs</code> to add them
                    </div>
                  </div>
                </div>
              )}

              {visitorData?.errors && Object.keys(visitorData.errors).length > 0 && (
                <div className="flex items-start gap-2 text-amber-500 pt-2 border-t border-border">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">Partial data errors:</span>{' '}
                    <span className="font-mono text-[10px]">{Object.keys(visitorData.errors).join(', ')}</span>
                  </div>
                </div>
              )}

              {!health?.missingSchemaFields?.length && !visitorData?.errors && health?.collectionExists && (
                <div className="flex items-center gap-2 text-green-500 pt-2 border-t border-border">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>All tracking systems operational</span>
                </div>
              )}
            </div>
          </SectionCard>
        </>
      )}
      {selectedMetric && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={`${selectedMetric} details`}>
          <div className="w-full max-w-3xl max-h-[80vh] overflow-auto rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold capitalize">{selectedMetric.replace('-', ' ')} details</h3>
                <p className="text-xs text-muted-foreground mt-1">Africa/Cairo · refreshed {lastLoadedAt?.toLocaleTimeString() ?? 'now'}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedMetric(null)} aria-label="Close metric details"><X className="w-4 h-4" /></Button>
            </div>
            {selectedMetric === 'sessions' && (
              <div className="mt-5 space-y-2">
                {(visitorData?.sessions?.sessions ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No session details are available for this range.</p> :
                  (visitorData?.sessions?.sessions ?? []).slice(0, 25).map(session => (
                    <div key={session.session_id} className="rounded-xl border border-border p-3 text-xs">
                      <div className="flex flex-wrap justify-between gap-2"><span className="font-mono">{session.session_id}</span><span>{new Date(session.firstSeen).toLocaleString()}</span></div>
                      <div className="mt-2 text-muted-foreground">{session.pageCount} pages · {session.country || 'Unknown country'} · {session.device_type || 'Unknown device'} · {session.browser || 'Unknown browser'} · {session.user_id ? 'Signed in' : 'Anonymous'}</div>
                      <div className="mt-1 truncate">{session.pages?.join(' → ')}</div>
                    </div>
                  ))}
              </div>
            )}
            {selectedMetric !== 'sessions' && (
              <p className="mt-5 text-sm text-muted-foreground">This metric is sourced from {selectedMetric === 'signups' ? 'Appwrite Auth' : 'visitor_events'} and no substitute metric is used when that source is unavailable.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
