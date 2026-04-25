import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Search, Users, Download, Filter, ChevronDown, CheckSquare, Square, X, Crown, ShieldOff, Shield, Zap, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { AccountTypeBadge } from './DevKitBadges';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { getDevKitToken } from '@/contexts/DevKitSessionContext';
import { UserDetailDrawer } from './UserDetailDrawer';
import { toast } from 'sonner';
import { useIsMounted } from '@/lib/devkit/hooks';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

interface BulkActionResult {
  user_id: string;
  email: string;
  status: 'success' | 'error';
  error?: string;
}

export interface AdminUser {
  user_id: string;
  email: string;
  contact_email: string | null;
  full_name: string | null;
  plan_name: 'free' | 'pro' | 'premium';
  account_type: 'job_seeker' | 'hr';
  plan_status: string;
  created_at: string;
  resume_count: number;
  link_count: number;
  last_sign_in_at: string | null;
  plan_updated_at: string | null;
  trial_plan: string | null;
  trial_expires_at: string | null;
  is_suspended: boolean;
  suspension_reason: string | null;
  credits_used_today: number;
  daily_limit: number | null;
  email_confirmed_at: string | null;
  has_id_conflict: boolean;
  matched_via?: string;
}

interface AdminUsersPanelProps {
  onCountChange?: (count: number) => void;
}

type BulkAction = 'plan_change' | 'suspend' | 'unsuspend' | 'trial_grant';

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-muted text-muted-foreground border-border',
  pro: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
  premium: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'most_active', label: 'Most recently active' },
  { value: 'most_resumes', label: 'Most resumes' },
];

const PLAN_FILTERS = [
  { value: '', label: 'All plans' },
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'premium', label: 'Premium' },
  { value: 'trial', label: 'Trial' },
  { value: 'suspended', label: 'Suspended' },
];

type FilterTab = 'all' | 'id_conflicts';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function CopyableId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const short = id.slice(0, 8) + '…';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      onClick={handleCopy}
      title={id}
      className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? '✓ copied' : short}
    </button>
  );
}

interface BulkConfirmDialogProps {
  action: BulkAction;
  users: AdminUser[];
  onConfirm: (params: { plan?: string; days?: number; trialPlan?: string }) => void;
  onCancel: () => void;
  isRunning: boolean;
}

