import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Activity, AlertCircle, AlertTriangle, ChevronDown, ChevronRight, CheckCircle2, Clock, Loader2, Lock, Filter, TrendingUp, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { unwrapAdminResponse, formatEdgeError, EdgeFunctionError } from '@/lib/devkit/edgeResponse';
import { useIsMounted, useVisibleInterval } from '@/lib/devkit/hooks';
import { useDevKitSession } from '@/contexts/DevKitSessionContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type InternalTab = 'telemetry' | 'errors';
type SortKey = 'function_name' | 'total_count' | 'last_1h_count' | 'p50_ms' | 'p95_ms' | 'error_rate';
type SortDir = 'asc' | 'desc';
type SeverityFilter = 'all' | 'error' | 'warn';
type TimeRange = '1h' | '6h' | '24h';

interface TelemetryRow {
  function_name: string;
  total_count: number;
  last_1h_count: number;
  error_count: number;
  error_rate: number;
  p50_ms: number;
  p95_ms: number;
  sparkline: number[];
}

interface ErrorRow {
  id: string;
  message: string;
  context: Record<string, unknown> | null;
  source: string | null;
  level: string | null;
  user_id: string | null;
  resolved: boolean;
  reviewed_at: string | null;
  created_at: string;
}

function MiniSparkline({ data }: { data: number[] }) {
  if (!data || data.length === 0) return <span className="text-muted-foreground text-xs">—</span>;
  const max = Math.max(...data, 1);
  const w = 80;
  const h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * (h - 2) - 1;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function LevelBadge({ level }: { level: string | null }) {
  const l = (level ?? 'error').toLowerCase();
  if (l === 'fatal' || l === 'error') {
    return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{l}</Badge>;
  }
  if (l === 'warn' || l === 'warning') {
    return <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">{l}</Badge>;
  }
  return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{l}</Badge>;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const TIME_RANGE_MS: Record<TimeRange, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
};

export function ObservabilityPanel() {
  const { isUnlocked, lock } = useDevKitSession();
  const isMounted = useIsMounted();
  const [sessionExpired, setSessionExpired] = useState(false);
  const [sessionExpiredDetail, setSessionExpiredDetail] = useState<string | null>(null);

  const handleResignIn = useCallback(() => {
    // Force a full re-login. The current session token has been rejected by
    // the server (HTTP 401), so we clear remembered state and surface the
    // unlock screen with the email/password/TOTP form.
    lock();
  }, [lock]);

  const detect401 = useCallback((e: unknown): boolean => {
    if (e instanceof EdgeFunctionError && e.status === 401) {
      setSessionExpired(true);
      setSessionExpiredDetail(e.message || 'Unauthorized');
      return true;
    }
    return false;
  }, []);

  const [activeTab, setActiveTab] = useState<InternalTab>('telemetry');

  const [fnFilter, setFnFilter] = useState('');

  // Telemetry state
  const [telemetry, setTelemetry] = useState<TelemetryRow[]>([]);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);
  const [telemetryMissing, setTelemetryMissing] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('total_count');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [telemetryUpdatedAt, setTelemetryUpdatedAt] = useState<Date | null>(null);

  // Error stream state
  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [errorsLoading, setErrorsLoading] = useState(false);
  const [errorsError, setErrorsError] = useState<string | null>(null);
  const [errorsMissing, setErrorsMissing] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [errorsUpdatedAt, setErrorsUpdatedAt] = useState<Date | null>(null);

  const fetchTelemetry = useCallback(async () => {
    if (!isUnlocked) return;
    setTelemetryLoading(true);
    setTelemetryError(null);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: { action: 'observability', obs_action: 'get_telemetry' },
      });
      const result = unwrapAdminResponse<{ telemetry?: TelemetryRow[]; missing_table?: boolean }>(tuple, 'admin-devkit-data');
      if (!isMounted()) return;
      if (result.missing_table) {
        setTelemetryMissing(true);
        setTelemetry([]);
      } else {
        setTelemetryMissing(false);
        setTelemetry(result.telemetry ?? []);
        setTelemetryUpdatedAt(new Date());
      }
    } catch (e) {
      if (!isMounted()) return;
      if (detect401(e)) {
        setTelemetryError('DevKit session was rejected by the server (401).');
      } else {
        setTelemetryError(formatEdgeError(e, 'Failed to load telemetry'));
      }
    } finally {
      if (isMounted()) setTelemetryLoading(false);
    }
  }, [isUnlocked, isMounted, detect401]);

  const fetchErrors = useCallback(async () => {
    if (!isUnlocked) return;
    setErrorsLoading(true);
    setErrorsError(null);
    try {
      const since = new Date(Date.now() - TIME_RANGE_MS[timeRange]).toISOString();
      const tuple = await edgeFunctions.functions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: {
          action: 'observability',
          obs_action: 'get_error_stream',
          function_name: fnFilter.trim() || undefined,
          severity: severityFilter === 'all' ? undefined : severityFilter,
          since,
        },
      });
      const result = unwrapAdminResponse<{ errors?: ErrorRow[]; missing_table?: boolean }>(tuple, 'admin-devkit-data');
      if (!isMounted()) return;
      if (result.missing_table) {
        setErrorsMissing(true);
        setErrors([]);
      } else {
        setErrorsMissing(false);
        setErrors(result.errors ?? []);
        setErrorsUpdatedAt(new Date());
      }
    } catch (e) {
      if (!isMounted()) return;
      if (detect401(e)) {
        setErrorsError('DevKit session was rejected by the server (401).');
      } else {
        setErrorsError(formatEdgeError(e, 'Failed to load error stream'));
      }
    } finally {
      if (isMounted()) setErrorsLoading(false);
    }
  }, [isUnlocked, isMounted, fnFilter, severityFilter, timeRange, detect401]);

  useEffect(() => {
    if (isUnlocked) { fetchTelemetry(); }
  }, [isUnlocked, fetchTelemetry]);

  useEffect(() => {
    if (isUnlocked) { fetchErrors(); }
  }, [isUnlocked, fetchErrors]);

  useVisibleInterval(() => { fetchTelemetry(); }, 30_000, isUnlocked);
  useVisibleInterval(() => { if (activeTab === 'errors') fetchErrors(); }, 30_000, isUnlocked);

  const markReviewed = useCallback(async (errorId: string) => {
    setReviewingId(errorId);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: { action: 'observability', obs_action: 'mark_reviewed', error_id: errorId },
      });
      unwrapAdminResponse(tuple, 'admin-devkit-data (mark_reviewed)');
      setErrors(prev => prev.map(e => e.id === errorId ? { ...e, resolved: true, reviewed_at: new Date().toISOString() } : e));
      toast.success('Error marked as reviewed');
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to mark reviewed'));
    } finally {
      setReviewingId(null);
    }
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedErrors(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedTelemetry = [...telemetry]
    .filter(r => !fnFilter.trim() || r.function_name.toLowerCase().includes(fnFilter.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const an = av as number;
      const bn = bv as number;
      return sortDir === 'asc' ? an - bn : bn - an;
    });

  const SortHeader = ({ col, label }: { col: SortKey; label: string }) => (
    <button
      onClick={() => handleSort(col)}
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      {sortKey === col && (
        <span className="text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  );

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Lock className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Observability locked</p>
        <p className="text-xs text-muted-foreground/60">Unlock the admin panel to view observability data.</p>
      </div>
    );
  }

  const tabs: { id: InternalTab; label: string; icon: React.ElementType }[] = [
    { id: 'telemetry', label: 'Telemetry', icon: TrendingUp },
    { id: 'errors', label: 'Error Stream', icon: AlertCircle },
  ];

  return (
    <div className="space-y-4">
      {sessionExpired && (
        <div className="rounded-md bg-red-500/5 border border-red-500/20 p-3 text-xs text-red-600 dark:text-red-400 space-y-2">
          <p className="font-medium">
            Your DevKit session is no longer valid on the server.
          </p>
          <p>
            Sign in again with your full credentials to issue a new session token. This panel will reload automatically once you unlock.
          </p>
          {sessionExpiredDetail && (
            <p className="font-mono text-[11px] opacity-70">
              Server response: {sessionExpiredDetail}
            </p>
          )}
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={handleResignIn}
            className="gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign in again
          </Button>
        </div>
      )}

      {/* Tab bar + shared function filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={fnFilter}
              onChange={e => setFnFilter(e.target.value)}
              placeholder="Filter by function…"
              className="h-8 pl-8 pr-3 rounded-md text-xs border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => activeTab === 'telemetry' ? fetchTelemetry() : fetchErrors()}
            disabled={telemetryLoading || errorsLoading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', (telemetryLoading || errorsLoading) && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── TELEMETRY TAB ──────────────────────────────────────────── */}
      {activeTab === 'telemetry' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Req (1h) = last hour · Req (24h) = rolling day · auto-refreshes every 30s
              {telemetryUpdatedAt && <> · updated {formatRelative(telemetryUpdatedAt.toISOString())}</>}
            </p>
          </div>

          {telemetryError && (
            <DevKitErrorCard
              error={telemetryError}
              title="Couldn't load telemetry"
              context={{ panel: 'Observability · Telemetry', function: 'admin-devkit-data', action: 'observability' }}
            />
          )}

          {telemetryMissing && (
            <div className="p-4 rounded-lg bg-muted/40 border border-border text-sm text-muted-foreground text-center">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No telemetry data yet</p>
              <p className="text-xs mt-1">The <code className="font-mono">edge_function_logs</code> table doesn't exist yet. Apply the latest migration to enable telemetry collection.</p>
            </div>
          )}

          {!telemetryMissing && telemetryLoading && telemetry.length === 0 && (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-muted/40 animate-pulse" />
              ))}
            </div>
          )}

          {!telemetryMissing && !telemetryLoading && telemetry.length === 0 && !telemetryError && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No invocations recorded in the last 24h
            </div>
          )}

          {sortedTelemetry.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr>
                      <th className="px-4 py-2.5 text-left">
                        <SortHeader col="function_name" label="Function" />
                      </th>
                      <th className="px-4 py-2.5 text-right">
                        <SortHeader col="last_1h_count" label="Req (1h)" />
                      </th>
                      <th className="px-4 py-2.5 text-right">
                        <SortHeader col="total_count" label="Req (24h)" />
                      </th>
                      <th className="px-4 py-2.5 text-right">
                        <SortHeader col="p50_ms" label="P50 ms" />
                      </th>
                      <th className="px-4 py-2.5 text-right">
                        <SortHeader col="p95_ms" label="P95 ms" />
                      </th>
                      <th className="px-4 py-2.5 text-right">
                        <SortHeader col="error_rate" label="Error %" />
                      </th>
                      <th className="px-4 py-2.5 text-right pr-4">
                        <span className="text-xs font-medium text-muted-foreground">24h Volume</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sortedTelemetry.map(row => (
                      <tr key={row.function_name} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5">
                          <code className="text-xs font-mono text-foreground">{row.function_name}</code>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-sm font-medium">
                          {row.last_1h_count.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-sm text-muted-foreground">
                          {row.total_count.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-sm">
                          {row.p50_ms}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-sm">
                          <span className={cn(row.p95_ms > 3000 ? 'text-amber-600 dark:text-amber-400' : '')}>
                            {row.p95_ms}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={cn(
                            'text-sm tabular-nums font-medium',
                            row.error_rate > 10 ? 'text-destructive' :
                            row.error_rate > 2 ? 'text-amber-600 dark:text-amber-400' :
                            'text-green-600 dark:text-green-400',
                          )}>
                            {row.error_rate}%
                          </span>
                        </td>
                        <td className="px-4 py-2.5 flex justify-end">
                          <MiniSparkline data={row.sparkline} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ERROR STREAM TAB ───────────────────────────────────────── */}
      {activeTab === 'errors' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Severity */}
            <div className="flex gap-1 p-0.5 rounded-md bg-muted/40 border border-border text-xs">
              {(['all', 'error', 'warn'] as SeverityFilter[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSeverityFilter(s)}
                  className={cn(
                    'px-2.5 py-1 rounded transition-colors',
                    severityFilter === s ? 'bg-background text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {s === 'all' ? 'All' : s === 'error' ? 'Error' : 'Warn'}
                </button>
              ))}
            </div>

            {/* Time range */}
            <div className="flex gap-1 p-0.5 rounded-md bg-muted/40 border border-border text-xs">
              {(['1h', '6h', '24h'] as TimeRange[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTimeRange(t)}
                  className={cn(
                    'px-2.5 py-1 rounded transition-colors',
                    timeRange === t ? 'bg-background text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <p className="ml-auto text-xs text-muted-foreground">
              {errors.length > 0 && `${errors.length} entries`}
              {errorsUpdatedAt && <> · {formatRelative(errorsUpdatedAt.toISOString())}</>}
            </p>
          </div>

          {errorsError && (
            <DevKitErrorCard
              error={errorsError}
              title="Couldn't load error log"
              context={{ panel: 'Observability · Errors', function: 'admin-devkit-data', action: 'observability' }}
            />
          )}

          {errorsMissing && (
            <div className="p-4 rounded-lg bg-muted/40 border border-border text-sm text-muted-foreground text-center">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium">error_log table not found</p>
              <p className="text-xs mt-1">Apply pending migrations to enable the error stream.</p>
            </div>
          )}

          {!errorsMissing && errorsLoading && errors.length === 0 && (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />
              ))}
            </div>
          )}

          {!errorsMissing && !errorsLoading && errors.length === 0 && !errorsError && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30 text-green-500" />
              No errors in this window
            </div>
          )}

          {errors.length > 0 && (
            <div className="space-y-2">
              {errors.map(err => {
                const isExpanded = expandedErrors.has(err.id);
                const isReviewed = !!err.reviewed_at;
                return (
                  <div
                    key={err.id}
                    className={cn(
                      'rounded-xl border transition-colors',
                      isReviewed ? 'opacity-50 border-border bg-muted/20' : 'border-border bg-card',
                    )}
                  >
                    <div
                      className="flex items-start gap-3 p-3 cursor-pointer"
                      onClick={() => toggleExpand(err.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && toggleExpand(err.id)}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isExpanded
                          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <LevelBadge level={err.level} />
                          {err.source && (
                            <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {err.source}
                            </code>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRelative(err.created_at)}
                          </span>
                          {isReviewed && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                              Reviewed
                            </span>
                          )}
                        </div>
                        <p className={cn(
                          'text-sm mt-1 text-foreground',
                          !isExpanded && 'truncate',
                        )}>
                          {err.message}
                        </p>
                      </div>

                      {!isReviewed && (
                        <button
                          onClick={e => { e.stopPropagation(); markReviewed(err.id); }}
                          disabled={reviewingId === err.id}
                          className="shrink-0 flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-border hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground"
                        >
                          {reviewingId === err.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <CheckCircle2 className="w-3 h-3" />}
                          {reviewingId === err.id ? 'Saving…' : 'Mark reviewed'}
                        </button>
                      )}
                    </div>

                    {isExpanded && (() => {
                      const ctx = err.context as Record<string, unknown> | null;
                      const rawStack = ctx?.stack ?? ctx?.stackTrace ?? ctx?.stack_trace;
                      const stackStr = typeof rawStack === 'string' ? rawStack : null;
                      const contextWithoutStack = ctx ? Object.fromEntries(
                        Object.entries(ctx).filter(([k]) => !['stack', 'stackTrace', 'stack_trace'].includes(k))
                      ) : null;
                      const hasContext = contextWithoutStack && Object.keys(contextWithoutStack).length > 0;
                      return (
                        <div className="border-t border-border px-3 py-3 space-y-3 bg-muted/20 rounded-b-xl">
                          <div>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Message</p>
                            <p className="text-sm font-mono text-foreground bg-muted/40 rounded-lg p-2.5 break-all whitespace-pre-wrap">{err.message}</p>
                          </div>
                          {stackStr && (
                            <div>
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Stack Trace</p>
                              <pre className="text-[11px] font-mono text-foreground bg-muted/40 rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                                {stackStr}
                              </pre>
                            </div>
                          )}
                          {hasContext && (
                            <div>
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Context</p>
                              <pre className="text-[11px] font-mono text-foreground bg-muted/40 rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap break-all">
                                {JSON.stringify(contextWithoutStack, null, 2)}
                              </pre>
                            </div>
                          )}
                          {err.user_id && (
                            <p className="text-xs text-muted-foreground">
                              User ID: <code className="font-mono">{err.user_id}</code>
                            </p>
                          )}
                          {!stackStr && !hasContext && !err.user_id && (
                            <p className="text-xs text-muted-foreground">No additional context available.</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
