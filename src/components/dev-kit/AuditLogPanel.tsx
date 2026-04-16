import { useState, useCallback, useEffect, useRef } from 'react';
import { RefreshCw, Activity, ChevronDown, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { getDevKitToken } from '@/contexts/DevKitSessionContext';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  category: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
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
  note_deleted: 'bg-red-500/10 text-red-600 border-red-500/20',
  account_deleted: 'bg-red-500/10 text-red-600 border-red-500/20',
  sessions_revoked: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
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
  { value: 'note_deleted', label: 'Note deleted' },
  { value: 'account_deleted', label: 'Account deleted' },
  { value: 'sessions_revoked', label: 'Sessions revoked' },
];

const PER_PAGE = 50;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function summarizeMetadata(action: string, meta: Record<string, unknown>): string {
  if (action === 'plan_change' && meta.new_plan) return `→ ${meta.new_plan}`;
  if (action === 'trial_grant') return `${meta.trial_plan} for ${meta.days}d`;
  if (action === 'trial_revoke') return 'Trial revoked';
  if (action === 'credits_override') {
    const parts: string[] = [];
    if (meta.daily_limit !== null && meta.daily_limit !== undefined) parts.push(`limit→${meta.daily_limit}`);
    if (meta.bonus_credits) parts.push(`+${meta.bonus_credits} bonus`);
    return parts.join(', ');
  }
  if (action === 'redeem' && meta.code) return `code: ${meta.code}`;
  if (action === 'note_added' && meta.note_preview) return String(meta.note_preview).slice(0, 60);
  if (action === 'account_deleted' && meta.deleted_email) return `email: ${meta.deleted_email}`;
  if (action === 'profile_update') {
    const changed = meta.changed_fields as Record<string, { old: unknown; new: unknown }> | undefined;
    if (!changed) return 'Profile updated';
    const parts: string[] = [];
    if (changed.full_name) parts.push(`name: "${changed.full_name.old}" → "${changed.full_name.new}"`);
    if (changed.username) parts.push(`username: "${changed.username.old}" → "${changed.username.new}"`);
    return parts.join(', ') || 'Profile updated';
  }
  if (action === 'identity_merged') {
    const orphanId = meta.orphan_user_id as string | undefined;
    return `Identity merged${orphanId ? ` (orphan: ${String(orphanId).slice(0, 8)}…)` : ''}`;
  }
  if (meta.reason) return String(meta.reason);
  return '';
}

export function AuditLogPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState('');
  const [notDeployed, setNotDeployed] = useState(false);
  const [page, setPage] = useState(1);

  // Search and date filter state
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exportingCSV, setExportingCSV] = useState(false);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 500);
  };

  const fetchLogs = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    setNotDeployed(false);
    try {
      const { data, error: err } = await edgeFunctions.functions.invoke('admin-audit-logs', {
        body: {
          password: getDevKitToken(),
          limit: PER_PAGE,
          offset: (pageNum - 1) * PER_PAGE,
          action_filter: actionFilter || null,
          search: search.trim() || null,
          date_from: dateFrom ? new Date(dateFrom).toISOString() : null,
          date_to: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : null,
        },
      });
      if (err) {
        if (err.message?.includes('Failed to fetch') || err.status === 404) {
          setNotDeployed(true);
          return;
        }
        throw new Error(err.message);
      }
      const result = data as { success?: boolean; logs?: AuditLog[]; total?: number; message?: string; error?: string };
      if (result?.success === false) throw new Error(result.error ?? 'Unknown error');
      setLogs(result?.logs ?? []);
      setTotal(result?.total ?? (result?.logs ?? []).length);
      if (result?.message) setError(result.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, search, dateFrom, dateTo]);

  useEffect(() => {
    setPage(1);
    fetchLogs(1);
  }, [fetchLogs]);

  useEffect(() => {
    fetchLogs(page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const interval = setInterval(() => fetchLogs(page), 30_000);
    return () => clearInterval(interval);
  }, [fetchLogs, page]);

  const handleExportCSV = async () => {
    setExportingCSV(true);
    try {
      const { data, error: err } = await edgeFunctions.functions.invoke('admin-audit-logs', {
        body: {
          password: getDevKitToken(),
          limit: 0,
          offset: 0,
          action_filter: actionFilter || null,
          search: search.trim() || null,
          date_from: dateFrom ? new Date(dateFrom).toISOString() : null,
          date_to: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : null,
        },
      });
      if (err) throw new Error(err.message);
      const result = data as { success?: boolean; logs?: AuditLog[] };
      const allLogs = result?.logs ?? [];
      if (!allLogs.length) {
        setExportingCSV(false);
        return;
      }
      if (allLogs.length >= 10_000) {
        toast.warning('Export may be truncated', {
          description: 'The export returned 10,000 rows — there may be more. Add a date range filter to export a smaller window.',
          duration: 8000,
        });
      }

      const headers = ['ID', 'User ID', 'User Email', 'Category', 'Action', 'Details', 'When'];
      const rows = allLogs.map(l => [
        l.id,
        l.user_id ?? '',
        l.user_email ?? '',
        l.category,
        l.action,
        summarizeMetadata(l.action, l.metadata || {}),
        l.created_at,
      ]);
      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wiseresume-audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to export CSV');
    } finally {
      setExportingCSV(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="w-4 h-4" />
          <span>{total} log entries</span>
        </div>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search by email or user ID…"
              className="pl-8 h-8 text-xs w-52"
            />
          </div>

          {/* Date from */}
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="h-8 text-xs bg-background border border-border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            title="From date"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="h-8 text-xs bg-background border border-border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            title="To date"
          />

          {/* Action filter */}
          <div className="relative">
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="text-xs bg-background border border-border rounded-md px-2 py-1.5 pr-6 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {ACTION_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-muted-foreground" />
          </div>

          <Button variant="outline" size="sm" onClick={() => fetchLogs(page)} disabled={loading} className="h-8">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={exportingCSV || loading}
            className="h-8 gap-1.5 text-xs"
          >
            {exportingCSV ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {exportingCSV ? 'Exporting…' : 'Download CSV'}
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
          <p className="text-sm">No audit log entries found.</p>
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
                        : log.user_id
                          ? <span className="font-mono text-[10px]">{log.user_id.slice(0, 8)}…</span>
                          : <span className="text-[10px] italic text-muted-foreground">unknown recipient</span>
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

      {/* Pagination */}
      {total > PER_PAGE && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages} · {total} entries
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2 tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
