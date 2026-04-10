import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Activity, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';

interface AuditLog {
  id: string;
  user_id: string;
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
    const parts = [];
    if (meta.daily_limit !== null && meta.daily_limit !== undefined) parts.push(`limit→${meta.daily_limit}`);
    if (meta.bonus_credits) parts.push(`+${meta.bonus_credits} bonus`);
    return parts.join(', ');
  }
  if (action === 'redeem' && meta.code) return `code: ${meta.code}`;
  if (meta.reason) return String(meta.reason);
  return '';
}

export function AuditLogPanel({ password }: AuditLogPanelProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await edgeFunctions.functions.invoke('admin-get-settings', {
        body: { password },
      });
      if (err) throw new Error(err.message);

      const { data: logsData, error: logsErr } = await edgeFunctions.functions.invoke('admin-list-users', {
        body: { password, page: 1, per_page: 1 },
      });

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jnsfmkzgxsviuthaqlyy.supabase.co';
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_audit_logs_admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          p_password: password,
          p_limit: 200,
          p_action_filter: actionFilter || null,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setLogs(Array.isArray(result) ? result : (result?.logs ?? []));
      } else {
        setLogs([]);
        setError('Audit log RPC not deployed yet. Run the migration first.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [password, actionFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = actionFilter
    ? logs.filter((l) => l.action === actionFilter)
    : logs;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="w-4 h-4" />
          <span>{filtered.length} log entries</span>
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

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>
      )}

      {loading && !logs.length && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted/50 animate-pulse" />)}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No audit log entries yet.</p>
          <p className="text-xs mt-1">Admin actions (plan changes, trials, etc.) will appear here.</p>
        </div>
      )}

      {filtered.length > 0 && (
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
                {filtered.map((log) => (
                  <tr key={log.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">
                      {log.user_id.slice(0, 8)}…
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
