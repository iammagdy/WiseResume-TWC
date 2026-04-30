import { useState, useEffect, useCallback } from 'react';
import {
  Megaphone, Mail, Wrench, Database, RefreshCw, Plus, Trash2,
  Send, Clock, CheckCircle, AlertCircle, Loader2, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { useIsMounted } from '@/lib/devkit/hooks';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Broadcast {
  id: string;
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'critical';
  active: boolean;
  created_by: string;
  created_at: string;
  expires_at: string | null;
}

type Audience = 'all' | 'pro' | 'free' | 'trial';

const SEVERITY_COLORS = {
  info: 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  warning: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  critical: 'border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/50 dark:text-red-300',
};

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export function OwnerOpsPanel() {
  const isMounted = useIsMounted();

  // ── In-app Broadcasts ────────────────────────────────────────────────────
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [broadcastsLoading, setBroadcastsLoading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newSeverity, setNewSeverity] = useState<'info' | 'warning' | 'critical'>('info');
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [expiringId, setExpiringId] = useState<string | null>(null);

  const fetchBroadcasts = useCallback(async () => {
    setBroadcastsLoading(true);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-email', {
        headers: devKitAuthHeaders(),
        body: { module: 'broadcast', action: 'list' },
      });
      const res = unwrapAdminResponse<{ broadcasts: Broadcast[] }>(tuple, 'admin-email');
      if (isMounted()) setBroadcasts(res.broadcasts ?? []);
    } catch (e) {
      if (isMounted()) toast.error(formatEdgeError(e, 'Failed to load broadcasts'));
    } finally {
      if (isMounted()) setBroadcastsLoading(false);
    }
  }, [isMounted]);

  useEffect(() => { fetchBroadcasts(); }, [fetchBroadcasts]);

  const handlePublish = async () => {
    if (!newTitle.trim() || !newBody.trim()) {
      toast.error('Title and body are required');
      return;
    }
    setPublishing(true);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-email', {
        headers: devKitAuthHeaders(),
        body: {
          module: 'broadcast',
          action: 'publish',
          title: newTitle.trim(),
          body: newBody.trim(),
          severity: newSeverity,
          expires_at: newExpiresAt || null,
        },
      });
      unwrapAdminResponse(tuple, 'admin-email');
      toast.success('Broadcast published — users will see it on next load');
      setNewTitle('');
      setNewBody('');
      setNewSeverity('info');
      setNewExpiresAt('');
      await fetchBroadcasts();
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to publish broadcast'));
    } finally {
      if (isMounted()) setPublishing(false);
    }
  };

  const handleExpire = async (id: string) => {
    setExpiringId(id);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-email', {
        headers: devKitAuthHeaders(),
        body: { module: 'broadcast', action: 'expire', id },
      });
      unwrapAdminResponse(tuple, 'admin-email');
      toast.success('Broadcast removed');
      await fetchBroadcasts();
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to remove broadcast'));
    } finally {
      if (isMounted()) setExpiringId(null);
    }
  };

  // ── Email Broadcast ──────────────────────────────────────────────────────
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailAudience, setEmailAudience] = useState<Audience>('all');
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);

  const handleEstimate = async () => {
    setEstimating(true);
    setRecipientCount(null);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-email', {
        headers: devKitAuthHeaders(),
        body: { module: 'email-actions', action: 'estimate_broadcast_recipients', audience: emailAudience },
      });
      const res = unwrapAdminResponse<{ count: number }>(tuple, 'admin-email');
      if (isMounted()) setRecipientCount(res.count ?? 0);
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to estimate recipients'));
    } finally {
      if (isMounted()) setEstimating(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error('Subject and body are required');
      return;
    }
    setSending(true);
    setConfirmSend(false);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-email', {
        headers: devKitAuthHeaders(),
        body: {
          module: 'email-actions',
          action: 'send_email_broadcast',
          audience: emailAudience,
          broadcast_subject: emailSubject.trim(),
          broadcast_body: emailBody.trim(),
        },
      });
      const res = unwrapAdminResponse<{ sent: number; failed: number; total: number }>(tuple, 'admin-email');
      toast.success(`Sent to ${res.sent} recipients${res.failed > 0 ? ` (${res.failed} failed)` : ''}`);
      setEmailSubject('');
      setEmailBody('');
      setRecipientCount(null);
    } catch (e) {
      toast.error(formatEdgeError(e, 'Broadcast email failed'));
    } finally {
      if (isMounted()) setSending(false);
    }
  };

  // ── Maintenance Window ───────────────────────────────────────────────────
  const [maintSettings, setMaintSettings] = useState<Record<string, string>>({});
  const [maintLoading, setMaintLoading] = useState(false);
  const [maintWindowStart, setMaintWindowStart] = useState('');
  const [maintWindowEnd, setMaintWindowEnd] = useState('');
  const [savingMaint, setSavingMaint] = useState(false);
  const [clearingMaint, setClearingMaint] = useState(false);
  const [msUntilStart, setMsUntilStart] = useState<number | null>(null);

  const fetchMaintSettings = useCallback(async () => {
    setMaintLoading(true);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-get-settings', {
        headers: devKitAuthHeaders(),
        body: {},
      });
      const res = unwrapAdminResponse<{ settings: Record<string, unknown> }>(tuple, 'admin-get-settings');
      const s = res.settings ?? {};
      const raw: Record<string, string> = {};
      for (const [k, v] of Object.entries(s)) {
        raw[k] = v === null || v === undefined ? '' : String(v);
      }
      if (isMounted()) {
        setMaintSettings(raw);
        setMaintWindowStart(raw['maintenance_window_start'] ?? '');
        setMaintWindowEnd(raw['maintenance_window_end'] ?? '');
      }
    } catch (e) {
      if (isMounted()) toast.error(formatEdgeError(e, 'Failed to load maintenance settings'));
    } finally {
      if (isMounted()) setMaintLoading(false);
    }
  }, [isMounted]);

  useEffect(() => { fetchMaintSettings(); }, [fetchMaintSettings]);

  useEffect(() => {
    if (!maintWindowStart) { setMsUntilStart(null); return; }
    const update = () => {
      const ms = new Date(maintWindowStart).getTime() - Date.now();
      setMsUntilStart(ms);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [maintWindowStart]);

  const saveMaintWindow = async () => {
    if (!maintWindowStart || !maintWindowEnd) {
      toast.error('Both start and end times are required');
      return;
    }
    if (new Date(maintWindowEnd) <= new Date(maintWindowStart)) {
      toast.error('End time must be after start time');
      return;
    }
    setSavingMaint(true);
    try {
      const [tupleStart, tupleEnd] = await Promise.all([
        edgeFunctions.functions.invoke('admin-update-settings', {
          headers: devKitAuthHeaders(),
          body: { key: 'maintenance_window_start', value: maintWindowStart },
        }),
        edgeFunctions.functions.invoke('admin-update-settings', {
          headers: devKitAuthHeaders(),
          body: { key: 'maintenance_window_end', value: maintWindowEnd },
        }),
      ]);
      unwrapAdminResponse(tupleStart, 'admin-update-settings');
      unwrapAdminResponse(tupleEnd, 'admin-update-settings');
      toast.success('Maintenance window saved');
      await fetchMaintSettings();
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to save maintenance window'));
    } finally {
      if (isMounted()) setSavingMaint(false);
    }
  };

  const clearMaintWindow = async () => {
    setClearingMaint(true);
    try {
      const [tStart, tEnd] = await Promise.all([
        edgeFunctions.functions.invoke('admin-update-settings', {
          headers: devKitAuthHeaders(),
          body: { key: 'maintenance_window_start', value: null },
        }),
        edgeFunctions.functions.invoke('admin-update-settings', {
          headers: devKitAuthHeaders(),
          body: { key: 'maintenance_window_end', value: null },
        }),
      ]);
      unwrapAdminResponse(tStart, 'admin-update-settings');
      unwrapAdminResponse(tEnd, 'admin-update-settings');
      setMaintWindowStart('');
      setMaintWindowEnd('');
      toast.success('Maintenance window cleared');
      await fetchMaintSettings();
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to clear maintenance window'));
    } finally {
      if (isMounted()) setClearingMaint(false);
    }
  };

  function formatCountdown(ms: number): string {
    if (ms <= 0) return 'now';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ${h % 24}h`;
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  }

  const maintWindowNow = maintSettings['maintenance_window_start'] && maintSettings['maintenance_window_end']
    ? Date.now() >= new Date(maintSettings['maintenance_window_start']).getTime()
      && Date.now() <= new Date(maintSettings['maintenance_window_end']).getTime()
    : false;

  // ── Backup Trigger ───────────────────────────────────────────────────────
  const [backups, setBackups] = useState<Array<Record<string, unknown>>>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupNotConfigured, setBackupNotConfigured] = useState(false);

  const fetchBackups = useCallback(async () => {
    setBackupLoading(true);
    setBackupError(null);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-owner-ops', {
        headers: devKitAuthHeaders(),
        body: { action: 'get_backup_status' },
      });
      const res = unwrapAdminResponse<{ backups?: Array<Record<string, unknown>>; not_configured?: boolean }>(tuple, 'admin-owner-ops');
      if (isMounted()) {
        setBackups(res.backups ?? []);
        setBackupNotConfigured(false);
      }
    } catch (e) {
      if (isMounted()) {
        const msg = formatEdgeError(e, '');
        if (msg.includes('not configured') || msg.includes('SUPABASE_ACCESS_TOKEN')) {
          setBackupNotConfigured(true);
        } else {
          setBackupError(msg);
        }
      }
    } finally {
      if (isMounted()) setBackupLoading(false);
    }
  }, [isMounted]);

  useEffect(() => { fetchBackups(); }, [fetchBackups]);

  const handleTriggerBackup = async () => {
    setTriggering(true);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-owner-ops', {
        headers: devKitAuthHeaders(),
        body: { action: 'trigger_backup' },
      });
      unwrapAdminResponse(tuple, 'admin-owner-ops');
      toast.success('Backup snapshot triggered');
      await fetchBackups();
    } catch (e) {
      toast.error(formatEdgeError(e, 'Backup trigger failed'));
    } finally {
      if (isMounted()) setTriggering(false);
    }
  };

  const activeBroadcasts = broadcasts.filter((b) => b.active);

  return (
    <div className="space-y-6">

      {/* ── In-app Broadcasts ── */}
      <SectionCard title="In-app Broadcasts" icon={Megaphone}>
        <p className="text-xs text-muted-foreground">
          Publish a dismissible banner visible to all users on their next page load. Active until removed or expired.
        </p>

        {/* Active broadcasts list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Active broadcasts ({activeBroadcasts.length})</p>
            <Button variant="ghost" size="sm" onClick={fetchBroadcasts} disabled={broadcastsLoading} className="h-6 px-2">
              <RefreshCw className={cn('w-3 h-3', broadcastsLoading && 'animate-spin')} />
            </Button>
          </div>
          {activeBroadcasts.length === 0 && !broadcastsLoading && (
            <p className="text-xs text-muted-foreground italic">No active broadcasts</p>
          )}
          {activeBroadcasts.map((b) => (
            <div key={b.id} className={cn('flex items-start gap-2 rounded-lg border p-3', SEVERITY_COLORS[b.severity])}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">{b.title}</p>
                <p className="text-xs opacity-80 mt-0.5">{b.body}</p>
                <p className="text-[10px] opacity-60 mt-1">
                  {b.severity} · {new Date(b.created_at).toLocaleString()}
                  {b.expires_at && ` · expires ${new Date(b.expires_at).toLocaleString()}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-current opacity-60 hover:opacity-100"
                disabled={expiringId === b.id}
                onClick={() => handleExpire(b.id)}
              >
                {expiringId === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              </Button>
            </div>
          ))}
        </div>

        {/* Publish form */}
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Publish new broadcast</p>
          <Input
            placeholder="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="h-9 text-sm"
          />
          <Textarea
            placeholder="Body message…"
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            rows={2}
            className="text-sm resize-none"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Severity</label>
              <select
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value as 'info' | 'warning' | 'critical')}
                className="w-full h-9 text-sm rounded-md border border-input bg-background px-3 focus:outline-none"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Expires at (optional)</label>
              <Input
                type="datetime-local"
                value={newExpiresAt}
                onChange={(e) => setNewExpiresAt(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={publishing || !newTitle.trim() || !newBody.trim()}
            className="flex items-center gap-2"
          >
            {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {publishing ? 'Publishing…' : 'Publish broadcast'}
          </Button>
        </div>
      </SectionCard>

      {/* ── Email Broadcast ── */}
      <SectionCard title="Email Broadcast" icon={Mail}>
        <p className="text-xs text-muted-foreground">
          Send a one-time email to a segment of users via Resend. Batched at 50/request with rate-limiting.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Audience</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['all', 'pro', 'free', 'trial'] as Audience[]).map((a) => (
                <button
                  key={a}
                  onClick={() => { setEmailAudience(a); setRecipientCount(null); }}
                  className={cn(
                    'h-8 rounded-md border text-xs font-medium transition-all',
                    emailAudience === a
                      ? 'border-primary/60 bg-primary/5 text-primary'
                      : 'border-border hover:border-muted-foreground/40',
                  )}
                >
                  {a === 'all' ? 'All users' : a === 'pro' ? 'Pro users' : a === 'free' ? 'Free users' : 'Trial users'}
                </button>
              ))}
            </div>
          </div>

          <Input
            placeholder="Subject line"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            className="h-9 text-sm"
          />
          <Textarea
            placeholder="Email body (plain text — line breaks are preserved)"
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            rows={4}
            className="text-sm resize-none"
          />

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleEstimate} disabled={estimating}>
              {estimating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Clock className="w-3.5 h-3.5 mr-1.5" />}
              {estimating ? 'Counting…' : 'Count recipients'}
            </Button>
            {recipientCount !== null && (
              <span className="text-xs text-muted-foreground">
                <strong>{recipientCount}</strong> recipient{recipientCount !== 1 ? 's' : ''} in "{emailAudience}" segment
              </span>
            )}
          </div>

          {!confirmSend ? (
            <Button
              size="sm"
              onClick={() => setConfirmSend(true)}
              disabled={!emailSubject.trim() || !emailBody.trim() || sending}
              className="flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              Send to {emailAudience} users
            </Button>
          ) : (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
              <p className="text-xs text-destructive font-medium">
                Send "{emailSubject}" to{' '}
                {recipientCount !== null ? `${recipientCount} recipients` : `all ${emailAudience} users`}? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfirmSend(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSendBroadcast} disabled={sending} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                  {sending ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Sending…</> : <>Confirm & send</>}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── Maintenance Window ── */}
      <SectionCard title="Scheduled Maintenance" icon={Wrench}>
        <p className="text-xs text-muted-foreground">
          Schedule a maintenance window. Maintenance mode activates automatically at start time and deactivates at end time.
          Users see a countdown banner within 24h of the start.
        </p>

        {maintLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-3">
            {maintWindowNow && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-700 text-amber-800 dark:text-amber-300 p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p className="text-xs font-medium">Maintenance window is currently active</p>
              </div>
            )}

            {msUntilStart !== null && msUntilStart > 0 && msUntilStart <= 24 * 60 * 60 * 1000 && (
              <div className="rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-700 text-blue-800 dark:text-blue-300 p-3 flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0" />
                <p className="text-xs font-medium">Maintenance starts in <strong>{formatCountdown(msUntilStart)}</strong></p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Window start</label>
                <Input
                  type="datetime-local"
                  value={maintWindowStart}
                  onChange={(e) => setMaintWindowStart(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Window end</label>
                <Input
                  type="datetime-local"
                  value={maintWindowEnd}
                  onChange={(e) => setMaintWindowEnd(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={saveMaintWindow} disabled={savingMaint || !maintWindowStart || !maintWindowEnd}>
                {savingMaint ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                {savingMaint ? 'Saving…' : 'Save window'}
              </Button>
              {(maintSettings['maintenance_window_start'] || maintSettings['maintenance_window_end']) && (
                <Button size="sm" variant="outline" onClick={clearMaintWindow} disabled={clearingMaint} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                  {clearingMaint ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                  Clear window
                </Button>
              )}
            </div>

            {maintSettings['maintenance_window_start'] && (
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Scheduled: <strong>{new Date(maintSettings['maintenance_window_start']).toLocaleString()}</strong> → <strong>{maintSettings['maintenance_window_end'] ? new Date(maintSettings['maintenance_window_end']).toLocaleString() : '—'}</strong></p>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* ── Backup Trigger ── */}
      <SectionCard title="Database Backup" icon={Database}>
        <p className="text-xs text-muted-foreground">
          Trigger an on-demand PITR backup snapshot via the Supabase Management API. Requires{' '}
          <code className="font-mono text-xs bg-muted px-1 rounded">SUPABASE_ACCESS_TOKEN</code> edge function secret.
        </p>

        {backupNotConfigured ? (
          <div className="rounded-lg border border-amber-300/40 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
            <p className="font-medium">SUPABASE_ACCESS_TOKEN not configured</p>
            <p>Set a Supabase Personal Access Token as an edge function secret to enable backup triggers.</p>
          </div>
        ) : backupError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <p className="font-medium">Error loading backups</p>
            <p className="opacity-80 mt-0.5">{backupError}</p>
          </div>
        ) : null}

        {!backupNotConfigured && (
          <>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleTriggerBackup}
                disabled={triggering || backupNotConfigured}
                className="flex items-center gap-2"
              >
                {triggering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                {triggering ? 'Triggering…' : 'Trigger backup now'}
              </Button>
              <Button variant="ghost" size="sm" onClick={fetchBackups} disabled={backupLoading}>
                <RefreshCw className={cn('w-3.5 h-3.5', backupLoading && 'animate-spin')} />
              </Button>
            </div>

            {backups.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Recent backups</p>
                {backups.slice(0, 5).map((b, i) => {
                  const ts = (b.inserted_at ?? b.created_at ?? b.finished_at ?? '') as string;
                  const status = (b.status ?? b.type ?? '') as string;
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      {status.toLowerCase().includes('fail')
                        ? <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                        : <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                      <span>{ts ? new Date(ts).toLocaleString() : 'Unknown time'}</span>
                      {status && <span className="opacity-60">· {status}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </SectionCard>

    </div>
  );
}
