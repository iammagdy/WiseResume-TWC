import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Activity, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';

interface AuditLog {
  id: string;
  user_id: string;
  user_email: string | null;
  category: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface AuditLogPanelProps {
  password: string;
}

const ACTION_COLORS: Record<string, string> = {
  plan_change: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  trial_grant: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  trial_revoke: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  suspend: 'bg-red-500/10 text-red-600 border-red-500/20',
  unsuspend: 'bg-green-500/10 text-green-600 border-green-500/20',
  credits_override: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  redeem: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  note_added: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
};

const ACTION_FILTERS = [
  { value: '', label: 'All actions' },
  { value: 'plan_change', label: 'Plan change' },
  { value: 'trial_grant', label: 'Trial grant' },
  { value: 'trial_revoke', label: 'Trial revoke' },
  { value: 'suspend', label: 'Suspend' },
  { value: 'unsuspend', label: 'Unsuspend' },
  { value: 'credits_override', label: 'Credits override' },
  { value: 'redeem', label: 'Coupon redeem' },
  { value: 'note_added', label: 'Note added' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function summarizeMetadata(action: string, meta: Record<string, unknown>): string {
  if (action === 'plan_change' && meta.new_plan) return `→ ${meta.new_plan}`;
  if (action === 'trial_grant') return `${meta.trial_plan} for ${meta.days}d`;
  if (action === 'credits_override') {
    const parts: string[] = [];
    if (meta.daily_limit !== null && meta.daily_limit !== undefined) parts.push(`limit→${meta.daily_limit}`);
    if (meta.bonus_credits) parts.push(`+${meta.bonus_credits} bonus`);
    return parts.join(', ');
  }
  if (action === 'redeem' && meta.code) return `code: ${meta.code}`;
  if (action === 'note_added' && meta.note_preview) return String(meta.note_preview).slice(0, 60);
  if (meta.reason) return String(meta.reason);
  return '';
}

export function AuditLogPanel({ password }: AuditLogPanelProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState('');
  const [notDeployed, setNotDeployed] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotDeployed(false);
    try {
      const { data, error: err } = await edgeFunctions.functions.invoke('admin-audit-logs', {
        body: { password, limit: 200, action_filter: actionFilter || null },
      });
      if (err) {
        if (err.message?.includes('Failed to fetch') || err.status === 404) {
          setNotDeployed(true);
          return;
        }
        throw new Error(err.message);
      }
      const result = data as { success?: boolean; logs?: AuditLog[]; message?: string; error?: string };
      if (result?.success === false) throw new Error(result.error ?? 'Unknown error');
      setLogs(result?.logs ?? []);
      if (result?.message) setError(result.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [password, actionFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="w-4 h-4" />
          <span>{logs.length} log entries</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="text-xs bg-background border border-border rounded-md px-2 py-1.5 pr-6 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {ACTION_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-muted-foreground" />
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {notDeployed && (
        <div className="p-4 rounded-xl bg-muted/50 border border-border text-sm text-center text-muted-foreground space-y-1">
          <Activity className="w-6 h-6 mx-auto mb-2 opacity-40" />
          <p className="font-medium">Audit logs function not yet deployed</p>
          <p className="text-xs">Deploy the <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">admin-audit-logs</code> edge function to enable activity logging.</p>
        </div>
      )}

      {error && !notDeployed && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-400">{error}</div>
      )}

      {loading && !logs.length && !notDeployed && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted/50 animate-pulse" />)}
        </div>
      )}

      {!loading && !error && !notDeployed && logs.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No audit log entries yet.</p>
          <p className="text-xs mt-1">Admin actions (plan changes, trials, etc.) will appear here.</p>
        </div>
      )}

      {logs.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Details</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">When</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px]">
                      {log.user_email
                        ? <span className="truncate block" title={log.user_email}>{log.user_email}</span>
                        : <span className="font-mono text-[10px]">{log.user_id.slice(0, 8)}…</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-[10px] capitalize ${ACTION_COLORS[log.action] ?? 'bg-muted/40 text-muted-foreground border-border'}`}>
                        {log.action.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                      {summarizeMetadata(log.action, log.metadata || {})}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
