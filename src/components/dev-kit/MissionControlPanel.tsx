import { useState, useCallback, useEffect } from 'react';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  GitCommit,
  BrainCircuit,
  Mail,
  Database,
  KeyRound,
  Activity,
  ExternalLink,
  Clock,
  Globe,
  Zap,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { useIsMounted, useVisibleInterval } from '@/lib/devkit/hooks';
import { cn } from '@/lib/utils';
import { AITestSlotModelsCard } from './AITestSlotModelsCard';

type StatusDot = 'green' | 'yellow' | 'red' | 'grey';

interface SecretItem {
  key: string;
  label: string;
  present: boolean;
  source: 'replit_env' | 'supabase_vault' | 'optional';
  lastRotatedAt: string | null;
  stale: boolean;
  daysSinceRotation: number | null;
}

interface ErrorEntry {
  id: string;
  message: string;
  context?: string | null;
  created_at: string;
  level?: string;
}

interface AdminActionEntry {
  id: string;
  action: string;
  category?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  user_id?: string;
}

interface ProviderPing {
  provider: string;
  ok: boolean;
  latencyMs: number | null;
  httpStatus: number;
}

interface MissionControlData {
  isDevEnvironment: boolean;
  checkedAt: string;
  deploy: {
    ok: boolean;
    lastCommitAt: string | null;
    sha: string | null;
    branch: string;
    repoConfigured: boolean;
    repoUrl: string | null;
    productionUrl: string;
    siteUp: boolean;
    sitePingedAt: string;
    siteHttpStatus: number;
  };
  ai: {
    providerPings: ProviderPing[];
    openrouterConfigured: boolean;
    openrouter2Configured: boolean;
    groqConfigured: boolean;
    anyProviderOk: boolean;
    allProvidersOk: boolean;
    keysInSupabaseVault: boolean;
  };
  email: {
    resendKeyPresent: boolean;
    reachable: boolean;
    httpStatus: number;
    sends24h: number | null;
    keyInSupabaseVault: boolean;
  };
  database: {
    ok: boolean;
    error: string | null;
    errorCount1h: number | null;
  };
  secrets: {
    items: SecretItem[];
    missingCount: number;
    staleCount: number;
  };
  recentErrors: ErrorEntry[];
  recentAdminActions: AdminActionEntry[];
}

function StatusDotIcon({ status }: { status: StatusDot }) {
  if (status === 'green') {
    return <span className="inline-flex w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50 shrink-0" />;
  }
  if (status === 'yellow') {
    return <span className="inline-flex w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50 shrink-0" />;
  }
  if (status === 'red') {
    return <span className="inline-flex w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50 shrink-0" />;
  }
  return <span className="inline-flex w-2.5 h-2.5 rounded-full bg-muted-foreground/30 shrink-0" />;
}

