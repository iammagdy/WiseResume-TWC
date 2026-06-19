import { useState, useCallback, useEffect } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { RefreshCw, Activity, CheckCircle, AlertCircle, Clock, PlayCircle, XCircle, AlertTriangle, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { useAuth } from '@/hooks/useAuth';
import { getDevKitToken, useDevKitSession, onDevKitLock } from '@/contexts/DevKitSessionContext';
import { useVisibleInterval, useIsMounted } from '@/lib/devkit/hooks';
import { unwrapAdminResponse, tryUnwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { DevKitRunner } from './DevKitRunner';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { DevKitErrorCard, redactSecrets } from './DevKitErrorCard';
import { resumeSectionAiBodyProps } from '@/lib/resumeSectionAiFlag';

interface UsageEvent {
  id: string;
  user_id: string | null;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface ErrorLogRow {
  id: string;
  message: string;
  context: string | null;
  created_at: string;
  level: string | null;
}

type HealthStatus = 'unknown' | 'ok' | 'warn' | 'error' | 'checking';

interface FnHealth {
  name: string;
  label: string;
  status: HealthStatus;
  lastChecked: Date | null;
  errorMsg?: string;
  durationMs?: number;
}

interface EdgeFunctionDef {
  name: string;
  label: string;
  buildBody: (adminPassword: string) => Record<string, unknown>;
  classify: (data: unknown, error: unknown) => HealthStatus;
  errMsg: (data: unknown, error: unknown) => string | undefined;
}

type InvokeError = { status?: number; message?: string } | null;
type ResponseData = { error?: string; success?: boolean } | null;

function classifyEdgeFunctionResponse(data: unknown, error: unknown): HealthStatus {
  const err = error as InvokeError;
  if (!err) {
    const d = data as ResponseData;
    if (d?.error) return 'warn';
    return 'ok';
  }
  const status = err.status;
  if (typeof status === 'number') {
    if (status === 404) return 'error';
    if (status >= 400 && status < 500) return 'warn';
    if (status >= 500) return 'error';
  }
  return 'error';
}

function extractErrMsg(data: unknown, error: unknown): string | undefined {
  const err = error as InvokeError;
  if (err?.message) return err.message;
  const d = data as ResponseData;
  if (d?.error) return d.error;
  return undefined;
}

function classifyAiEndpointResponse(data: unknown, error: unknown): HealthStatus {
  const err = error as InvokeError;
  if (!err) return 'ok';
  const status = err.status;
  if (typeof status === 'number') {
    if (status === 404) return 'error';
    if (status === 401) return 'warn';
    if (status >= 400 && status < 500) return 'warn';
    if (status >= 500) return 'error';
  }
  return 'error';
}

function extractAiErrMsg(data: unknown, error: unknown): string | undefined {
  const err = error as InvokeError;
  if (!err) return undefined;
  if (err?.message) return err.message;
  const d = data as ResponseData;
  if (d?.error) return d.error;
  return undefined;
}

const LIGHTWEIGHT_FN_DEFS: EdgeFunctionDef[] = [
  {
    name: 'admin-devkit-data',
    label: 'admin-devkit-data:list-users-page',
    buildBody: () => ({ action: 'list-users-page', page: 0, pageSize: 1 }),
    classify: classifyEdgeFunctionResponse,
    errMsg: extractErrMsg,
  },
  {
    name: 'admin-devkit-data',
    label: 'admin-devkit-data:diagnostics',
    buildBody: () => ({ action: 'diagnostics' }),
    classify: classifyEdgeFunctionResponse,
    errMsg: extractErrMsg,
  },
  {
    name: 'admin-devkit-data',
    label: 'admin-devkit-data:list-audit-logs',
    buildBody: () => ({ action: 'list-audit-logs', limit: 1 }),
    classify: classifyEdgeFunctionResponse,
    errMsg: extractErrMsg,
  },
];

const AI_FN_DEFS: EdgeFunctionDef[] = [
  {
    name: 'tailor-resume',
    label: 'tailor-resume',
    buildBody: () => ({ resume: {}, jobDescription: '', intensity: 'light' }),
    classify: classifyAiEndpointResponse,
    errMsg: extractAiErrMsg,
  },
  {
    name: 'agentic-chat',
    label: 'agentic-chat',
    buildBody: () => ({ message: '', conversationHistory: [], currentResume: null }),
    classify: classifyAiEndpointResponse,
    errMsg: extractAiErrMsg,
  },
  {
    name: 'resume-section-ai',
    label: 'resume-section-ai:enhance',
    buildBody: () => ({ ...resumeSectionAiBodyProps('enhance-section'), section: 'summary', sectionName: 'summary', content: '', currentContent: '', context: {} }),
    classify: classifyAiEndpointResponse,
    errMsg: extractAiErrMsg,
  },
  {
    name: 'analyze-resume',
    label: 'analyze-resume',
    buildBody: () => ({ resume: {}, jobDescription: '' }),
    classify: classifyAiEndpointResponse,
    errMsg: extractAiErrMsg,
  },
];

const ALL_FN_DEFS: EdgeFunctionDef[] = [...LIGHTWEIGHT_FN_DEFS, ...AI_FN_DEFS];

interface RecentError {
  id: string;
  source: string;
  message: string;
  level: string;
  timestamp: string;
}

interface ContactRequest {
  id: string;
  type: string;
  email: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

function StatusDot({ status }: { status: HealthStatus }) {
  if (status === 'checking') return <MiniSpinner size={12} className="text-muted-foreground" />;
  if (status === 'ok') return <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" title="OK" />;
  if (status === 'warn') return <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" title="Degraded" />;
  if (status === 'error') return <span className="w-2.5 h-2.5 rounded-full bg-destructive inline-block" title="Error" />;
  return <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40 inline-block" title="Not tested" />;
}

function StatusIcon({ status }: { status: HealthStatus }) {
  if (status === 'ok') return <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />;
  if (status === 'warn') return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
  if (status === 'error') return <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />;
  return null;
}

function cardBg(status: HealthStatus): string {
  if (status === 'ok') return 'border-green-500/20 bg-green-500/5';
  if (status === 'warn') return 'border-amber-500/20 bg-amber-500/5';
  if (status === 'error') return 'border-destructive/20 bg-destructive/5';
  return 'border-border bg-muted/20';
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

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/**
 * Module-level cache: survives component unmounts (tab switching) within the same
 * page session. Initialised once; updated on every state change so re-mounting the
 * component restores the last-known results instead of resetting to defaults.
 */
const _defaultFnHealth: FnHealth[] = ALL_FN_DEFS.map(f => ({
  name: f.name, label: f.label, status: 'unknown' as HealthStatus, lastChecked: null,
}));

const _cache: {
  events: UsageEvent[];
  eventsError: string | null;
  errorLogs: ErrorLogRow[];
  errorLogsMissing: boolean;
  recentErrors: RecentError[];
  contactRequests: ContactRequest[];
  fnHealth: FnHealth[];
  healthRunning: boolean;
  healthCheckedAt: Date | null;
} = {
  events: [],
  eventsError: null,
  errorLogs: [],
  errorLogsMissing: false,
  recentErrors: [],
  contactRequests: [],
  fnHealth: _defaultFnHealth,
  healthRunning: false,
  healthCheckedAt: null,
};

function clearCache() {
  _cache.events = [];
  _cache.eventsError = null;
  _cache.errorLogs = [];
  _cache.errorLogsMissing = false;
  _cache.recentErrors = [];
  _cache.contactRequests = [];
  _cache.fnHealth = _defaultFnHealth;
  _cache.healthRunning = false;
  _cache.healthCheckedAt = null;
}

onDevKitLock(clearCache);

export function LiveActivityPanel() {
  const { isUnlocked } = useDevKitSession();
  const { isAuthenticated } = useAuth();
  const [events, setEventsRaw] = useState<UsageEvent[]>(_cache.events);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsErrorRaw] = useState<string | null>(_cache.eventsError);
  const [feedSecondsAgo, setFeedSecondsAgo] = useState(0);

  const [errorLogs, setErrorLogsRaw] = useState<ErrorLogRow[]>(_cache.errorLogs);
  const [errorLogsMissing, setErrorLogsMissingRaw] = useState(_cache.errorLogsMissing);
  const [recentErrors, setRecentErrorsRaw] = useState<RecentError[]>(_cache.recentErrors);

  const [contactRequests, setContactRequestsRaw] = useState<ContactRequest[]>(_cache.contactRequests);
  const [contactRequestsLoading, setContactRequestsLoading] = useState(false);

  const [fnHealth, setFnHealthRaw] = useState<FnHealth[]>(_cache.fnHealth);
  const [healthRunning, setHealthRunningRaw] = useState(_cache.healthRunning);
  const [healthCheckedAt, setHealthCheckedAtRaw] = useState<Date | null>(_cache.healthCheckedAt);

  // Cache-syncing setters
  const setEvents = (v: UsageEvent[]) => { _cache.events = v; setEventsRaw(v); };
  const setEventsError = (v: string | null) => { _cache.eventsError = v; setEventsErrorRaw(v); };
  const setErrorLogs = (v: ErrorLogRow[]) => { _cache.errorLogs = v; setErrorLogsRaw(v); };
  const setErrorLogsMissing = (v: boolean) => { _cache.errorLogsMissing = v; setErrorLogsMissingRaw(v); };
  const setRecentErrors = (v: RecentError[]) => { _cache.recentErrors = v; setRecentErrorsRaw(v); };
  const setContactRequests = (v: ContactRequest[]) => { _cache.contactRequests = v; setContactRequestsRaw(v); };
  const setFnHealth = (updater: FnHealth[] | ((prev: FnHealth[]) => FnHealth[])) => {
    const next = typeof updater === 'function' ? updater(_cache.fnHealth) : updater;
    _cache.fnHealth = next;
    setFnHealthRaw(next);
  };
  const setHealthRunning = (v: boolean) => { _cache.healthRunning = v; setHealthRunningRaw(v); };
  const setHealthCheckedAt = (v: Date | null) => { _cache.healthCheckedAt = v; setHealthCheckedAtRaw(v); };

  const isMounted = useIsMounted();

  const fetchEvents = useCallback(async () => {
    const token = getDevKitToken();
    if (!token) return;
    setEventsLoading(true);
    setEventsError(null);
    try {
      const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: { action: 'live-activity', resource: 'usage_events' },
      });
      const result = unwrapAdminResponse<UsageEvent[]>(tuple, 'admin-devkit-data (usage_events)');
      if (!isMounted()) return;
      setEvents(Array.isArray(result) ? result : []);
      setFeedSecondsAgo(0);
    } catch (e) {
      if (!isMounted()) return;
      setEventsError(formatEdgeError(e, 'Failed to load events'));
    } finally {
      if (isMounted()) setEventsLoading(false);
    }
  }, [isMounted]);

  const fetchErrorLogs = useCallback(async () => {
    const token = getDevKitToken();
    if (!token) return;
    const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
      headers: devKitAuthHeaders(),
      body: { action: 'live-activity', resource: 'error_log' },
    });
    const result = tryUnwrapAdminResponse<{ missing?: boolean; data?: ErrorLogRow[] }>(tuple, 'admin-devkit-data (error_log)');
    if (!isMounted()) return;
    if (!result) return;
    if (result.missing) {
      setErrorLogsMissing(true);
      return;
    }
    setErrorLogsMissing(false);
    setErrorLogs(result.data ?? []);
  }, [isMounted]);

  const fetchContactRequests = useCallback(async () => {
    const token = getDevKitToken();
    if (!token) return;
    setContactRequestsLoading(true);
    try {
      const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: { action: 'live-activity', resource: 'contact_requests' },
      });
      const result = tryUnwrapAdminResponse<{ missing?: boolean; data?: ContactRequest[] } | ContactRequest[]>(
        tuple,
        'admin-devkit-data (contact_requests)',
      );
      if (!isMounted()) return;
      if (result) {
        setContactRequests(Array.isArray(result) ? result : (result.data ?? []));
      }
    } finally {
      if (isMounted()) setContactRequestsLoading(false);
    }
  }, [isMounted]);

  const runHealthChecksForDefs = useCallback(async (defs: EdgeFunctionDef[]) => {
    setHealthRunning(true);
    const names = new Set(defs.map(d => d.name));
    setFnHealth(prev => prev.map(f => names.has(f.name) ? { ...f, status: 'checking' as HealthStatus } : f));

    const checkedResults: FnHealth[] = [];
    const newErrors: RecentError[] = [];

    for (const def of defs) {
      // Some probes are user-scoped and require an active Kinde/Supabase session.
      // • `me` — obvious user-identity call.
      // • `agentic-chat` / `analyze-resume` / `generate-cover-letter` / `parse-job`
      //   all call requireAuth at the top of their handler. Probing without a
      //   session always returns 401 AND (pre-Task #41) wrote a "Missing
      //   authorization header" entry into error_log via the outer catch.
      //   The outer catch is now AuthError-aware, but skipping these probes
      //   cleanly when unauthenticated keeps the DevKit health card honest.
      const requiresUserSession = def.name === 'me' || def.name === 'tailor-resume' || def.name === 'agentic-chat' || def.name === 'analyze-resume' || def.name === 'generate-cover-letter' || def.name === 'parse-job' || def.name === 'resume-section-ai';
      if (requiresUserSession && !isAuthenticated) {
        checkedResults.push({
          name: def.name,
          label: def.label,
          status: 'unknown',
          lastChecked: new Date(),
          errorMsg: 'Skipped — sign in to the main app first',
          durationMs: 0,
        });
        continue;
      }
      const start = Date.now();
      try {
        const body = def.buildBody(getDevKitToken() ?? '');
        const isAdminFn = def.name.startsWith('admin-');
        const { data, error } = await appwriteFunctions.invoke(def.name, {
          ...(isAdminFn ? { headers: devKitAuthHeaders() } : {}),
          body,
        });
        const durationMs = Date.now() - start;
        const status = def.classify(data, error);
        const errorMsg = def.errMsg(data, error);

        if (status === 'error' || status === 'warn') {
          newErrors.push({
            id: `${def.name}-${Date.now()}`,
            source: def.label,
            message: errorMsg ?? `${def.label} returned ${status}`,
            level: status === 'error' ? 'error' : 'warn',
            timestamp: new Date().toISOString(),
          });
        }

        checkedResults.push({
          name: def.name, label: def.label, status, lastChecked: new Date(), errorMsg, durationMs,
        });
      } catch (e) {
        const durationMs = Date.now() - start;
        const msg = String(e);
        checkedResults.push({
          name: def.name, label: def.label, status: 'error', lastChecked: new Date(),
          errorMsg: msg, durationMs,
        });
        newErrors.push({
          id: `${def.name}-${Date.now()}`,
          source: def.label,
          message: msg,
          level: 'error',
          timestamp: new Date().toISOString(),
        });
      }
    }

    if (!isMounted()) return;
    const checkedMap = new Map(checkedResults.map(r => [r.name, r]));
    setFnHealth(prev => prev.map(f => checkedMap.get(f.name) ?? f));
    setHealthRunning(false);
    setHealthCheckedAt(new Date());

    if (errorLogsMissing && newErrors.length > 0) {
      setRecentErrors(newErrors);
    }
  }, [errorLogsMissing, isMounted, isAuthenticated]);

  const runAllHealthChecks = useCallback(() => {
    return runHealthChecksForDefs(ALL_FN_DEFS);
  }, [runHealthChecksForDefs]);

  const runLightweightHealthChecks = useCallback(() => {
    return runHealthChecksForDefs(LIGHTWEIGHT_FN_DEFS);
  }, [runHealthChecksForDefs]);

  useEffect(() => {
    const unsubscribe = onDevKitLock(() => {
      clearCache();
      setEventsRaw([]);
      setEventsErrorRaw(null);
      setErrorLogsRaw([]);
      setErrorLogsMissingRaw(false);
      setRecentErrorsRaw([]);
      setContactRequestsRaw([]);
      setFnHealthRaw(_defaultFnHealth);
      setHealthRunningRaw(false);
      setHealthCheckedAtRaw(null);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isUnlocked) { fetchEvents(); }
  }, [isUnlocked, fetchEvents]);
  useEffect(() => {
    if (isUnlocked) { fetchErrorLogs(); }
  }, [isUnlocked, fetchErrorLogs]);
  useEffect(() => {
    if (isUnlocked) { fetchContactRequests(); }
  }, [isUnlocked, fetchContactRequests]);

  // Visibility-aware: pauses while the tab is hidden so we don't keep hitting
  // edge functions while the admin is away. Resumes automatically on focus.
  useVisibleInterval(() => {
    fetchEvents();
    fetchErrorLogs();
    fetchContactRequests();
  }, 30_000, isUnlocked);

  useVisibleInterval(() => {
    runLightweightHealthChecks();
  }, 30_000, isUnlocked);

  useEffect(() => {
    if (!isUnlocked) return;
    const interval = setInterval(() => {
      setFeedSecondsAgo(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isUnlocked]);

  const feedLastUpdatedLabel = feedSecondsAgo < 60
    ? `${feedSecondsAgo}s ago`
    : `${Math.floor(feedSecondsAgo / 60)}m ago`;

  const healthOk = fnHealth.filter(f => f.status === 'ok').length;
  const healthWarn = fnHealth.filter(f => f.status === 'warn').length;
  const healthError = fnHealth.filter(f => f.status === 'error').length;
  const healthUnknown = fnHealth.filter(f => f.status === 'unknown').length;

  const effectiveErrors: { id: string; source: string; message: string; level: string; timestamp: string }[] =
    errorLogsMissing
      ? recentErrors
      : errorLogs.map(r => ({
          id: r.id,
          source: 'error_log',
          message: r.message,
          level: r.level ?? 'error',
          timestamp: r.created_at,
        }));

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Lock className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Live Activity locked</p>
        <p className="text-xs text-muted-foreground/60">Unlock the admin panel to view live activity data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Live Activity</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Feed updated {feedLastUpdatedLabel} · auto-refreshes every 30s
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchEvents} disabled={eventsLoading} className="flex items-center gap-2">
          {eventsLoading ? <MiniSpinner size={16} /> : <RefreshCw className="w-4 h-4" />}
          Refresh Feed
        </Button>
      </div>

      {/* Edge Function Health */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
            <Activity className="w-4 h-4 text-primary" />
            Edge Function Health
            {healthUnknown < ALL_FN_DEFS.length && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                healthError > 0 ? 'bg-destructive/10 text-destructive' :
                healthWarn > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                'bg-green-500/10 text-green-600 dark:text-green-400'
              }`}>
                {healthOk} OK{healthWarn > 0 ? ` · ${healthWarn} warn` : ''}{healthError > 0 ? ` · ${healthError} error` : ''}
              </span>
            )}
            {healthCheckedAt && !healthRunning && (
              <span className="text-xs font-normal text-muted-foreground">
                · last checked {formatRelative(healthCheckedAt.toISOString())}
              </span>
            )}
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={healthRunning}
            onClick={runAllHealthChecks}
            className="flex items-center gap-1.5 h-8 text-xs"
          >
            {healthRunning
              ? <><MiniSpinner size={14} />Checking…</>
              : <><PlayCircle className="w-3.5 h-3.5" />Run health check</>
            }
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {fnHealth.map((fn) => {
            const isAi = AI_FN_DEFS.some(d => d.name === fn.name);
            return (
            <div
              key={fn.name}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${cardBg(fn.status)}`}
            >
              <StatusDot status={fn.status} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground font-mono">{fn.label}</p>
                {fn.status === 'unknown' && fn.errorMsg && (
                  <p className="text-[10px] text-muted-foreground truncate">{redactSecrets(fn.errorMsg)}</p>
                )}
                {isAi && fn.status === 'unknown' && !fn.errorMsg && (
                  <p className="text-[10px] text-muted-foreground">Tap "Run health check" to test</p>
                )}
                {fn.status === 'error' && fn.errorMsg && (
                  <div className="mt-1">
                    <DevKitErrorCard
                      error={fn.errorMsg}
                      title={`${fn.label} health check failed`}
                      compact
                      context={{ panel: 'Live Activity · Function Health', function: fn.label, action: 'health-check' }}
                    />
                  </div>
                )}
                {fn.status === 'warn' && fn.errorMsg && (
                  <div className="mt-1">
                    <DevKitErrorCard
                      error={fn.errorMsg}
                      title={`${fn.label} returned a warning`}
                      compact
                      context={{ panel: 'Live Activity · Function Health', function: fn.label, action: 'health-check' }}
                    />
                  </div>
                )}
                <div className="flex items-center gap-2 mt-0.5">
                  {fn.durationMs !== undefined && fn.status !== 'checking' && (
                    <p className="text-[10px] text-muted-foreground">{fn.durationMs}ms</p>
                  )}
                  {fn.lastChecked && fn.status !== 'checking' && (
                    <p className="text-[10px] text-muted-foreground">
                      · tested {formatRelative(fn.lastChecked.toISOString())}
                    </p>
                  )}
                </div>
              </div>
              <StatusIcon status={fn.status} />
            </div>
            );
          })}
        </div>
        {healthUnknown === ALL_FN_DEFS.length && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            Admin functions auto-check every 30s. Click "Run health check" to also probe AI endpoints.
          </p>
        )}
      </div>

      {/* Error Log */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <XCircle className="w-4 h-4 text-destructive" />
          <p className="text-sm font-semibold text-foreground">Error Log</p>
          {effectiveErrors.length > 0 && (
            <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">
              {effectiveErrors.length}
            </span>
          )}
        </div>

        {errorLogsMissing && (
          <div className="mx-5 my-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                The <code className="font-mono text-xs">error_log</code> table does not exist in this database.
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                Run the <code className="font-mono text-xs">create_error_log_table</code> migration to enable error tracking.
              </p>
            </div>
          </div>
        )}

        {!errorLogsMissing && effectiveErrors.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500 opacity-60" />
            <p className="text-sm">No errors logged.</p>
          </div>
        )}

        {effectiveErrors.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Level</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Message</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Time</th>
                </tr>
              </thead>
              <tbody>
                {effectiveErrors.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
                        row.level === 'error'
                          ? 'bg-destructive/10 text-destructive border-destructive/20'
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      }`}>
                        {row.level}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{row.source}</td>
                    <td className="px-4 py-2.5 text-xs text-foreground max-w-[220px]">
                      <span className="line-clamp-2">{row.message}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelative(row.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Usage Event Feed */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Recent Usage Events
            <span className="text-xs font-normal text-muted-foreground">(last 50)</span>
          </p>
          {eventsLoading && <MiniSpinner size={16} className="text-muted-foreground" />}
        </div>

        {eventsError && (
          <DevKitErrorCard error={eventsError} title="Couldn't load live events" context={{ panel: 'Live Activity', function: 'admin-devkit-data', action: 'live-activity' }} />
        )}

        {!eventsError && events.length === 0 && !eventsLoading && (
          <div className="py-10 text-center text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No usage events recorded yet.</p>
          </div>
        )}

        {events.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Event Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Time</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-mono bg-muted/50 px-2 py-0.5 rounded border border-border text-foreground">
                        {event.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono hidden sm:table-cell">
                      {event.user_id
                        ? `${event.user_id.slice(0, 8)}…`
                        : <span className="italic opacity-60">anonymous</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      <span title={event.created_at}>{formatTimestamp(event.created_at)}</span>
                      <span className="ml-1.5 text-[10px] text-muted-foreground/50">
                        {formatRelative(event.created_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Contact Requests */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            Recent Contact Requests
            <span className="text-xs font-normal text-muted-foreground">(last 5)</span>
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchContactRequests}
            disabled={contactRequestsLoading}
            className="h-7 px-2"
          >
            {contactRequestsLoading ? <MiniSpinner size={14} /> : <RefreshCw className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {contactRequests.length === 0 && !contactRequestsLoading && (
          <div className="py-8 text-center text-muted-foreground">
            <Mail className="w-6 h-6 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No contact requests yet.</p>
          </div>
        )}

        {contactRequests.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Sent</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Time</th>
                </tr>
              </thead>
              <tbody>
                {contactRequests.map((req) => {
                  const emailSent = req.metadata?.email_sent === true;
                  const emailPending = req.metadata?.email_sent === undefined || req.metadata?.email_sent === null;
                  return (
                    <tr key={req.id} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-2.5">
                        <span className="text-xs font-mono bg-muted/50 px-2 py-0.5 rounded border border-border text-foreground">
                          {req.type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono hidden sm:table-cell max-w-[160px] truncate">
                        {req.email}
                      </td>
                      <td className="px-4 py-2.5">
                        {emailPending ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-muted/50 text-muted-foreground border-border">
                            pending
                          </span>
                        ) : emailSent ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                            sent
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/20">
                            not sent
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelative(req.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full Smoke Test Suite (merged from DevKitRunner) */}
      <div className="border-t border-border pt-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
            <Activity className="w-4 h-4 text-primary" />
            Full Platform Smoke Tests
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Deep end-to-end smoke tests across all platform services — auth, AI, DB, routing, credits and more.
          </p>
        </div>
        <DevKitRunner />
      </div>
    </div>
  );
}
