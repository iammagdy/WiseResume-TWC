import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, GitCommit, CheckCircle, XCircle, ExternalLink, Loader2, Clock, Mail, AlertTriangle, Trash2, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { supabase } from '@/integrations/supabase/safeClient';
import { getDevKitToken } from '@/contexts/DevKitSessionContext';
import { getSupabaseToken } from '@/lib/supabaseAuth';
import { useIsMounted, useAbortOnUnmount } from '@/lib/devkit/hooks';
import { unwrapAdminResponse, formatEdgeError, adminApiFetch } from '@/lib/devkit/edgeResponse';

interface Commit {
  sha: string;
  message: string;
  author: string;
  timestamp: string;
  url: string;
}

interface EnvCheck {
  key: string;
  label: string;
  present: boolean;
}

interface DeploymentData {
  commits: Commit[];
  lastDeployedAt: string | null;
  envChecks: EnvCheck[];
  githubRepoUrl: string | null;
  supabaseUrl: string | null;
  lastUpdatedAt: Date;
  githubError: string | null;
  envError: string | null;
}

interface GithubStatusResponse {
  success: boolean;
  commits?: Commit[];
  repoUrl?: string;
  error?: string;
}

interface EnvCheckResponse {
  success: boolean;
  checks?: EnvCheck[];
  supabaseUrl?: string;
  error?: string;
}

interface SweepResult {
  ran_at: string;
  portfolio_visits_cutoff: string;
  error_log_cutoff: string;
  audit_logs_cutoff: string;
  admin_audit_log_cutoff?: string;
  portfolio_visits_deleted: number;
  error_log_deleted: number;
  audit_logs_deleted: number;
  trial_resumes_deleted: number;
  admin_audit_log_deleted?: number;
}

interface SweepStatus {
  lastRanAt: string | null;
  lastDurationMs: number | null;
  lastResult: SweepResult | null;
  lastError: string | null;
  nextScheduledAt: string | null;
  config: {
    enabled: boolean;
    portfolioVisitsRetentionDays: number;
    errorLogRetentionDays: number;
    auditLogsRetentionDays: number;
    adminAuditLogRetentionDays?: number;
    intervalMs: number;
  };
}

function formatRelative(iso: string): string {
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

const SUPABASE_PROJECT_REF =
  import.meta.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1] ??
  'jnsfmkzgxsviuthaqlyy';
const SUPABASE_SECRETS_URL =
  `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/functions`;

