import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Search, Users, Download, Filter, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { UserDetailDrawer } from './UserDetailDrawer';

export interface AdminUser {
  user_id: string;
  email: string;
  full_name: string | null;
  plan_name: 'free' | 'pro' | 'premium';
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
}

interface AdminUsersPanelProps {
  password: string;
  onCountChange?: (count: number) => void;
}

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

export function AdminUsersPanel({ password, onCountChange }: AdminUsersPanelProps) {
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

  const PER_PAGE = 50;

  const fetchUsers = useCallback(async (pageNum = 1, append = false) => {
    setLoading(true);
    if (!append) setError(null);
    try {
      const { data, error: err } = await edgeFunctions.functions.invoke('admin-list-users', {
        body: {
          password,
          page: pageNum,
          per_page: PER_PAGE,
          filter_plan: planFilter || undefined,
          sort,
          search: query.trim() || undefined,
        },
      });
      if (err) throw new Error(err.message);
      const result = data as { success?: boolean; users?: AdminUser[]; total?: number; error?: string };
      if (result?.success === false) throw new Error(result.error ?? 'Unknown error');
      const list = result?.users ?? [];
      const tot = result?.total ?? list.length;
      if (append) {
        setUsers((prev) => [...prev, ...list]);
      } else {
        setUsers(list);
      }
      setTotal(tot);
      onCountChange?.(tot);
      setLoaded(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load users';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [password, planFilter, sort, query, onCountChange]);

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

  const [exportingCSV, setExportingCSV] = useState(false);

  const handleExportCSV = async () => {
    setExportingCSV(true);
    try {
      // Fetch all matching users (up to 5000) for the current filter/search
      const allUsers: AdminUser[] = [];
      let p = 1;
      const PER_EXPORT = 500;
      while (true) {
        const { data, error: err } = await edgeFunctions.functions.invoke('admin-list-users', {
          body: {
            password,
            page: p,
            per_page: PER_EXPORT,
            filter_plan: planFilter || undefined,
            sort,
            search: query.trim() || undefined,
          },
        });
        if (err) break;
        const result = data as { success?: boolean; users?: AdminUser[]; total?: number };
        const list = result?.users ?? [];
        allUsers.push(...list);
        if (allUsers.length >= (result?.total ?? 0) || list.length < PER_EXPORT) break;
        p++;
      }
      if (!allUsers.length) return;
      const headers = ['User ID', 'Email', 'Name', 'Plan', 'Trial Plan', 'Trial Expires', 'Suspended', 'Suspension Reason', 'Joined', 'Last Active', 'Resumes', 'Credits Used Today', 'Daily Limit'];
      const rows = allUsers.map((u) => [
        u.user_id,
        u.email,
        u.full_name || '',
        u.plan_name,
        u.trial_plan || '',
        u.trial_expires_at ? new Date(u.trial_expires_at).toISOString() : '',
        u.is_suspended ? 'Yes' : 'No',
        u.suspension_reason || '',
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
    } finally {
      setExportingCSV(false);
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

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
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
                      <td colSpan={7} className="text-center py-10 text-muted-foreground">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr
                        key={user.user_id}
                        className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => setSelectedUser(user)}
                      >
                        <td className="px-4 py-3">
                          <div className="min-w-0">
                            <p className="font-mono text-xs truncate max-w-[160px]">{user.email}</p>
                            {user.full_name && (
                              <p className="text-xs text-muted-foreground truncate max-w-[160px]">{user.full_name}</p>
                            )}
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
                    ))
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

      {/* User Detail Drawer */}
      {selectedUser && (
        <UserDetailDrawer
          user={selectedUser}
          password={password}
          open={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          onUserUpdated={handleUserUpdated}
        />
      )}
    </div>
  );
}
