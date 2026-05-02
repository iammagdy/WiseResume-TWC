import { useState, useCallback, useEffect } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Rocket,
  ExternalLink,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { devKitInvokeOptions } from '@/lib/devkit/devKitAuth';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { useIsMounted } from '@/lib/devkit/hooks';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DevKitErrorCard } from './DevKitErrorCard';

type InternalTab = 'kinde' | 'bounces' | 'deploy';

interface KindeEvent {
  id: string;
  event_type: string;
  kinde_user_id: string | null;
  email: string | null;
  provisioning_ok: boolean | null;
  created_at: string;
}

interface BounceEntry {
  id: string;
  to: string;
  subject: string;
  status: string;
  reason: string | null;
  created_at: string;
}

interface DeployRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  head_commit: { message: string; author: string } | null;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Kinde Events ─────────────────────────────────────────────────────────────

function KindeEventsTab() {
  const isMounted = useIsMounted();
  const [events, setEvents] = useState<KindeEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchEvents = useCallback(async () => {
    if (!isMounted()) return;
    setLoading(true);
    setError(null);
    try {
      const tuple = await edgeFunctions.functions.invoke(
        'admin-moderation',
        devKitInvokeOptions({ action: 'list_kinde_events', event_type: typeFilter }),
      );
      const data = unwrapAdminResponse<{ events: KindeEvent[]; total: number; missing_table?: boolean }>(tuple, 'admin-moderation');
      if (!isMounted()) return;
      if (data.missing_table) {
        setError('kinde_events table not yet migrated. Run the latest migration to enable this feature.');
        return;
      }
      setEvents(data.events ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      if (!isMounted()) return;
      setError(formatEdgeError(err));
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted, typeFilter]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const uniqueTypes = ['all', ...Array.from(new Set(events.map((e) => e.event_type)))];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {uniqueTypes.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              typeFilter === t
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-transparent text-muted-foreground border-border hover:border-foreground/30',
            )}
          >
            {t === 'all' ? 'All types' : t}
          </button>
        ))}
        <Button size="sm" variant="ghost" onClick={fetchEvents} disabled={loading} className="ml-auto">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </Button>
      </div>

      {error && <DevKitErrorCard error={error} title="Couldn't load Kinde events" onRetry={fetchEvents} context={{ panel: 'Integrations · Kinde', function: 'admin-moderation', action: 'list_kinde_events', requestBodySanitized: `event_type=${typeFilter}` }} />}

      {!loading && events.length === 0 && !error && (
        <p className="text-sm text-center text-muted-foreground py-8">No Kinde events recorded yet</p>
      )}

      <div className="space-y-2">
        {events.map((event) => (
          <div key={event.id} className="flex items-center gap-3 rounded-lg border border-border px-4 py-2.5 bg-card">
            <div className="shrink-0">
              {event.provisioning_ok === true && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              {event.provisioning_ok === false && <XCircle className="w-4 h-4 text-destructive" />}
              {event.provisioning_ok === null && <AlertCircle className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[11px] font-mono">{event.event_type}</Badge>
                {event.email && <span className="text-xs text-muted-foreground truncate">{event.email}</span>}
                {event.provisioning_ok !== null && (
                  <span className={cn('text-xs', event.provisioning_ok ? 'text-green-600 dark:text-green-400' : 'text-destructive')}>
                    {event.provisioning_ok ? 'provisioned' : 'failed'}
                  </span>
                )}
              </div>
              {event.kinde_user_id && (
                <p className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">{event.kinde_user_id}</p>
              )}
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{fmtDate(event.created_at)}</span>
          </div>
        ))}
      </div>

      {total > events.length && (
        <p className="text-xs text-center text-muted-foreground">Showing {events.length} of {total}</p>
      )}
    </div>
  );
}

// ── Resend Bounces ────────────────────────────────────────────────────────────