export function DeploymentPanel() {
  const [data, setData] = useState<DeploymentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [contactTableOk, setContactTableOk] = useState<boolean | null>(null);
  const [sweepStatus, setSweepStatus] = useState<SweepStatus | null>(null);
  const [sweepLoading, setSweepLoading] = useState(false);
  const [sweepError, setSweepError] = useState<string | null>(null);

  const isMounted = useIsMounted();
  const sweepAbort = useAbortOnUnmount();

  const fetchDeploymentData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const pw = getDevKitToken();
      const [githubResult, envResult] = await Promise.all([
        edgeFunctions.functions.invoke('admin-github-status', {
          body: { password: pw },
        }),
        edgeFunctions.functions.invoke('admin-env-check', {
          body: { password: pw },
        }),
      ]);

      if (!isMounted()) return;

      // Use tryUnwrapAdminResponse so a single side failing (e.g. GitHub
      // outage) still lets the other panel section render; we surface
      // each side's error independently in `githubError` / `envError`.
      let commits: Commit[] = [];
      let lastDeployedAt: string | null = null;
      let githubRepoUrl: string | null = null;
      let githubError: string | null = null;
      try {
        const githubData = unwrapAdminResponse<GithubStatusResponse>(githubResult, 'admin-github-status');
        commits = githubData.commits ?? [];
        lastDeployedAt = commits[0]?.timestamp ?? null;
        githubRepoUrl = githubData.repoUrl ?? null;
      } catch (e) {
        githubError = formatEdgeError(e, 'GitHub API error');
      }

      let envChecks: EnvCheck[] = [];
      let supabaseUrl: string | null = null;
      let envError: string | null = null;
      try {
        const envData = unwrapAdminResponse<EnvCheckResponse>(envResult, 'admin-env-check');
        envChecks = envData.checks ?? [];
        supabaseUrl = envData.supabaseUrl ?? null;
      } catch (e) {
        envError = formatEdgeError(e, 'Env check error');
      }

      if (!isMounted()) return;
      setData({
        commits,
        lastDeployedAt,
        envChecks,
        githubRepoUrl,
        supabaseUrl,
        lastUpdatedAt: new Date(),
        githubError,
        envError,
      });
      setSecondsAgo(0);
    } catch (e) {
      if (!isMounted()) return;
      setFetchError(formatEdgeError(e, 'Failed to load deployment data'));
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  const fetchSweepStatus = useCallback(async () => {
    setSweepLoading(true);
    setSweepError(null);
    const controller = sweepAbort.next();
    try {
      const token = await getSupabaseToken();
      if (!token) {
        setSweepError('No auth token available');
        return;
      }
      const status = await adminApiFetch<SweepStatus>('/api/admin/analytics-sweep-status', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (controller.signal.aborted || !isMounted()) return;
      setSweepStatus(status);
    } catch (e) {
      if (controller.signal.aborted || !isMounted()) return;
      // AbortError is benign — caller already aborted via unmount or rapid re-fetch.
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setSweepError(formatEdgeError(e, 'Failed to load sweep status'));
    } finally {
      if (isMounted() && !controller.signal.aborted) setSweepLoading(false);
    }
  }, [isMounted, sweepAbort]);

  useEffect(() => { fetchDeploymentData(); }, [fetchDeploymentData]);
  useEffect(() => { fetchSweepStatus(); }, [fetchSweepStatus]);

  useEffect(() => {
    let cancelled = false;
    supabase.from('contact_requests').select('id', { count: 'exact', head: true }).then(({ error }) => {
      if (cancelled) return;
      setContactTableOk(error === null);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchDeploymentData();
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchDeploymentData]);

  const lastUpdatedLabel = secondsAgo < 60
    ? `${secondsAgo}s ago`
    : `${Math.floor(secondsAgo / 60)}m ago`;

  const envPresent = data?.envChecks.filter(e => e.present).length ?? 0;
  const envMissing = data?.envChecks.filter(e => !e.present).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Deployment Status</h2>
          {data && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Last updated {lastUpdatedLabel} · auto-refreshes every 30s
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchDeploymentData} disabled={loading} className="flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {fetchError && !data && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-sm font-semibold text-destructive">Failed to load deployment data</p>
              <p className="text-xs text-destructive/70">{fetchError}</p>
              <p className="text-xs text-muted-foreground">
                The following secrets must be added to <strong>Supabase → Edge Functions → Secrets</strong> (not the Vault).
                These are read via <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">Deno.env.get()</code> and must be set as Edge Function environment secrets:
              </p>
              <div className="grid grid-cols-1 gap-1.5 pt-1">
                {(['DEV_KIT_PASSWORD', 'GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'] as const).map(k => (
                  <div key={k} className="flex items-center gap-2 rounded-md bg-muted/60 px-2.5 py-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <code className="font-mono text-xs text-foreground">{k}</code>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded px-2 py-1.5">
                Note: The Supabase <strong>Vault</strong> is different — secrets stored there are NOT available as environment variables in edge functions.
              </p>
              <a
                href={SUPABASE_SECRETS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline pt-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Supabase Edge Functions → manage secrets there
              </a>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDeploymentData} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </div>
      )}

      {loading && !data && !fetchError && (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading deployment data…</span>
        </div>
      )}

      {data && (
        <>
          {/* Last deployed / Quick links */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Deployment Info</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Last deployed</p>
                <p className="text-sm text-foreground font-mono">
                  {data.lastDeployedAt
                    ? <>
                        {new Date(data.lastDeployedAt).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                        <span className="ml-2 text-xs text-muted-foreground">({formatRelative(data.lastDeployedAt)})</span>
                      </>
                    : <span className="text-muted-foreground italic">Unknown</span>
                  }
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {data.githubRepoUrl && (
                  <a
                    href={data.githubRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    GitHub Repository
                  </a>
                )}
                {data.supabaseUrl && (
                  <a
                    href={data.supabaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Supabase Dashboard
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Recent Commits */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <GitCommit className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Recent Commits (main)</p>
            </div>

            {data.githubError && (
              <div className="p-4 text-sm text-destructive bg-destructive/5 flex items-start gap-2">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium">GitHub API unavailable</p>
                  <p className="text-xs text-destructive/70">{data.githubError}</p>
                  <p className="text-xs text-muted-foreground">
                    Set <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">GITHUB_TOKEN</code>,{' '}
                    <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">GITHUB_OWNER</code>, and{' '}
                    <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">GITHUB_REPO</code> in{' '}
                    <strong>Edge Functions → Secrets</strong> (not the Vault).
                  </p>
                  <a
                    href={SUPABASE_SECRETS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open Supabase Edge Functions
                  </a>
                </div>
              </div>
            )}

            {!data.githubError && data.commits.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                <GitCommit className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No commits found.</p>
              </div>
            )}

            {data.commits.length > 0 && (
              <div className="divide-y divide-border">
                {data.commits.map((commit) => (
                  <div key={commit.sha} className="px-5 py-3 hover:bg-muted/10 transition-colors">
                    <div className="flex items-start gap-3">
                      <GitCommit className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-snug line-clamp-2">{commit.message}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-muted-foreground">{commit.author}</span>
                          <span className="text-[10px] text-muted-foreground">{formatRelative(commit.timestamp)}</span>
                          <a
                            href={commit.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-mono text-primary hover:underline"
                          >
                            {commit.sha.slice(0, 7)}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Email Service Checklist */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Email Service</p>
            </div>
            <div className="space-y-2">
              {/* RESEND_API_KEY — pulled from env check results */}
              {(() => {
                const resendCheck = data?.envChecks.find(c => c.key === 'RESEND_API_KEY');
                const resendOk = resendCheck?.present ?? false;
                return (
                  <div className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${resendOk ? 'border-green-500/20 bg-green-500/5' : 'border-destructive/20 bg-destructive/5'}`}>
                    {resendOk
                      ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      : <XCircle className="w-4 h-4 text-destructive shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">Resend API Key</p>
                      <p className="text-[10px] font-mono text-muted-foreground">RESEND_API_KEY</p>
                    </div>
                    <span className={`text-[10px] font-medium ${resendOk ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                      {resendOk ? '✓ configured' : '✗ missing'}
                    </span>
                  </div>
                );
              })()}
              {/* Sender domain — manual verification only */}
              <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5 border-amber-500/20 bg-amber-500/5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">Sender domain verified</p>
                  <p className="text-[10px] font-mono text-muted-foreground">notifications@thewise.cloud — manual check in Resend dashboard</p>
                </div>
                <span className="text-[10px] font-medium text-amber-600">manual</span>
              </div>
              {/* contact_requests table accessibility */}
              <div className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                contactTableOk === null ? 'border-border bg-muted/20'
                  : contactTableOk ? 'border-green-500/20 bg-green-500/5'
                  : 'border-destructive/20 bg-destructive/5'
              }`}>
                {contactTableOk === null
                  ? <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
                  : contactTableOk
                    ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    : <XCircle className="w-4 h-4 text-destructive shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">contact_requests table</p>
                  <p className="text-[10px] font-mono text-muted-foreground">Supabase DB — stores all contact submissions as fallback</p>
                </div>
                <span className={`text-[10px] font-medium ${
                  contactTableOk === null ? 'text-muted-foreground'
                    : contactTableOk ? 'text-green-600 dark:text-green-400'
                    : 'text-destructive'
                }`}>
                  {contactTableOk === null ? 'checking…' : contactTableOk ? '✓ accessible' : '✗ error'}
                </span>
              </div>
            </div>
          </div>

          {/* Environment Variable Checklist */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Environment Variables</p>
              {data.envChecks.length > 0 && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  envMissing === 0
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'bg-destructive/10 text-destructive'
                }`}>
                  {envPresent} / {data.envChecks.length} set
                </span>
              )}
            </div>

            {data.envError && (
              <div className="text-sm text-destructive bg-destructive/5 p-3 rounded-lg">
                {data.envError}
                <p className="text-xs mt-1 text-muted-foreground">
                  Deploy the <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">admin-env-check</code> edge function.
                </p>
              </div>
            )}

            {!data.envError && data.envChecks.length === 0 && (
              <p className="text-xs text-muted-foreground">No environment check data available.</p>
            )}

            {data.envChecks.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.envChecks.map((check) => (
                  <div
                    key={check.key}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                      check.present
                        ? 'border-green-500/20 bg-green-500/5'
                        : 'border-destructive/20 bg-destructive/5'
                    }`}
                  >
                    {check.present
                      ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      : <XCircle className="w-4 h-4 text-destructive shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{check.label}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{check.key}</p>
                    </div>
                    <span className={`text-[10px] font-medium ${check.present ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                      {check.present ? '✓ set' : '✗ missing'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Analytics Retention Sweep */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Analytics Retention Sweep</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSweepStatus} disabled={sweepLoading} className="flex items-center gap-2 h-7 text-xs px-2.5">
            <RefreshCw className={`w-3.5 h-3.5 ${sweepLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {sweepLoading && !sweepStatus && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Loading sweep status…
          </div>
        )}

        {sweepError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5">
            <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{sweepError}</p>
          </div>
        )}

        {sweepStatus && (
          <div className="space-y-3">
            {/* Sweep metadata row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Last ran</p>
                <p className="font-medium text-foreground">
                  {sweepStatus.lastRanAt ? formatRelative(sweepStatus.lastRanAt) : <span className="italic text-muted-foreground">never</span>}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Duration</p>
                <p className="font-medium text-foreground">
                  {sweepStatus.lastDurationMs !== null ? `${(sweepStatus.lastDurationMs / 1000).toFixed(1)}s` : <span className="italic text-muted-foreground">—</span>}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Status</p>
                <p className={`font-medium ${sweepStatus.config.enabled ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                  {sweepStatus.config.enabled ? '✓ enabled' : '✗ disabled'}
                </p>
              </div>
            </div>

            {sweepStatus.lastError && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">{sweepStatus.lastError}</p>
              </div>
            )}

            {/* Row counts from last run */}
            {sweepStatus.lastResult ? (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Database className="w-3 h-3" />
                  Rows deleted in last run
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    {
                      label: 'Portfolio visits',
                      key: 'portfolio_visits',
                      count: sweepStatus.lastResult.portfolio_visits_deleted,
                      retentionDays: sweepStatus.config.portfolioVisitsRetentionDays,
                    },
                    {
                      label: 'Error logs',
                      key: 'error_logs',
                      count: sweepStatus.lastResult.error_log_deleted,
                      retentionDays: sweepStatus.config.errorLogRetentionDays,
                    },
                    {
                      label: 'Audit logs',
                      key: 'audit_logs',
                      count: sweepStatus.lastResult.audit_logs_deleted,
                      retentionDays: sweepStatus.config.auditLogsRetentionDays,
                    },
                    {
                      label: 'Trial resumes',
                      key: 'trial_resumes',
                      count: sweepStatus.lastResult.trial_resumes_deleted,
                      retentionDays: null,
                    },
                    {
                      label: 'Admin audit log',
                      key: 'admin_audit_log',
                      count: sweepStatus.lastResult.admin_audit_log_deleted ?? 0,
                      retentionDays: sweepStatus.config.adminAuditLogRetentionDays ?? null,
                    },
                  ].map(({ label, key, count, retentionDays }) => (
                    <div key={key} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{label}</p>
                        {retentionDays !== null && (
                          <p className="text-[10px] text-muted-foreground">{retentionDays}d retention</p>
                        )}
                      </div>
                      <span className={`text-sm font-bold tabular-nums ${count > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No sweep has run yet — results will appear after the first scheduled or manual run.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
