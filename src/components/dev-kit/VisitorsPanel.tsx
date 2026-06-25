import { useState, useCallback, useEffect, useRef } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import {
  RefreshCw, Users, Globe, Smartphone, Monitor, Tablet, MousePointerClick,
  Layers, Clock, ChevronRight, ArrowLeft, Lock, BarChart2, Map,
  Activity, Download, HeartPulse, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDevKitSession } from '@/contexts/DevKitSessionContext';
import { devKitCall, toDevKitError } from '@/lib/devkit/devKitClient';
import { useIsMounted } from '@/lib/devkit/hooks';
import { DevKitErrorCard } from './DevKitErrorCard';
import { SectionCard } from './analytics/SectionCard';
import { KpiCard } from './analytics/KpiCard';
import { Donut } from './analytics/Donut';
import { RankedList } from './analytics/RankedList';
import { EmptyState } from './analytics/EmptyState';
import { RangeSwitcher } from './analytics/RangeSwitcher';
import { Sparkline } from './analytics/Sparkline';
import { HeatmapDowHour } from './analytics/HeatmapDowHour';
import type { AnalyticsRange } from './analytics/types';
import { useReducedMotion } from 'framer-motion';

// ── Types ──────────────────────────────────────────────────────────────────

interface KpiData {
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
  deviceBreakdown: { name: string; count: number }[];
  browserBreakdown: { name: string; count: number }[];
}

interface CountryDist {
  country: string;
  count: number;
}

interface PageRow {
  name: string;
  count: number;
  sessions?: number;
}

interface NamedCount {
  name: string;
  count: number;
}

interface SectionRow extends NamedCount {
  uniqueVisitors?: number;
}

interface Session {
  session_id: string;
  anon_id: string;
  user_id: string | null;
  country: string | null;
  device_type: string | null;
  browser: string | null;
  firstSeen: string;
  lastSeen: string;
  pageCount: number;
  eventCount: number;
  durationSeconds: number;
}

interface JourneyEvent {
  id: string;
  session_id: string;
  anon_id: string;
  user_id: string | null;
  event_type: string;
  page: string | null;
  target: string | null;
  section: string | null;
  country: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  created_at: string;
}

interface DashboardData {
  kpis: KpiData;
  countryDist: CountryDist[];
  topPages: PageRow[];
  clickTargets: NamedCount[];
  sections: SectionRow[];
  sessions: { sessions: Session[]; total: number; page: number };
  cohort: NamedCount[];
  meta?: { eventsInRange: number; totalEvents: number; truncated?: boolean };
  // New enriched payload
  metaV2?: {
    totalEvents: number;
    eventsInRange: number;
    latestEventAt: string | null;
    oldestEventAt: string | null;
    range: string;
    truncated: boolean;
  };
  live?: { liveCount: number; topCountries: NamedCount[]; totalEvents?: number };
  totals?: { pageviews: number; uniqueVisitors: number; sessions: number; clicks: number; sectionViews: number; featureUses: number };
  windows?: Record<string, { visits: number; uniques: number; sessions: number }>;
  trends?: {
    visits: { current: number; previous: number; pct: number | null };
    uniques: { current: number; previous: number; pct: number | null };
  };
  daily?: { date: string; pageviews: number; uniqueVisitors: number }[];
  countries?: { country: string; count: number; uniqueVisitors: number }[];
  devices?: NamedCount[];
  browsers?: NamedCount[];
  oses?: NamedCount[];
  topEvents?: NamedCount[];
  referrers?: NamedCount[];
  hourly?: number[];
  heatmap?: number[][];
  returning?: { newCount: number; returningCount: number };
  funnel?: { pageview: number; sectionView: number; click: number; featureUse: number };
  perfMetrics?: { avgLoadMs: number | null; avgFcpMs: number | null; p75LoadMs: number | null; fast: number; ok: number; slow: number; count: number };
  errors?: Record<string, string>;
}