function StatusCard({
  icon: Icon,
  title,
  status,
  summary,
  onDeepLink,
  deepLinkLabel,
  children,
}: {
  icon: React.ElementType;
  title: string;
  status: StatusDot;
  summary: string;
  onDeepLink?: () => void;
  deepLinkLabel?: string;
  children?: React.ReactNode;
}) {
  const borderClass =
    status === 'green' ? 'border-green-500/20'
    : status === 'yellow' ? 'border-amber-400/30'
    : status === 'red' ? 'border-red-500/20'
    : 'border-border';

  const bgClass =
    status === 'green' ? 'bg-green-500/5'
    : status === 'yellow' ? 'bg-amber-400/5'
    : status === 'red' ? 'bg-red-500/5'
    : 'bg-card';

  return (
    <div className={cn('rounded-xl border p-4 shadow-sm space-y-3', borderClass, bgClass)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusDotIcon status={status} />
          <Icon className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">{title}</p>
        </div>
        {onDeepLink && (
          <button
            onClick={onDeepLink}
            className="text-[11px] text-primary hover:underline flex items-center gap-1 shrink-0"
          >
            {deepLinkLabel ?? 'View'}
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{summary}</p>
      {children}
    </div>
  );
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function PingBadge({ ping, label }: { ping?: ProviderPing; label: string }) {
  if (!ping) return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-muted/50 text-muted-foreground border-border">
      {label} —
    </span>
  );
  const color = ping.ok
    ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
    : ping.httpStatus === 0
    ? 'bg-muted/50 text-muted-foreground border-border'
    : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
  return (
    <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', color)}>
      {label} {ping.ok ? (ping.latencyMs ? `${ping.latencyMs}ms` : 'OK') : ping.httpStatus === 0 ? 'no key' : `HTTP ${ping.httpStatus}`}
    </span>
  );
}

interface MissionControlPanelProps {
  onNavigate: (tab: string) => void;
}

export function MissionControlPanel({ onNavigate }: MissionControlPanelProps) {
  const [data, setData] = useState<MissionControlData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const isMounted = useIsMounted();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: { action: 'mission-control' },
      });
      const result = unwrapAdminResponse<MissionControlData>(tuple, 'admin-devkit-data');
      if (!isMounted()) return;
      setData(result);
      setLastRefreshed(new Date());
    } catch (e) {
      if (!isMounted()) return;
      setError(formatEdgeError(e, 'Failed to load mission control data'));
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useVisibleInterval(fetchData, 60_000);

  if (!data && loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Mission Control</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Loading system status…</p>
          </div>
          <Button variant="outline" size="sm" disabled>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Refreshing
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/50 animate-pulse border border-border" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Mission Control</h2>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Retry
          </Button>
        </div>
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
          <p className="text-xs mt-1 opacity-70">
            Deploy the <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">admin-devkit-data</code> edge function and ensure DEV_KIT_PASSWORD is set.
          </p>
        </div>
      </div>
    );
  }

  const deployStatus: StatusDot = !data
    ? 'grey'
    : (!data.deploy.ok && data.deploy.repoConfigured)
    ? 'red'
    : !data.deploy.siteUp
    ? 'red'
    : !data.deploy.ok
    ? 'yellow'
    : 'green';

  const orPing = data?.ai.providerPings.find(p => p.provider === 'openrouter');
  const or2Ping = data?.ai.providerPings.find(p => p.provider === 'openrouter2');
  const groqPing = data?.ai.providerPings.find(p => p.provider === 'groq');

  const aiStatus: StatusDot = !data
    ? 'grey'
    : data.ai.anyProviderOk
    ? data.ai.allProvidersOk
      ? 'green'
      : 'yellow'
    : data.ai.keysInSupabaseVault
    ? 'yellow'   // keys exist in Supabase vault — works in production
    : 'red';

  const emailStatus: StatusDot = !data
    ? 'grey'
    : data.email.resendKeyPresent && data.email.reachable
    ? 'green'
    : data.email.keyInSupabaseVault
    ? 'yellow'   // key exists in Supabase vault — works in production
    : data.email.resendKeyPresent
    ? 'yellow'
    : 'red';

  const dbStatus: StatusDot = !data
    ? 'grey'
    : !data.database.ok
    ? 'red'
    : (data.database.errorCount1h !== null && data.database.errorCount1h > 5)
    ? 'yellow'
    : 'green';

  // missingCount from server only counts replit_env secrets — supabase_vault secrets are excluded
  const secretsMissingCount = data?.secrets.missingCount ?? 0;
  const secretsStaleCount = data?.secrets.staleCount ?? 0;
  const secretsStatus: StatusDot = !data
    ? 'grey'
    : secretsMissingCount > 0
    ? 'red'
    : secretsStaleCount > 0
    ? 'yellow'
    : 'green';
  const vaultCount = data?.secrets.items.filter(s => s.source === 'supabase_vault').length ?? 0;

  const errorCount = data?.recentErrors.length ?? 0;
  const errorsStatus: StatusDot = !data
    ? 'grey'
    : errorCount === 0
    ? 'green'
    : errorCount < 5
    ? 'yellow'
    : 'red';

  const overallStatus: StatusDot =
    deployStatus === 'red' || aiStatus === 'red' || dbStatus === 'red' || secretsStatus === 'red' || emailStatus === 'red'
    ? 'red'
    : deployStatus === 'yellow' || aiStatus === 'yellow' || secretsStatus === 'yellow' || emailStatus === 'yellow' || errorsStatus === 'yellow' || dbStatus === 'yellow'
    ? 'yellow'
    : 'green';

  const isDevEnv = data?.isDevEnvironment ?? false;

  const aiSummary = data
    ? data.ai.keysInSupabaseVault
      ? 'Keys in Supabase vault · operational in production'
      : [
          data.ai.openrouterConfigured
            ? `OpenRouter: ${orPing?.ok ? `OK ${orPing.latencyMs ? `(${orPing.latencyMs}ms)` : ''}` : 'unreachable'}`
            : 'OpenRouter: no key',
          data.ai.openrouter2Configured
            ? `OR2: ${or2Ping?.ok ? 'OK' : 'unreachable'}`
            : null,
          data.ai.groqConfigured
            ? `Groq: ${groqPing?.ok ? `OK ${groqPing.latencyMs ? `(${groqPing.latencyMs}ms)` : ''}` : 'unreachable'}`
            : 'Groq: no key',
        ].filter(Boolean).join(' · ')
    : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-foreground">Mission Control</h2>
            <StatusDotIcon status={overallStatus} />
            <span className={cn(
              'text-xs font-semibold',
              overallStatus === 'green' ? 'text-green-600 dark:text-green-400'
              : overallStatus === 'yellow' ? 'text-amber-500'
              : 'text-red-500',
            )}>
              {overallStatus === 'green' ? 'All systems operational' : overallStatus === 'yellow' ? 'Degraded' : 'Issues detected'}
            </span>
          </div>
          {lastRefreshed && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Last checked {formatRelative(lastRefreshed.toISOString())} · auto-refreshes every 60s
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          Refresh now
        </Button>
      </div>

      {error && data && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
          Last refresh failed: {error}
        </div>
      )}

      {isDevEnv && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300">
          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            <strong>Dev environment</strong> — secrets marked with{' '}
            <span className="inline-flex items-center gap-1 font-mono px-1 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px]">
              <Lock className="w-2.5 h-2.5" /> Supabase vault
            </span>{' '}
            live in Supabase's secret store and are only visible to edge functions in production.
            {vaultCount > 0 && ` (${vaultCount} secrets)`}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Deploy card */}
        <StatusCard
          icon={GitCommit}
          title="Deploy"
          status={deployStatus}
          summary={
            data
              ? data.deploy.ok && data.deploy.siteUp
                ? `Last commit ${formatRelative(data.deploy.lastCommitAt)} · ${data.deploy.sha ?? '—'}`
                : !data.deploy.siteUp
                ? `Production site unreachable (HTTP ${data.deploy.siteHttpStatus})`
                : data.deploy.repoConfigured
                ? 'GitHub unreachable or API error'
                : 'GitHub not configured'
              : 'Loading…'
          }
          onDeepLink={() => onNavigate('deployment')}
          deepLinkLabel="Deployment"
        >
          {data && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className={cn(
                'text-[10px] font-medium px-2 py-0.5 rounded-full border',
                data.deploy.siteUp
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
              )}>
                <Globe className="w-2.5 h-2.5 inline mr-1" />
                {data.deploy.siteUp ? 'Site up' : 'Site down'}
              </span>
              {data.deploy.sha && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  {data.deploy.branch}@{data.deploy.sha}
                </span>
              )}
              {data.deploy.repoUrl && (
                <a
                  href={data.deploy.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  View repo
                </a>
              )}
            </div>
          )}
        </StatusCard>

        {/* AI Providers card */}
        <StatusCard
          icon={BrainCircuit}
          title="AI Providers"
          status={aiStatus}
          summary={aiSummary || 'No AI keys configured'}
          onDeepLink={() => onNavigate('openrouter')}
          deepLinkLabel="OpenRouter"
        >
          {data && (
            <div className="flex flex-wrap gap-2">
              {data.ai.keysInSupabaseVault ? (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  Supabase vault · prod only
                </span>
              ) : (
                <>
                  <PingBadge ping={orPing} label="OpenRouter" />
                  {data.ai.openrouter2Configured && <PingBadge ping={or2Ping} label="OR2" />}
                  <PingBadge ping={groqPing} label="Groq" />
                </>
              )}
            </div>
          )}
        </StatusCard>

        {/* Email card */}
        <StatusCard
          icon={Mail}
          title="Email Service"
          status={emailStatus}
          summary={
            data
              ? data.email.keyInSupabaseVault
                ? 'RESEND_API_KEY in Supabase vault · operational in production'
                : data.email.resendKeyPresent
                ? data.email.reachable
                  ? `Resend reachable${data.email.sends24h !== null ? ` · ${data.email.sends24h} sent (24h)` : ''}`
                  : `Resend key set but unreachable (HTTP ${data.email.httpStatus})`
                : 'RESEND_API_KEY not configured'
              : 'Loading…'
          }
          onDeepLink={() => onNavigate('email')}
          deepLinkLabel="Email"
        >
          {data && data.email.keyInSupabaseVault && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 flex items-center gap-1 w-fit">
              <Lock className="w-2.5 h-2.5" />
              Supabase vault · prod only
            </span>
          )}
          {data && !data.email.keyInSupabaseVault && data.email.sends24h !== null && (
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">
                {data.email.sends24h} email{data.email.sends24h !== 1 ? 's' : ''} in last 24h
              </span>
            </div>
          )}
        </StatusCard>

        {/* Database card */}
        <StatusCard
          icon={Database}
          title="Database"
          status={dbStatus}
          summary={
            data
              ? data.database.ok
                ? `Supabase reachable${data.database.errorCount1h !== null ? ` · ${data.database.errorCount1h} error${data.database.errorCount1h !== 1 ? 's' : ''} (1h)` : ''}`
                : `DB error: ${data.database.error ?? 'unknown'}`
              : 'Loading…'
          }
          onDeepLink={() => onNavigate('overview')}
          deepLinkLabel="Overview"
        >
          {data && data.database.ok && data.database.errorCount1h !== null && data.database.errorCount1h > 0 && (
            <div className={cn(
              'flex items-center gap-1.5 text-[10px]',
              data.database.errorCount1h > 5 ? 'text-amber-500' : 'text-muted-foreground',
            )}>
              <AlertTriangle className="w-3 h-3" />
              {data.database.errorCount1h} error{data.database.errorCount1h !== 1 ? 's' : ''} in last hour
            </div>
          )}
        </StatusCard>

        {/* Secrets card */}
        <StatusCard
          icon={KeyRound}
          title="Secrets"
          status={secretsStatus}
          summary={
            data
              ? secretsMissingCount > 0
                ? `${secretsMissingCount} required secret${secretsMissingCount !== 1 ? 's' : ''} missing`
                : secretsStaleCount > 0
                ? `${secretsStaleCount} secret${secretsStaleCount !== 1 ? 's' : ''} not rotated in 90+ days`
                : isDevEnv && vaultCount > 0
                ? `All core secrets configured · ${vaultCount} in Supabase vault`
                : `All ${data.secrets.items.length} secrets configured`
              : 'Loading…'
          }
          onDeepLink={() => onNavigate('deployment')}
          deepLinkLabel="Env check"
        >
          {data && secretsMissingCount > 0 && (
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {data.secrets.items
                .filter(s => !s.present && s.source === 'replit_env')
                .slice(0, 6)
                .map(s => (
                  <div key={s.key} className="flex items-center gap-2">
                    <XCircle className="w-3 h-3 text-red-500 shrink-0" />
                    <span className="font-mono text-[10px] text-foreground truncate">{s.key}</span>
                  </div>
                ))
              }
            </div>
          )}
        </StatusCard>

        {/* Recent failures card */}
        <StatusCard
          icon={Activity}
          title="Recent Failures"
          status={errorsStatus}
          summary={
            data
              ? errorCount === 0
                ? 'No recent errors in error_log'
                : `${errorCount} error${errorCount !== 1 ? 's' : ''} in error_log`
              : 'Loading…'
          }
          onDeepLink={() => onNavigate('live')}
          deepLinkLabel="Live Activity"
        >
          {data && data.recentErrors.length > 0 && (
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {data.recentErrors.slice(0, 4).map(err => (
                <div key={err.id} className="flex items-start gap-2">
                  <Clock className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-foreground line-clamp-1">{err.message}</p>
                    <p className="text-[10px] text-muted-foreground">{formatRelative(err.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </StatusCard>
      </div>

      {/* Recent admin actions */}
      {data && data.recentAdminActions.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Recent Admin Actions</p>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-muted/50 text-muted-foreground border-border">
              Last {data.recentAdminActions.length}
            </span>
          </div>
          <div className="space-y-1">
            {data.recentAdminActions.map(entry => (
              <div key={entry.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/20 transition-colors">
                <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="font-mono text-[10px] text-foreground truncate">{entry.action}</span>
                {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                  <span className="text-[10px] text-muted-foreground truncate flex-1">
                    {Object.entries(entry.metadata).slice(0, 2).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{formatRelative(entry.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI test slot models — read helper sources from app_settings.ai_test_slot_models */}
      <AITestSlotModelsCard onNavigateToKeys={onNavigate} />

      {/* All secrets table */}
      {data && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <KeyRound className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">All Secrets</p>
            <span className={cn(
              'text-[10px] font-medium px-2 py-0.5 rounded-full border',
              secretsMissingCount === 0
                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
                : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
            )}>
              {data.secrets.items.filter(s => s.present || s.source === 'supabase_vault').length} / {data.secrets.items.length} accounted for
            </span>
            {vaultCount > 0 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                {vaultCount} in Supabase vault
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {data.secrets.items.map(secret => {
              const inVault = secret.source === 'supabase_vault';
              const missingFromReplit = !secret.present && !inVault;
              return (
                <div
                  key={secret.key}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 border text-[11px]',
                    inVault
                      ? 'border-blue-500/20 bg-blue-500/5'
                      : missingFromReplit
                      ? 'border-red-500/20 bg-red-500/5'
                      : secret.stale
                      ? 'border-amber-400/30 bg-amber-400/5'
                      : 'border-border bg-muted/20',
                  )}
                >
                  {inVault
                    ? <Lock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    : missingFromReplit
                    ? <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    : secret.stale
                    ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    : <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  }
                  <span className="font-mono text-foreground truncate flex-1">{secret.key}</span>
                  {inVault && (
                    <span className="text-blue-500 dark:text-blue-400 shrink-0 text-[10px]">vault</span>
                  )}
                  {!inVault && secret.present && secret.stale && secret.daysSinceRotation !== null && (
                    <span className="text-amber-500 shrink-0">{secret.daysSinceRotation}d</span>
                  )}
                  {missingFromReplit && (
                    <span className="text-red-500 shrink-0">missing</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