function ResendBouncesTab() {
  const isMounted = useIsMounted();
  const [bounces, setBounces] = useState<BounceEntry[]>([]);
  const [totalChecked, setTotalChecked] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suppressing, setSuppressing] = useState<string | null>(null);

  const fetchBounces = useCallback(async () => {
    if (!isMounted()) return;
    setLoading(true);
    setError(null);
    try {
      const tuple = await edgeFunctions.functions.invoke(
        'admin-integrations',
        devKitInvokeOptions({ action: 'get_resend_bounces' }),
      );
      // Resend "restricted" key surfaces as { success:false, reason:'restricted_key' }
      // — handle ahead of unwrap so we can show a useful message instead of the raw 401.
      const raw = tuple.data as { reason?: string; error?: string } | null;
      if (raw && raw.reason === 'restricted_key') {
        if (!isMounted()) return;
        setBounces([]);
        setTotalChecked(0);
        setError(raw.error ?? 'restricted_api_key: Resend key is send-only.');
        return;
      }
      const data = unwrapAdminResponse<{ bounces: BounceEntry[]; total_emails_checked: number }>(tuple, 'admin-integrations');
      if (!isMounted()) return;
      setBounces(data.bounces ?? []);
      setTotalChecked(data.total_emails_checked ?? 0);
    } catch (err) {
      if (!isMounted()) return;
      setError(formatEdgeError(err));
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => { fetchBounces(); }, [fetchBounces]);

  const suppressEmail = useCallback(async (email: string) => {
    setSuppressing(email);
    try {
      const tuple = await edgeFunctions.functions.invoke(
        'admin-moderation',
        devKitInvokeOptions({ action: 'suppress_email', email }),
      );
      const data = unwrapAdminResponse<{ already_blocked?: boolean }>(tuple, 'admin-moderation');
      toast.success(data.already_blocked ? `${email} already in blocklist` : `${email} suppressed`);
    } catch (err) {
      toast.error(formatEdgeError(err));
    } finally {
      setSuppressing(null);
    }
  }, []);

  const statusColor = (s: string) => {
    if (s === 'bounced') return 'text-destructive';
    if (s === 'complained') return 'text-amber-600 dark:text-amber-400';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{bounces.length} bounced / failed deliveries</p>
          {totalChecked > 0 && (
            <p className="text-xs text-muted-foreground">from last {totalChecked} emails</p>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={fetchBounces} disabled={loading}>
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Fetching from Resend…</span>
        </div>
      )}

      {error && <DevKitErrorCard error={error} title="Couldn't load Resend bounces" onRetry={fetchBounces} context={{ panel: 'Integrations · Resend', function: 'admin-integrations', action: 'get_resend_bounces' }} />}

      {!loading && bounces.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <CheckCircle2 className="w-8 h-8 mb-2 opacity-40 text-green-500" />
          <p className="text-sm">No bounces found — inbox health looks good</p>
        </div>
      )}

      <div className="space-y-2">
        {bounces.map((b) => (
          <div key={b.id} className="rounded-lg border border-border bg-card px-4 py-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
              <span className="text-sm font-medium truncate flex-1">{b.to}</span>
              <span className={cn('text-xs font-medium', statusColor(b.status))}>{b.status}</span>
              <span className="text-xs text-muted-foreground">{fmtDate(b.created_at)}</span>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[11px] px-2 text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
                disabled={suppressing === b.to}
                onClick={() => suppressEmail(b.to)}
                title="Add to blocklist to prevent future sends"
              >
                Suppress
              </Button>
            </div>
            {b.subject && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate ml-5">{b.subject}</p>
            )}
            {b.reason && (
              <p className="text-xs text-destructive/80 mt-0.5 ml-5 truncate">
                Reason: {b.reason}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Deploy ────────────────────────────────────────────────────────────────────

function DeployTab() {
  const isMounted = useIsMounted();
  const [runs, setRuns] = useState<DeployRun[]>([]);
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!isMounted()) return;
    setLoading(true);
    setError(null);
    try {
      const tuple = await edgeFunctions.functions.invoke(
        'admin-integrations',
        devKitInvokeOptions({ action: 'get_deploy_status' }),
      );
      const data = unwrapAdminResponse<{ runs: DeployRun[]; repo_url: string }>(tuple, 'admin-integrations');
      if (!isMounted()) return;
      setRuns(data.runs ?? []);
      setRepoUrl(data.repo_url ?? '');
    } catch (err) {
      if (!isMounted()) return;
      setError(formatEdgeError(err));
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const triggerDeploy = useCallback(async () => {
    setTriggering(true);
    try {
      const tuple = await edgeFunctions.functions.invoke(
        'admin-integrations',
        devKitInvokeOptions({ action: 'trigger_deploy', ref: 'main' }),
      );
      const data = unwrapAdminResponse<{ message: string }>(tuple, 'admin-integrations');
      toast.success(data.message ?? 'Deploy triggered');
      setTimeout(fetchStatus, 3000);
    } catch (err) {
      toast.error(formatEdgeError(err));
    } finally {
      setTriggering(false);
    }
  }, [fetchStatus]);

  function conclusionIcon(run: DeployRun) {
    if (run.status === 'in_progress' || run.status === 'queued') {
      return <Loader2 className="w-4 h-4 animate-spin text-amber-500" />;
    }
    if (run.conclusion === 'success') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (run.conclusion === 'failure') return <XCircle className="w-4 h-4 text-destructive" />;
    return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
  }

  function conclusionText(run: DeployRun) {
    if (run.status === 'in_progress') return 'In progress';
    if (run.status === 'queued') return 'Queued';
    return run.conclusion ?? run.status;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {repoUrl && (
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            {repoUrl.replace('https://github.com/', '')}
          </a>
        )}
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="ghost" onClick={fetchStatus} disabled={loading}>
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </Button>
          <Button
            size="sm"
            disabled={triggering || loading}
            onClick={triggerDeploy}
            className="gap-1.5"
          >
            {triggering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Deploy main
          </Button>
        </div>
      </div>

      {error && <DevKitErrorCard error={error} title="Couldn't load deploy status" onRetry={fetchStatus} context={{ panel: 'Integrations · Deploy', function: 'admin-integrations', action: 'get_deploy_status' }} />}

      {!loading && runs.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <Rocket className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">No deploy runs found</p>
          <p className="text-xs mt-1">Check that GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO are set</p>
        </div>
      )}

      <div className="space-y-2">
        {runs.map((run) => (
          <div key={run.id} className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="shrink-0">{conclusionIcon(run)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium capitalize">{conclusionText(run)}</span>
                  <span className="text-xs text-muted-foreground">{fmtRelative(run.created_at)}</span>
                </div>
                {run.head_commit && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {run.head_commit.message}
                    {run.head_commit.author ? ` · ${run.head_commit.author}` : ''}
                  </p>
                )}
              </div>
              <a
                href={run.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="View on GitHub"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const TABS: { id: InternalTab; label: string; icon: React.ElementType }[] = [
  { id: 'kinde', label: 'Kinde Events', icon: AlertCircle },
  { id: 'bounces', label: 'Resend Bounces', icon: XCircle },
  { id: 'deploy', label: 'Deploy', icon: Rocket },
];

export function IntegrationsPanel() {
  const [activeTab, setActiveTab] = useState<InternalTab>('kinde');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border pb-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-t text-sm font-medium transition-colors',
              activeTab === id
                ? 'text-foreground border-b-2 border-primary -mb-px'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'kinde' && <KindeEventsTab />}
      {activeTab === 'bounces' && <ResendBouncesTab />}
      {activeTab === 'deploy' && <DeployTab />}
    </div>
  );
}