interface HealthData {
  envFlags: { APPWRITE_API_KEY: boolean; APPWRITE_ENDPOINT: boolean; APPWRITE_PROJECT_ID: boolean; DEVKIT_PASSWORD: boolean };
  collectionExists: boolean;
  docCount: number;
  latestEventAt: string | null;
  missingSchemaFields: string[];
  attributesFound: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const COUNTRY_FLAG: Record<string, string> = {
  US: '🇺🇸', GB: '🇬🇧', CA: '🇨🇦', AU: '🇦🇺', DE: '🇩🇪', FR: '🇫🇷',
  IN: '🇮🇳', BR: '🇧🇷', JP: '🇯🇵', CN: '🇨🇳', KR: '🇰🇷', MX: '🇲🇽',
  IT: '🇮🇹', ES: '🇪🇸', NL: '🇳🇱', SE: '🇸🇪', NO: '🇳🇴', PL: '🇵🇱',
  RU: '🇷🇺', ZA: '🇿🇦', NG: '🇳🇬', EG: '🇪🇬', AR: '🇦🇷', CL: '🇨🇱',
  PH: '🇵🇭', PK: '🇵🇰', ID: '🇮🇩', TR: '🇹🇷', UA: '🇺🇦', SA: '🇸🇦',
};

function flag(code: string | null): string {
  if (!code) return '🌍';
  return COUNTRY_FLAG[code.toUpperCase()] ?? '🌍';
}

function deviceIcon(type: string | null) {
  if (type === 'mobile')  return <Smartphone className="w-3.5 h-3.5" />;
  if (type === 'tablet')  return <Tablet className="w-3.5 h-3.5" />;
  return <Monitor className="w-3.5 h-3.5" />;
}

function formatDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function humanEventLabel(ev: JourneyEvent): string {
  switch (ev.event_type) {
    case 'page_view':    return `Viewed page ${ev.page ?? ''}`;
    case 'click':        return `Clicked "${ev.target ?? 'element'}"`;
    case 'section_view': return `Read section: ${ev.section ?? ''}`;
    case 'feature_use':  return `Used feature: ${ev.target ?? ''}`;
    case 'session_end':  return `Session ended (${ev.page ?? ''})`;
    case 'perf':         return `Performance: ${ev.page ?? ''}`;
    default:             return ev.event_type;
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return iso; }
}

// ── Subcomponent: World Map Choropleth (simplified SVG) ────────────────────

function WorldMap({ countryDist }: { countryDist: CountryDist[] }) {
  if (countryDist.length === 0) {
    return <EmptyState message="No visit data yet — tracking data will appear here once visitors arrive" />;
  }

  const maxCount = Math.max(...countryDist.map(c => c.count));
  const topN = countryDist.slice(0, 15);

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">Top countries by visit volume in the selected range</p>
      <ul className="space-y-1.5">
        {topN.map((entry, i) => {
          const pct = Math.round((entry.count / maxCount) * 100);
          return (
            <li key={`${entry.country}-${i}`} className="flex items-center gap-2 text-xs">
              <span className="text-base leading-none w-6 shrink-0">{flag(entry.country)}</span>
              <span className="font-medium text-foreground w-8 shrink-0">{entry.country ?? '??'}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-muted-foreground tabular-nums shrink-0">{entry.count.toLocaleString()}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Subcomponent: Journey Drawer ───────────────────────────────────────────

function JourneyDrawer({
  sessionId,
  anonId,
  onClose,
}: {
  sessionId?: string;
  anonId?: string;
  onClose: () => void;
}) {
  const [events, setEvents] = useState<JourneyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await devKitCall<JourneyEvent[]>({
          functionId: 'admin-visitor-analytics',
          action: 'journey',
          payload: { session_id: sessionId, anon_id: anonId },
        });
        if (!result.ok) throw result.error;
        setEvents(result.data ?? []);
      } catch (e) {
        setError(toDevKitError(e, { functionId: 'admin-visitor-analytics', action: 'journey' }).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId, anonId]);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-end">
      <div className="w-full sm:max-w-xl h-full bg-card border-l border-border shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-semibold">Visitor Journey</h3>
          </div>
          <div className="text-xs text-muted-foreground font-mono truncate max-w-[160px]">
            {sessionId ?? anonId}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-muted/40 animate-pulse" />
              ))}
            </div>
          )}
          {error && <DevKitErrorCard error={error} title="Failed to load journey" context={{ panel: 'Visitors' }} />}
          {!loading && !error && events.length === 0 && (
            <EmptyState message="No events found for this visitor" />
          )}
          {!loading && events.map((ev, i) => (
            <div key={ev.id ?? i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="shrink-0 mt-0.5">
                {ev.event_type === 'page_view'    && <Globe className="w-3.5 h-3.5 text-primary" />}
                {ev.event_type === 'click'        && <MousePointerClick className="w-3.5 h-3.5 text-amber-500" />}
                {ev.event_type === 'section_view' && <Layers className="w-3.5 h-3.5 text-green-500" />}
                {ev.event_type === 'feature_use'  && <BarChart2 className="w-3.5 h-3.5 text-purple-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{humanEventLabel(ev)}</p>
                {ev.page && ev.event_type !== 'page_view' && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">on {ev.page}</p>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{formatTime(ev.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────

type VisitorsRange = 'today' | '24h' | '7d' | '30d' | '90d';

export function VisitorsPanel() {
  const { isUnlocked } = useDevKitSession();
  const isMounted = useIsMounted();
  const prefersReducedMotion = useReducedMotion();
  const [range, setRange] = useState<VisitorsRange>('7d');
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadStatus, setLoadStatus] = useState<string | null>(null);
  const [dataTruncated, setDataTruncated] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [exporting, setExporting] = useState(false);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [countryDist, setCountryDist] = useState<CountryDist[]>([]);
  const [topPages, setTopPages] = useState<PageRow[]>([]);
  const [clickTargets, setClickTargets] = useState<NamedCount[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [sessionsPage, setSessionsPage] = useState(0);
  const [cohort, setCohort] = useState<NamedCount[]>([]);
  const [pageFilter, setPageFilter] = useState('');
  const [journeySession, setJourneySession] = useState<{ sessionId?: string; anonId?: string } | null>(null);
  const [journeySearch, setJourneySearch] = useState('');
  const [eventCount, setEventCount] = useState<number | null>(null);

  // New enriched data state
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);

  const invoke = useCallback(async (action: string, extra: Record<string, unknown> = {}, timeoutMs?: number) => {
    const result = await devKitCall<unknown>({
      functionId: 'admin-visitor-analytics',
      action,
      payload: { range, ...extra },
      timeoutMs,
    });
    if (!result.ok) throw result.error;
    return { success: true, data: result.data } as { success: boolean; data?: unknown };
  }, [range]);

  const applyDashboard = useCallback((data: DashboardData) => {
    setDashboard(data);
    setKpis(data.kpis);
    setCountryDist(data.countryDist ?? []);
    setTopPages(data.topPages ?? []);
    setClickTargets(data.clickTargets ?? []);
    setSections(data.sections ?? []);
    setSessions(data.sessions?.sessions ?? []);
    setSessionsTotal(data.sessions?.total ?? 0);
    setSessionsPage(data.sessions?.page ?? 0);
    setCohort(data.cohort ?? []);
    if (typeof data.meta?.totalEvents === 'number') {
      setEventCount(data.meta.totalEvents);
    }
    setDataTruncated(!!data.meta?.truncated);
    setLastLoadedAt(new Date());
  }, []);

  const fetchAll = useCallback(async (isRetry = false) => {
    if (!isUnlocked) return;
    setLoading(true);
    setError(null);
    setLoadStatus(isRetry ? 'Retrying…' : 'Checking collection…');
    try {
      // live-count is a fast diagnostic call — isolate its failure so a
      // cold-start or timeout there doesn't abort the main dashboard fetch.
      try {
        const liveResult = await devKitCall<{ liveCount: number; totalEvents?: number }>({
          functionId: 'admin-visitor-analytics',
          action: 'live-count',
          timeoutMs: 30_000,
        });
        if (liveResult.ok && typeof liveResult.data.totalEvents === 'number') {
          setEventCount(liveResult.data.totalEvents);
        }
        setLoadStatus(
          liveResult.ok && (liveResult.data.totalEvents ?? 0) > 0
            ? `Loading ${liveResult.data.totalEvents!.toLocaleString()} events for ${range}…`
            : `Loading visitor data for ${range}…`,
        );
      } catch {
        setLoadStatus(`Loading visitor data for ${range}…`);
      }

      const dashboardResult = await devKitCall<DashboardData>({
        functionId: 'admin-visitor-analytics',
        action: 'dashboard',
        payload: { range, page_num: 0 },
        timeoutMs: 300_000,
      });

      if (!dashboardResult.ok) {
        throw dashboardResult.error;
      }

      applyDashboard(dashboardResult.data);

      // Fetch health data in parallel (best-effort, don't block dashboard)
      devKitCall<HealthData>({
        functionId: 'admin-visitor-analytics',
        action: 'health',
        timeoutMs: 30_000,
      }).then((result) => {
        if (result.ok && isMounted()) setHealth(result.data);
      }).catch(() => { /* best-effort */ });
    } catch (err) {
      const devKitErr = toDevKitError(err, { functionId: 'admin-visitor-analytics', action: 'dashboard' });
      // Auto-retry once on transient failures (cold-start, runtime timeout, network blip)
      if (!isRetry && (devKitErr.code === 'NETWORK_ERROR' || devKitErr.code === 'FUNCTION_RUNTIME_FAILED')) {
        setLoadStatus('Function timed out — retrying in 3s…');
        await new Promise(resolve => setTimeout(resolve, 3000));
        if (isMounted()) {
          setLoading(false);
          fetchAll(true);
        }
        return;
      }
      setError(devKitErr.message);
    } finally {
      if (isMounted()) {
        setLoading(false);
        setInitialLoad(false);
        setLoadStatus(null);
      }
    }
  }, [isUnlocked, range, applyDashboard, isMounted]);

  useEffect(() => {
    if (isUnlocked) fetchAll();
  }, [isUnlocked, range, fetchAll]);

  const fetchSessionsPage = useCallback(async (pageNum: number) => {
    try {
      const res = await invoke('sessions', { page_num: pageNum }, 120_000);
      if (res.success) {
        const d = res.data as { sessions: Session[]; total: number; page: number };
        setSessions(d.sessions);
        setSessionsTotal(d.total);
        setSessionsPage(pageNum);
      }
    } catch { /* ignore */ }
  }, [invoke]);

  const fetchClickTargetsForPage = useCallback(async (page: string) => {
    try {
      const res = await invoke('click-targets', { page: page || undefined }, 120_000);
      if (res.success) setClickTargets(res.data as NamedCount[]);
    } catch { /* ignore */ }
  }, [invoke]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const result = await devKitCall<{ csv: string; rowsExported: number; totalInRange: number; truncated: boolean; cap: number }>({
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

  // Auto-refresh: 60s interval, gated on useReducedMotion
  useEffect(() => {
    if (!autoRefresh || prefersReducedMotion || !isUnlocked) {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
      return;
    }
    autoRefreshRef.current = setInterval(() => {
      if (isMounted() && !loading) fetchAll();
    }, 60_000);
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [autoRefresh, prefersReducedMotion, isUnlocked, isMounted, loading, fetchAll]);

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Lock className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Visitor data locked</p>
        <p className="text-xs text-muted-foreground/60">Unlock the admin panel to view visitor intelligence.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Journey drawer */}
      {journeySession && (
        <JourneyDrawer
          sessionId={journeySession.sessionId}
          anonId={journeySession.anonId}
          onClose={() => setJourneySession(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Visitor Intelligence</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real browser-captured data — page views, clicks, section scrolls, and visitor journeys
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dashboard?.live && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="tabular-nums">{dashboard.live.liveCount} live</span>
            </div>
          )}
          {lastLoadedAt && (
            <span className="text-[10px] text-muted-foreground/60 tabular-nums hidden sm:inline">
              {lastLoadedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <RangeSwitcher
            value={range as AnalyticsRange}
            onChange={(r) => setRange(r as VisitorsRange)}
            disabled={loading}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(prev => !prev)}
            className={`flex items-center gap-1.5 ${autoRefresh ? 'bg-primary/10 text-primary border-primary/30' : ''}`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="text-xs">Auto</span>
          </Button>
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
          <Button variant="outline" size="sm" onClick={() => fetchAll()} disabled={loading} className="flex items-center gap-2">
            {loading ? <MiniSpinner size={16} /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <DevKitErrorCard error={error} title="Couldn't load visitor data" context={{ panel: 'Visitors', function: 'admin-visitor-analytics' }} onRetry={() => fetchAll()} />
      )}

      {loading && loadStatus && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 flex items-center gap-3 text-sm text-blue-100">
          <MiniSpinner size={16} />
          <span>{loadStatus}</span>
          {eventCount !== null && eventCount > 0 && (
            <span className="ml-auto text-xs text-blue-200/80 tabular-nums">
              {eventCount.toLocaleString()} events in collection
            </span>
          )}
        </div>
      )}

      {dataTruncated && kpis && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
          Showing the most recent 15,000 events in this range. Narrow the time range for full accuracy on high-traffic periods.
        </div>
      )}

      {initialLoad && loading && !kpis && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />)}
          </div>
          <div className="h-48 rounded-xl bg-muted/40 animate-pulse" />
        </div>
      )}

      {!loading && !kpis && !error && (
        <div className="rounded-xl border border-border bg-muted/20 px-6 py-8 text-center space-y-2">
          <p className="text-sm font-medium text-foreground">No visit data yet</p>
          {eventCount === 0 ? (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-amber-500">visitor_events: 0 documents</span> — no page views ingested yet. Page views are sent to the <code className="text-xs bg-muted px-1 rounded">track-visitor-event</code> function, which writes them server-side via API key. If this stays at 0 under live traffic, verify that function is deployed with Execute = Any and an <code className="text-xs bg-muted px-1 rounded">APPWRITE_API_KEY</code> variable.
            </p>
          ) : eventCount !== null && eventCount > 0 ? (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-green-500">visitor_events: {eventCount.toLocaleString()} documents</span> — data exists but didn't load. Check that <code className="text-xs bg-muted px-1 rounded">admin-visitor-analytics</code> function is deployed and healthy in Diagnostics.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Couldn't determine collection status — verify <code className="text-xs bg-muted px-1 rounded">admin-visitor-analytics</code> is deployed in Diagnostics.
            </p>
          )}
        </div>
      )}

      {kpis && (
        <>
          {eventCount === 0 && kpis.totalVisits === 0 && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              <p className="font-medium">No visitor events recorded yet</p>
              <p className="mt-1 text-xs text-amber-200/90">
                The <span className="font-mono">visitor_events</span> collection is empty. Page views are ingested by the <span className="font-mono">track-visitor-event</span> function (server-side write via API key). If this persists under live traffic, confirm that function is deployed with Execute = Any and a valid <span className="font-mono">APPWRITE_API_KEY</span>.
              </p>
            </div>
          )}

          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard
              label="Visits today" value={kpis.totalVisitsToday.toLocaleString()}
              sub="page views" icon={Globe} accent="primary" hideDelta
            />
            <KpiCard
              label="Unique today" value={kpis.uniqueVisitorsToday.toLocaleString()}
              sub="distinct visitors" icon={Users} accent="green" hideDelta
            />
            <KpiCard
              label="Range visits" value={kpis.totalVisits.toLocaleString()}
              sub="page views in range" icon={BarChart2} accent="blue" hideDelta
            />
            <KpiCard
              label="Unique visitors" value={kpis.uniqueVisitors.toLocaleString()}
              sub={`${kpis.newVisitors} new · ${kpis.returningVisitors} returning`}
              icon={Users} accent="purple" hideDelta
            />
            <KpiCard
              label="Top country"
              value={kpis.topCountry ? `${flag(kpis.topCountry)} ${kpis.topCountry}` : '—'}
              sub={kpis.topCountryCount > 0 ? `${kpis.topCountryCount} visits` : 'no data'}
              icon={Map} accent="amber" hideDelta
            />
            <KpiCard
              label="Mobile / Desktop"
              value={`${kpis.mobilePct}% / ${kpis.desktopPct}%`}
              sub="of page views" icon={Smartphone} accent="rose" hideDelta
            />
          </div>

          {/* World Map + Device / Browser donuts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SectionCard title="Country map" description="Visits by country in selected range" icon={Globe} className="lg:col-span-1">
              <WorldMap countryDist={countryDist} />
            </SectionCard>
            <SectionCard title="Device breakdown" icon={Smartphone}>
              {kpis.deviceBreakdown.length === 0
                ? <EmptyState message="No device data yet" />
                : <Donut items={kpis.deviceBreakdown} />
              }
            </SectionCard>
            <SectionCard title="Browser breakdown" icon={Monitor}>
              {kpis.browserBreakdown.length === 0
                ? <EmptyState message="No browser data yet" />
                : <Donut items={kpis.browserBreakdown} />
              }
            </SectionCard>
          </div>

          {/* Top Pages */}
          <SectionCard
            title="Top pages"
            description="Most visited page paths in the selected range"
            icon={Globe}
          >
            {topPages.length === 0
              ? <EmptyState message="No page view data yet" />
              : <RankedList items={topPages} maxItems={15} />
            }
          </SectionCard>

          {/* Click Heatmap Table */}
          <SectionCard
            title="Click targets"
            description="Most clicked data-track elements, ranked by count. Filter by page to focus."
            icon={MousePointerClick}
            action={
              <div className="flex items-center gap-2">
                <Input
                  value={pageFilter}
                  onChange={(e) => setPageFilter(e.target.value)}
                  placeholder="/page-path"
                  className="h-7 text-xs w-24 sm:w-36"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => fetchClickTargetsForPage(pageFilter)}
                >
                  Filter
                </Button>
                {pageFilter && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => { setPageFilter(''); fetchClickTargetsForPage(''); }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            }
          >
            {clickTargets.length === 0
              ? <EmptyState message="No click data yet — add data-track attributes to key elements" />
              : <RankedList items={clickTargets} maxItems={20} />
            }
          </SectionCard>

          {/* Section Engagement */}
          <SectionCard
            title="Section engagement"
            description="Sections with data-section attribute that visitors scrolled into view for ≥ 2 seconds"
            icon={Layers}
          >
            {sections.length === 0
              ? <EmptyState message="No section data yet — add data-section attributes to key page sections" />
              : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-2 font-medium text-muted-foreground">Section</th>
                      <th className="text-right pb-2 font-medium text-muted-foreground">Views</th>
                      <th className="text-right pb-2 font-medium text-muted-foreground">Unique visitors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {sections.slice(0, 15).map((s, i) => (
                      <tr key={`${s.name}-${i}`}>
                        <td className="py-2 font-medium text-foreground capitalize">{s.name.replace(/-/g, ' ')}</td>
                        <td className="py-2 text-right tabular-nums">{s.count.toLocaleString()}</td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">{(s.uniqueVisitors ?? 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </SectionCard>

          {/* Session List */}
          <SectionCard
            title="Recent sessions"
            description="Click a row to open the full visitor journey"
            icon={Clock}
            action={
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {sessionsTotal > 0 && <span>{sessionsTotal} sessions</span>}
              </div>
            }
          >
            {sessions.length === 0
              ? <EmptyState message="No session data yet" />
              : (
                <div className="space-y-3">
                  {/* Mobile card list */}
                  <div className="flex flex-col gap-2 sm:hidden">
                    {sessions.map((s) => (
                      <button
                        key={s.session_id}
                        className="w-full text-left rounded-lg border border-border bg-muted/10 p-3 hover:bg-muted/20 transition-colors"
                        onClick={() => setJourneySession({ sessionId: s.session_id })}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base leading-none shrink-0">{flag(s.country)}</span>
                            <span className="font-mono text-[10px] text-muted-foreground truncate">{s.anon_id.slice(0, 12)}…</span>
                            {s.user_id && (
                              <span className="text-[9px] bg-primary/15 text-primary rounded px-1 py-0.5 shrink-0">auth</span>
                            )}
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        </div>
                        <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">{deviceIcon(s.device_type)}<span className="capitalize">{s.device_type ?? '?'}</span></span>
                          <span>{s.browser ?? '?'}</span>
                          <span>{s.pageCount} pages</span>
                          <span>{formatDuration(s.durationSeconds)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left pb-2 font-medium text-muted-foreground">Visitor</th>
                          <th className="text-left pb-2 font-medium text-muted-foreground">Country</th>
                          <th className="text-left pb-2 font-medium text-muted-foreground">Device</th>
                          <th className="text-left pb-2 font-medium text-muted-foreground">Browser</th>
                          <th className="text-right pb-2 font-medium text-muted-foreground">Pages</th>
                          <th className="text-right pb-2 font-medium text-muted-foreground">Duration</th>
                          <th className="text-right pb-2 font-medium text-muted-foreground"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {sessions.map((s) => (
                          <tr
                            key={s.session_id}
                            className="cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => setJourneySession({ sessionId: s.session_id })}
                          >
                            <td className="py-2">
                              <div className="font-mono text-[10px] text-muted-foreground truncate max-w-[100px]">
                                {s.anon_id.slice(0, 8)}…
                              </div>
                              {s.user_id && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] bg-primary/15 text-primary rounded px-1 py-0.5 mt-0.5">
                                  authenticated
                                </span>
                              )}
                            </td>
                            <td className="py-2">
                              <span className="text-base leading-none">{flag(s.country)}</span>
                              <span className="ml-1 text-muted-foreground">{s.country ?? '??'}</span>
                            </td>
                            <td className="py-2">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                {deviceIcon(s.device_type)}
                                <span className="capitalize">{s.device_type ?? '?'}</span>
                              </span>
                            </td>
                            <td className="py-2 text-muted-foreground">{s.browser ?? '?'}</td>
                            <td className="py-2 text-right tabular-nums">{s.pageCount}</td>
                            <td className="py-2 text-right tabular-nums text-muted-foreground">{formatDuration(s.durationSeconds)}</td>
                            <td className="py-2 text-right">
                              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground inline-block" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {sessionsTotal > 20 && (
                    <div className="flex items-center justify-between pt-2">
                      <Button
                        variant="outline" size="sm" className="text-xs h-7"
                        disabled={sessionsPage === 0}
                        onClick={() => fetchSessionsPage(sessionsPage - 1)}
                      >
                        Previous
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Page {sessionsPage + 1} of {Math.ceil(sessionsTotal / 20)}
                      </span>
                      <Button
                        variant="outline" size="sm" className="text-xs h-7"
                        disabled={(sessionsPage + 1) * 20 >= sessionsTotal}
                        onClick={() => fetchSessionsPage(sessionsPage + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )
            }
          </SectionCard>

          {/* Journey search */}
          <SectionCard
            title="Journey lookup"
            description="Search by anon_id or session_id to open a full visitor journey"
            icon={Users}
          >
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={journeySearch}
                onChange={(e) => setJourneySearch(e.target.value)}
                placeholder="Paste anon_id or session_id UUID…"
                className="text-xs h-8 font-mono flex-1"
              />
              <Button
                size="sm"
                className="text-xs h-8 shrink-0"
                disabled={!journeySearch.trim()}
                onClick={() => {
                  const v = journeySearch.trim();
                  setJourneySession({ anonId: v });
                }}
              >
                Open Journey
              </Button>
            </div>
          </SectionCard>

          {/* Hourly Heatmap */}
          {dashboard?.heatmap && (
            <SectionCard
              title="Activity heatmap"
              description="Page views by day of week and hour of day"
              icon={Clock}
            >
              <HeatmapDowHour matrix={dashboard.heatmap} />
            </SectionCard>
          )}

          {/* New vs Returning */}
          {dashboard?.returning && (dashboard.returning.newCount > 0 || dashboard.returning.returningCount > 0) && (
            <SectionCard
              title="New vs returning"
              description="Visitor retention based on anonymous ID across sessions"
              icon={Users}
            >
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground tabular-nums">{dashboard.returning.newCount.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">New visitors</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground tabular-nums">{dashboard.returning.returningCount.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Returning</div>
                </div>
                <div className="flex-1">
                  <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                    <div className="h-full bg-blue-500/70" style={{ width: `${(dashboard.returning.newCount / (dashboard.returning.newCount + dashboard.returning.returningCount)) * 100}%` }} />
                    <div className="h-full bg-purple-500/70" style={{ width: `${(dashboard.returning.returningCount / (dashboard.returning.newCount + dashboard.returning.returningCount)) * 100}%` }} />
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                    <span>New</span>
                    <span>Returning</span>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* OS Breakdown + Top Events */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {dashboard?.oses && dashboard.oses.length > 0 && (
              <SectionCard title="Operating systems" icon={Monitor}>
                <RankedList items={dashboard.oses} maxItems={10} />
              </SectionCard>
            )}
            {dashboard?.topEvents && dashboard.topEvents.length > 0 && (
              <SectionCard title="Top interactions" description="Non-page-view events ranked by count" icon={MousePointerClick}>
                <RankedList items={dashboard.topEvents} maxItems={15} />
              </SectionCard>
            )}
          </div>

          {/* Health / Diagnostics */}
          {health && (
            <SectionCard
              title="Diagnostics"
              description="System health and schema verification"
              icon={HeartPulse}
            >
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${health.envFlags.APPWRITE_API_KEY ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-muted-foreground">API Key</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${health.envFlags.APPWRITE_ENDPOINT ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-muted-foreground">Endpoint</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${health.envFlags.APPWRITE_PROJECT_ID ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-muted-foreground">Project ID</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${health.envFlags.DEVKIT_PASSWORD ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-muted-foreground">DevKit Pass</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${health.collectionExists ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-muted-foreground">Collection exists</span>
                  <span className="text-muted-foreground/60 tabular-nums">({health.docCount.toLocaleString()} docs)</span>
                </div>
                {health.latestEventAt && (
                  <div className="text-muted-foreground">
                    Latest event: {new Date(health.latestEventAt).toLocaleString()}
                  </div>
                )}
                {health.missingSchemaFields.length > 0 && (
                  <div className="flex items-start gap-2 text-amber-500">
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
                {dashboard?.errors && Object.keys(dashboard.errors).length > 0 && (
                  <div className="flex items-start gap-2 text-amber-500">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium">Partial errors:</span>{' '}
                      <span className="font-mono text-[10px]">{Object.keys(dashboard.errors).join(', ')}</span>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* Pre-signup cohort */}
          {cohort.length > 0 && (
            <SectionCard
              title="Pre-signup cohort"
              description="Pages that converting visitors (now authenticated) viewed before signing up"
              icon={Users}
            >
              <RankedList items={cohort} maxItems={15} />
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}