function BulkConfirmDialog({ action, users, onConfirm, onCancel, isRunning }: BulkConfirmDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro' | 'premium'>('pro');
  const [trialPlan, setTrialPlan] = useState<'pro' | 'premium'>('pro');
  const [trialDays, setTrialDays] = useState(7);

  const actionLabel: Record<BulkAction, string> = {
    plan_change: 'Change Plan',
    suspend: 'Suspend',
    unsuspend: 'Unsuspend',
    trial_grant: 'Grant Trial',
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="font-semibold text-sm">{actionLabel[action]} — {users.length} {users.length === 1 ? 'user' : 'users'}</h3>

        <div className="max-h-36 overflow-y-auto rounded-lg border border-border divide-y divide-border">
          {users.map(u => (
            <div key={u.user_id} className="px-3 py-1.5 text-xs text-muted-foreground font-mono truncate">{u.email}</div>
          ))}
        </div>

        {action === 'plan_change' && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">New plan</label>
            <select
              value={selectedPlan}
              onChange={e => setSelectedPlan(e.target.value as 'free' | 'pro' | 'premium')}
              className="w-full text-xs bg-background border border-border rounded-md px-2 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="premium">Premium</option>
            </select>
          </div>
        )}

        {action === 'trial_grant' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Trial plan</label>
              <select
                value={trialPlan}
                onChange={e => setTrialPlan(e.target.value as 'pro' | 'premium')}
                className="w-full mt-1 text-xs bg-background border border-border rounded-md px-2 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Days</label>
              <select
                value={trialDays}
                onChange={e => setTrialDays(Number(e.target.value))}
                className="w-full mt-1 text-xs bg-background border border-border rounded-md px-2 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {[3, 7, 14, 30, 60, 90].map(d => <option key={d} value={d}>{d} days</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onCancel} className="flex-1" disabled={isRunning}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => onConfirm({ plan: selectedPlan, days: trialDays, trialPlan })}
            className="flex-1"
            disabled={isRunning}
          >
            {isRunning ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Running…</> : `Confirm`}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AdminUsersPanel({ onCountChange }: AdminUsersPanelProps) {
  const { user: adminUser } = useKindeAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkActionResult[]>([]);
  const [bulkResultsOpen, setBulkResultsOpen] = useState(false);
  const [bulkResultsLabel, setBulkResultsLabel] = useState<string>('');

  const isMounted = useIsMounted();

  const PER_PAGE = 50;

  const fetchUsers = useCallback(async (pageNum = 1, append = false) => {
    setLoading(true);
    if (!append) setError(null);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-list-users', {
        headers: devKitAuthHeaders(),
        body: { page: pageNum,
          per_page: PER_PAGE,
          filter_plan: planFilter || undefined,
          filter_identity_conflict: filterTab === 'id_conflicts' ? true : undefined,
          sort,
          search: query.trim() || undefined,
        },
      });
      const result = unwrapAdminResponse<{ users?: AdminUser[]; total?: number }>(tuple, 'admin-list-users');
      if (!isMounted()) return;
      const list = result.users ?? [];
      const tot = result.total ?? list.length;
      if (append) {
        setUsers((prev) => [...prev, ...list]);
      } else {
        setUsers(list);
        setSelectedUser((prev) => {
          if (!prev) return null;
          return list.find((u) => u.user_id === prev.user_id) ?? null;
        });
        setSelectedIds(new Set());
      }
      setTotal(tot);
      onCountChange?.(tot);
      setLoaded(true);
    } catch (e) {
      if (!isMounted()) return;
      setError(formatEdgeError(e, 'Failed to load users'));
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [planFilter, sort, query, filterTab, onCountChange, isMounted]);

  useEffect(() => {
    setPage(1);
    fetchUsers(1, false);
  }, [fetchUsers]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchUsers(nextPage, true);
  };

  const handleRefresh = () => {
    setPage(1);
    fetchUsers(1, false);
  };

  const handleUserUpdated = () => {
    setPage(1);
    fetchUsers(1, false);
  };

  const handleUserDeleted = (userId: string) => {
    setUsers(prev => prev.filter(u => u.user_id !== userId));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
    setTotal(prev => Math.max(0, prev - 1));
    onCountChange?.(Math.max(0, total - 1));
  };

  // Bulk selection helpers
  const allPageSelected = users.length > 0 && users.every(u => selectedIds.has(u.user_id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map(u => u.user_id)));
    }
  };

  const toggleSelectUser = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const selectedUsers = users.filter(u => selectedIds.has(u.user_id));

  const ACTION_LABELS_BULK: Record<BulkAction, string> = {
    plan_change: 'Change Plan',
    suspend: 'Suspend',
    unsuspend: 'Unsuspend',
    trial_grant: 'Grant Trial',
  };

  const handleBulkConfirm = async (params: { plan?: string; days?: number; trialPlan?: string }) => {
    if (!bulkAction) return;
    setBulkRunning(true);
    const actionLabel = ACTION_LABELS_BULK[bulkAction];
    const results: BulkActionResult[] = [];

    for (const user of selectedUsers) {
      try {
        let tuple;
        if (bulkAction === 'plan_change') {
          tuple = await edgeFunctions.functions.invoke('admin-set-plan', {
            headers: devKitAuthHeaders(),
            body: { target_user_id: user.user_id, plan: params.plan },
          });
        } else if (bulkAction === 'suspend') {
          tuple = await edgeFunctions.functions.invoke('admin-suspend-user', {
            headers: devKitAuthHeaders(),
            body: { target_user_id: user.user_id, suspend: true },
          });
        } else if (bulkAction === 'unsuspend') {
          tuple = await edgeFunctions.functions.invoke('admin-suspend-user', {
            headers: devKitAuthHeaders(),
            body: { target_user_id: user.user_id, suspend: false },
          });
        } else {
          tuple = await edgeFunctions.functions.invoke('admin-grant-trial', {
            headers: devKitAuthHeaders(),
            body: { target_user_id: user.user_id, plan: params.trialPlan, days: params.days },
          });
        }
        unwrapAdminResponse(tuple, bulkAction === 'plan_change' ? 'admin-set-plan'
          : bulkAction === 'trial_grant' ? 'admin-grant-trial'
          : 'admin-suspend-user');
        results.push({ user_id: user.user_id, email: user.email, status: 'success' });
      } catch (e) {
        results.push({
          user_id: user.user_id,
          email: user.email,
          status: 'error',
          error: formatEdgeError(e, 'Request failed'),
        });
      }
    }

    if (!isMounted()) return;

    const successCount = results.filter(r => r.status === 'success').length;
    const failCount = results.length - successCount;

    setBulkRunning(false);
    setBulkAction(null);
    setSelectedIds(new Set());
    setBulkResults(results);
    setBulkResultsLabel(actionLabel);
    setBulkResultsOpen(true);

    if (failCount === 0) {
      toast.success(`${actionLabel}: ${successCount} of ${results.length} succeeded`);
    } else {
      toast.warning(`${actionLabel}: ${successCount} succeeded, ${failCount} failed — see results dialog`);
    }
    handleUserUpdated();
  };

  const [exportingCSV, setExportingCSV] = useState(false);

  const handleExportCSV = async () => {
    setExportingCSV(true);
    try {
      const allUsers: AdminUser[] = [];
      let p = 1;
      const PER_EXPORT = 500;
      while (true) {
        const tuple = await edgeFunctions.functions.invoke('admin-list-users', {
          headers: devKitAuthHeaders(),
          body: { page: p,
            per_page: PER_EXPORT,
            filter_plan: planFilter || undefined,
            filter_identity_conflict: filterTab === 'id_conflicts' ? true : undefined,
            sort,
            search: query.trim() || undefined,
          },
        });
        let result: { users?: AdminUser[]; total?: number };
        try {
          result = unwrapAdminResponse<{ users?: AdminUser[]; total?: number }>(tuple, 'admin-list-users');
        } catch (e) {
          toast.error(formatEdgeError(e, 'CSV export failed'));
          break;
        }
        const list = result.users ?? [];
        allUsers.push(...list);
        if (allUsers.length >= (result.total ?? 0) || list.length < PER_EXPORT) break;
        p++;
      }
      if (!allUsers.length) return;
      const headers = ['User ID', 'Email', 'Contact Email', 'Name', 'Plan', 'Trial Plan', 'Trial Expires', 'Suspended', 'Suspension Reason', 'ID Conflict', 'Joined', 'Last Active', 'Resumes', 'Credits Used Today', 'Daily Limit'];
      const rows = allUsers.map((u) => [
        u.user_id,
        u.email,
        u.contact_email || '',
        u.full_name || '',
        u.plan_name,
        u.trial_plan || '',
        u.trial_expires_at ? new Date(u.trial_expires_at).toISOString() : '',
        u.is_suspended ? 'Yes' : 'No',
        u.suspension_reason || '',
        u.has_id_conflict ? 'Yes' : 'No',
        u.created_at ? new Date(u.created_at).toISOString() : '',
        u.last_sign_in_at ? new Date(u.last_sign_in_at).toISOString() : '',
        u.resume_count,
        u.credits_used_today,
        u.daily_limit ?? '',
      ]);
      const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wiseresume-users-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      const adminEmail = adminUser?.email ?? 'unknown';
      const adminId = adminUser?.id ?? 'dev-kit-admin';
      try {
        const auditTuple = await edgeFunctions.functions.invoke('admin-audit-logs', {
          headers: devKitAuthHeaders(),
          body: { mode: 'write',
            entry: {
              user_id: adminId,
              category: 'admin',
              action: 'user_data_export',
              metadata: {
                record_count: allUsers.length,
                exported_at: new Date().toISOString(),
                admin_email: adminEmail,
                filter_plan: planFilter || null,
                search_query: query.trim() || null,
              },
            },
          },
        });
        unwrapAdminResponse(auditTuple, 'admin-audit-logs');
      } catch (e) {
        // Audit-log failure should not block the export — surface as a warning toast only.
        toast.warning('CSV exported, but audit log entry failed', {
          description: formatEdgeError(e, 'Audit-log write failed'),
        });
      }
    } finally {
      if (isMounted()) setExportingCSV(false);
    }
  };

  const hasMore = users.length < total;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 pr-4"
            placeholder="Search email, name or user ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1.5 shrink-0">
          <Filter className="w-3.5 h-3.5" />
          Filters
          {(planFilter || sort !== 'newest') && <span className="ml-1 w-2 h-2 rounded-full bg-primary" />}
        </Button>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="flex items-center gap-2 shrink-0">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!loaded || !users.length || exportingCSV} className="flex items-center gap-2 shrink-0">
          {exportingCSV ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {exportingCSV ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-muted/40 rounded-lg border border-border w-fit">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterTab === 'all' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          All users
        </button>
        <button
          onClick={() => setFilterTab('id_conflicts')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${filterTab === 'id_conflicts' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          ID conflicts
        </button>
      </div>

      {/* Filters row */}
      {showFilters && (
        <div className="flex items-center gap-3 flex-wrap p-3 rounded-lg bg-muted/40 border border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Plan:</span>
            <div className="relative">
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="text-xs bg-background border border-border rounded-md px-2 py-1.5 pr-6 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {PLAN_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-muted-foreground" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Sort:</span>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="text-xs bg-background border border-border rounded-md px-2 py-1.5 pr-6 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-muted-foreground" />
            </div>
          </div>
        </div>
      )}

      {/* Identity conflicts notice */}
      {filterTab === 'id_conflicts' && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Showing identity conflict users</p>
            <p className="opacity-80 mt-0.5">These are Kinde shadow accounts (placeholder email) and their orphaned real-email counterparts. Use "Fix identity" in the user drawer to merge them.</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
          <p className="text-xs mt-1 opacity-70">Check that the admin edge functions are deployed and DEV_KIT_PASSWORD is set in Supabase.</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !loaded && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
      )}

      {/* Table */}
      {loaded && (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>
              {users.length} of {total} {total === 1 ? 'user' : 'users'}
              {planFilter && ` · filtered by ${PLAN_FILTERS.find(f => f.value === planFilter)?.label ?? planFilter}`}
            </span>
          </div>

          {/* Plan distribution bar */}
          {users.length > 0 && filterTab !== 'id_conflicts' && (() => {
            const now = new Date();
            let free = 0, pro = 0, premium = 0, trial = 0, suspended = 0;
            for (const u of users) {
              if (u.is_suspended) { suspended++; continue; }
              const trialActive = u.trial_plan && u.trial_expires_at && new Date(u.trial_expires_at) > now;
              if (trialActive) { trial++; continue; }
              if (u.plan_name === 'premium') premium++;
              else if (u.plan_name === 'pro') pro++;
              else free++;
            }
            const n = users.length;
            const pct = (v: number) => `${((v / n) * 100).toFixed(0)}%`;
            const segs = [
              { count: free, color: 'bg-muted-foreground/50', label: 'Free', pct: pct(free) },
              { count: pro, color: 'bg-blue-500', label: 'Pro', pct: pct(pro) },
              { count: premium, color: 'bg-amber-500', label: 'Premium', pct: pct(premium) },
              { count: trial, color: 'bg-purple-500', label: 'Trial', pct: pct(trial) },
              { count: suspended, color: 'bg-red-500', label: 'Suspended', pct: pct(suspended) },
            ].filter(s => s.count > 0);

            return (
              <div className="space-y-1.5">
                <div className="flex rounded-full overflow-hidden h-2 gap-px">
                  {segs.map(s => (
                    <div
                      key={s.label}
                      className={`${s.color}`}
                      style={{ width: `${(s.count / n) * 100}%` }}
                      title={`${s.label}: ${s.count} (${s.pct})`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {segs.map(s => (
                    <span key={s.label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className={`w-1.5 h-1.5 rounded-full ${s.color}`} />
                      {s.label} {s.count}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="px-3 py-3 w-8">
                      <button
                        onClick={toggleSelectAll}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title={allPageSelected ? 'Deselect all' : 'Select all on page'}
                      >
                        {allPageSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">ID</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Joined</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Resumes</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">AI credits</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Last active</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-muted-foreground">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => {
                      const isSelected = selectedIds.has(user.user_id);
                      return (
                        <tr
                          key={user.user_id}
                          className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer ${isSelected ? 'bg-primary/5' : user.has_id_conflict ? 'bg-amber-500/5' : ''}`}
                          onClick={() => setSelectedUser(user)}
                        >
                          <td className="px-3 py-3 w-8" onClick={(e) => toggleSelectUser(user.user_id, e)}>
                            {isSelected
                              ? <CheckSquare className="w-4 h-4 text-primary" />
                              : <Square className="w-4 h-4 text-muted-foreground" />
                            }
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-2.5 min-w-0">
                              {/* Initials avatar */}
                              {(() => {
                                const fallback = user.contact_email || user.email || '';
                                const initials = user.full_name
                                  ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                                  : (fallback[0]?.toUpperCase() ?? '?');
                                return (
                                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0 mt-0.5">
                                    {initials}
                                  </div>
                                );
                              })()}
                              <div className="min-w-0 space-y-0.5">
                              {(() => {
                                const isKindeShadow = (user.email ?? '').endsWith('@collision.kinde.placeholder');
                                const displayEmail = user.contact_email || user.email;
                                return (
                                  <>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <p className="font-mono text-xs truncate max-w-[160px]">{displayEmail}</p>
                                      {user.has_id_conflict && !user.contact_email && (
                                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400 shrink-0">
                                          ID conflict
                                        </Badge>
                                      )}
                                      {user.matched_via === 'contact_email' && !user.has_id_conflict && (
                                        <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20 shrink-0">
                                          Kinde identity
                                        </Badge>
                                      )}
                                    </div>
                                    {user.full_name && (
                                      <p className="text-xs text-muted-foreground truncate max-w-[160px]">{user.full_name}</p>
                                    )}
                                    {isKindeShadow && user.contact_email && (
                                      <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[160px]">
                                        Auth: {user.email}
                                      </p>
                                    )}
                                    {isKindeShadow && !user.contact_email && (
                                      <p className="text-[10px] text-amber-600 dark:text-amber-400">
                                        Unidentified · Kinde shadow
                                      </p>
                                    )}
                                    <AccountTypeBadge accountType={user.account_type} />
                                  </>
                                );
                              })()}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <CopyableId id={user.user_id} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              {user.is_suspended ? (
                                <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20">Suspended</Badge>
                              ) : user.trial_plan && user.trial_expires_at && new Date(user.trial_expires_at) > new Date() ? (
                                <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/20">Trial {user.trial_plan}</Badge>
                              ) : (
                                <Badge variant="outline" className={`capitalize text-[10px] ${PLAN_COLORS[user.plan_name] ?? ''}`}>
                                  {user.plan_name}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                            {formatDate(user.created_at)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                            {user.resume_count}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                            <span title={`${user.credits_used_today} used today / limit: ${user.daily_limit === -1 ? 'unlimited' : (user.daily_limit ?? '?')}`}>
                              {user.credits_used_today} / {user.daily_limit === -1 ? '∞' : (user.daily_limit ?? '?')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs hidden xl:table-cell">
                            {formatDate(user.last_sign_in_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={(e) => { e.stopPropagation(); setSelectedUser(user); }}
                            >
                              Manage
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {hasMore && (
            <div className="text-center">
              <Button variant="outline" onClick={handleLoadMore} disabled={loading} size="sm">
                {loading ? <><RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />Loading…</> : `Load more (${total - users.length} remaining)`}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Bulk action bar */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-card border border-border shadow-2xl shadow-black/20">
          <span className="text-xs font-medium text-muted-foreground mr-1">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={() => setBulkAction('plan_change')}
          >
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            Change Plan
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={() => setBulkAction('suspend')}
          >
            <ShieldOff className="w-3.5 h-3.5 text-red-500" />
            Suspend
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={() => setBulkAction('unsuspend')}
          >
            <Shield className="w-3.5 h-3.5 text-green-500" />
            Unsuspend
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={() => setBulkAction('trial_grant')}
          >
            <Zap className="w-3.5 h-3.5 text-purple-500" />
            Grant Trial
          </Button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-1 p-1 text-muted-foreground hover:text-foreground transition-colors rounded"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bulk action confirm dialog */}
      {bulkAction && (
        <BulkConfirmDialog
          action={bulkAction}
          users={selectedUsers}
          onConfirm={handleBulkConfirm}
          onCancel={() => setBulkAction(null)}
          isRunning={bulkRunning}
        />
      )}

      {/* Bulk action result table dialog */}
      <Dialog open={bulkResultsOpen} onOpenChange={(open) => { if (!open) setBulkResultsOpen(false); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {bulkResultsLabel} — Per-user results
            </DialogTitle>
            <DialogDescription>
              {bulkResults.filter(r => r.status === 'success').length} succeeded ·{' '}
              {bulkResults.filter(r => r.status === 'error').length} failed ·{' '}
              {bulkResults.length} total
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[420px] overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b border-border sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-16">Status</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Reason</th>
                </tr>
              </thead>
              <tbody>
                {bulkResults.map(r => (
                  <tr key={r.user_id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      {r.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                          <XCircle className="w-3.5 h-3.5" />
                          Fail
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] truncate max-w-[200px]" title={r.email}>{r.email}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.status === 'success' ? '—' : (r.error ?? 'Unknown error')}
                    </td>
                  </tr>
                ))}
                {bulkResults.length === 0 && (
                  <tr><td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">No results.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkResultsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Drawer */}
      {selectedUser && (
        <UserDetailDrawer
          user={selectedUser}
          open={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          onUserUpdated={handleUserUpdated}
          onUserDeleted={handleUserDeleted}
        />
      )}
    </div>
  );
}
