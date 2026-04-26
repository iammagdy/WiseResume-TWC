import { useState, useCallback, useEffect } from 'react';
import {
  RefreshCw,
  Search,
  Plus,
  Minus,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Loader2,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { useIsMounted } from '@/lib/devkit/hooks';

interface AudienceStat {
  key: string;
  label: string;
  configured: boolean;
  id: string | null;
  contactCount: number | null;
  name?: string;
}

interface ChecklistItem {
  key: string;
  name: string;
  audienceKey: string;
  trigger: string;
  emails: readonly string[];
}

interface StatsResponse {
  audiences: AudienceStat[];
  checklist: ChecklistItem[];
}

function ContactCountBadge({ count }: { count: number | null }) {
  if (count === null) {
    return (
      <span className="text-xs text-muted-foreground">—</span>
    );
  }
  return (
    <span className="text-sm font-semibold tabular-nums text-foreground">
      {count.toLocaleString()}
    </span>
  );
}

function AudienceCard({
  audience,
  onManualAdd,
  onManualRemove,
  actionLoading,
}: {
  audience: AudienceStat;
  onManualAdd: (audienceKey: string, audienceLabel: string) => void;
  onManualRemove: (audienceKey: string, audienceLabel: string) => void;
  actionLoading: string | null;
}) {
  const envKey = `RESEND_AUDIENCE_${audience.key}`;
  const isLoading = actionLoading === audience.key + '_add' || actionLoading === audience.key + '_remove';

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${
      audience.configured
        ? 'border-border bg-card'
        : 'border-dashed border-border bg-muted/20'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {audience.configured ? (
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            <span className="text-sm font-semibold text-foreground truncate">
              {audience.name ?? audience.label}
            </span>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground mt-0.5 pl-6">{envKey}</p>
        </div>
        <div className="text-right shrink-0">
          {audience.configured ? (
            <div>
              <ContactCountBadge count={audience.contactCount} />
              <p className="text-[10px] text-muted-foreground">contacts</p>
            </div>
          ) : (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full">
              not set
            </span>
          )}
        </div>
      </div>

      {audience.configured && (
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs flex items-center gap-1.5"
            disabled={!!actionLoading}
            onClick={() => onManualAdd(envKey, audience.label)}
          >
            {isLoading && actionLoading === audience.key + '_add' ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
            Add contact
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs flex items-center gap-1.5 text-muted-foreground"
            disabled={!!actionLoading}
            onClick={() => onManualRemove(envKey, audience.label)}
          >
            {isLoading && actionLoading === audience.key + '_remove' ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            Remove
          </Button>
        </div>
      )}

      {!audience.configured && (
        <p className="text-xs text-muted-foreground pl-6 leading-relaxed">
          Set <code className="font-mono bg-muted px-1 py-0.5 rounded text-[10px]">{envKey}</code> in{' '}
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Supabase Edge Function Secrets
          </a>{' '}
          to enable this audience.
        </p>
      )}
    </div>
  );
}

export function EmailAutomationsPanel() {
  const [stats, setStats] = useState<AudienceStat[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<string[] | null>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{ total: number; added: number; failed: number } | null>(null);

  const isMounted = useIsMounted();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-resend-stats', {
        headers: devKitAuthHeaders(),
        body: { action: 'stats' },
      });
      const result = unwrapAdminResponse<StatsResponse>(tuple, 'admin-resend-stats');
      if (!isMounted()) return;
      setStats(result.audiences ?? []);
      setChecklist(result.checklist ?? []);
      setLoaded(true);
    } catch (e) {
      if (!isMounted()) return;
      setError(formatEdgeError(e, 'Failed to load audience stats'));
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleLookup = async () => {
    const email = lookupEmail.trim().toLowerCase();
    if (!email) return;
    setLookupLoading(true);
    setLookupResult(null);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-resend-stats', {
        headers: devKitAuthHeaders(),
        body: { action: 'lookup', email },
      });
      const result = unwrapAdminResponse<{ foundIn: string[] }>(tuple, 'admin-resend-stats');
      if (!isMounted()) return;
      setLookupResult(result.foundIn ?? []);
    } catch (e) {
      if (!isMounted()) return;
      toast.error(formatEdgeError(e, 'Lookup failed'));
    } finally {
      if (isMounted()) setLookupLoading(false);
    }
  };

  const handleManualAdd = (audienceKey: string, audienceLabel: string) => {
    const email = window.prompt(`Email to add to "${audienceLabel}" audience:`);
    if (!email?.trim()) return;
    void doAction('add', audienceKey, audienceLabel, email.trim().toLowerCase());
  };

  const handleManualRemove = (audienceKey: string, audienceLabel: string) => {
    const email = window.prompt(`Email to remove from "${audienceLabel}" audience:`);
    if (!email?.trim()) return;
    void doAction('remove', audienceKey, audienceLabel, email.trim().toLowerCase());
  };

  const doAction = async (
    action: 'add' | 'remove',
    audienceKey: string,
    audienceLabel: string,
    email: string,
  ) => {
    const loadingKey = audienceKey.replace('RESEND_AUDIENCE_', '') + '_' + action;
    setActionLoading(loadingKey);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-resend-stats', {
        headers: devKitAuthHeaders(),
        body: { action, audienceKey, email },
      });
      unwrapAdminResponse(tuple, 'admin-resend-stats');
      if (!isMounted()) return;
      toast.success(
        action === 'add'
          ? `${email} added to "${audienceLabel}"`
          : `${email} removed from "${audienceLabel}"`,
      );
      fetchStats();
    } catch (e) {
      if (!isMounted()) return;
      toast.error(formatEdgeError(e, `Failed to ${action} contact`));
    } finally {
      if (isMounted()) setActionLoading(null);
    }
  };

  const handleSyncAllUsers = async () => {
    if (!confirm('Sync all existing users into the "All Users" Resend Audience? This may take a few seconds for large user bases.')) return;
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-resend-sync', {
        headers: devKitAuthHeaders(),
        body: {},
      });
      const result = unwrapAdminResponse<{ total: number; added: number; failed: number }>(tuple, 'admin-resend-sync');
      if (!isMounted()) return;
      setSyncResult(result);
      toast.success(`Sync complete: ${result.added} of ${result.total} contacts upserted`);
      fetchStats();
    } catch (e) {
      if (!isMounted()) return;
      toast.error(formatEdgeError(e, 'Sync failed'));
    } finally {
      if (isMounted()) setSyncLoading(false);
    }
  };

  const configuredCount = stats.filter((a) => a.configured).length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">
              {loaded ? `${configuredCount} / ${stats.length} audiences configured` : 'Loading…'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Resend Audiences drive email automations without additional edge functions.{' '}
            <span className="text-muted-foreground/70">
              Note: Resend&apos;s REST API does not expose per-automation send metrics — view email send stats in the{' '}
              <a
                href="https://resend.com/automations"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Resend dashboard
              </a>
              .
            </span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStats}
          disabled={loading}
          className="h-8 flex items-center gap-1.5 text-xs shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-sm text-destructive flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{error}</p>
            <p className="text-xs text-destructive/70 mt-1">
              Deploy <code className="font-mono text-xs bg-destructive/10 px-1 py-0.5 rounded">admin-resend-stats</code> to your Supabase project and ensure DEV_KIT_PASSWORD is configured.
            </p>
          </div>
        </div>
      )}

      {/* Audience Cards */}
      {loaded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.map((audience) => (
            <AudienceCard
              key={audience.key}
              audience={audience}
              onManualAdd={handleManualAdd}
              onManualRemove={handleManualRemove}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}

      {loading && !loaded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      )}

      {/* Contact lookup */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            Contact Lookup
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Search for a contact across all audiences.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            className="h-8 text-xs flex-1"
            placeholder="user@example.com"
            value={lookupEmail}
            onChange={(e) => { setLookupEmail(e.target.value); setLookupResult(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLookup(); }}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs shrink-0"
            onClick={handleLookup}
            disabled={lookupLoading || !lookupEmail.trim()}
          >
            {lookupLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
          </Button>
        </div>
        {lookupResult !== null && (
          <div className={`rounded-lg border px-3 py-2.5 text-sm ${
            lookupResult.length > 0
              ? 'border-green-500/20 bg-green-500/5'
              : 'border-border bg-muted/20'
          }`}>
            {lookupResult.length > 0 ? (
              <p className="text-xs text-foreground">
                <span className="font-medium">{lookupEmail}</span> is in:{' '}
                {lookupResult.join(', ')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">{lookupEmail}</span> was not found in any configured audience.
              </p>
            )}
          </div>
        )}
      </div>

      {/* All-Users Sync */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              All-Users Backfill Sync
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upserts every existing user into the "All Users" audience. New signups are synced automatically.
              Run this once after setting up the <code className="font-mono text-[10px] bg-muted px-1 py-0.5 rounded">RESEND_AUDIENCE_ALL_USERS</code> secret.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs shrink-0 flex items-center gap-1.5"
            onClick={handleSyncAllUsers}
            disabled={syncLoading}
          >
            {syncLoading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />Syncing…</>
            ) : (
              <>Run Sync</>
            )}
          </Button>
        </div>
        {syncResult && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2.5 text-xs text-green-700 dark:text-green-400">
            Sync complete — {syncResult.added} upserted, {syncResult.failed} failed, {syncResult.total} total.
          </div>
        )}
      </div>

      {/* Automation Checklist */}
      {loaded && checklist.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                Resend Automation Workflows
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                These automations must be configured manually in the Resend dashboard.
              </p>
            </div>
            <a
              href="https://resend.com/automations"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Resend Automations
            </a>
          </div>

          <div className="space-y-3">
            {checklist.map((item) => {
              const audienceStat = stats.find(
                (a) => `RESEND_AUDIENCE_${a.key}` === item.audienceKey || a.key === item.audienceKey.replace('RESEND_AUDIENCE_', ''),
              );
              const configured = audienceStat?.configured ?? false;

              return (
                <div key={item.key} className={`rounded-lg border p-3 space-y-2 ${
                  configured ? 'border-border' : 'border-dashed border-border opacity-60'
                }`}>
                  <div className="flex items-center gap-2">
                    {configured ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-foreground">{item.name}</span>
                    {!configured && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                        audience not set
                      </span>
                    )}
                  </div>
                  <div className="pl-5 space-y-1">
                    <p className="text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">Trigger:</span> {item.trigger}
                    </p>
                    <ul className="space-y-0.5">
                      {item.emails.map((email, i) => (
                        <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                          <span className="mt-0.5 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                          {email}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
