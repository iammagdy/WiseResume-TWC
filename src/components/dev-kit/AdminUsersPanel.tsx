import { useState, useCallback } from 'react';
import { RefreshCw, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { SetPlanModal } from './SetPlanModal';

export interface AdminUser {
  user_id: string;
  email: string;
  full_name: string | null;
  plan_name: 'free' | 'pro' | 'premium';
  plan_status: string;
  created_at: string;
  resume_count: number;
  last_sign_in_at: string | null;
  plan_updated_at: string | null;
}

interface AdminUsersPanelProps {
  password: string;
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-muted text-muted-foreground border-border',
  pro: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
  premium: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function AdminUsersPanel({ password }: AdminUsersPanelProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await edgeFunctions.functions.invoke('admin-list-users', {
        body: { password, page: 1, per_page: 100 },
      });
      if (err) throw new Error(err.message);
      const result = data as { success?: boolean; users?: AdminUser[]; error?: string } | AdminUser[];
      if (Array.isArray(result)) {
        setUsers(result);
      } else if (result?.success === false) {
        throw new Error(result.error ?? 'Unknown error');
      } else {
        setUsers(result?.users ?? []);
      }
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [password]);

  const handlePlanChanged = useCallback((userId: string, newPlan: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.user_id === userId ? { ...u, plan_name: newPlan as AdminUser['plan_name'] } : u))
    );
  }, []);

  const filtered = users.filter((u) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      (u.full_name ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Filter by email or name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loaded ? 'Refresh' : 'Load Users'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
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

      {/* Empty prompt */}
      {!loaded && !loading && !error && (
        <div className="py-16 text-center text-muted-foreground space-y-2">
          <Users className="w-10 h-10 mx-auto opacity-30" />
          <p className="text-sm">Click "Load Users" to fetch the list</p>
        </div>
      )}

      {/* Table */}
      {loaded && (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>
              {filtered.length} {filtered.length === 1 ? 'user' : 'users'}
              {query && ` matching "${query}"`}
              {!query && users.length > 0 && ` total (showing up to 100)`}
            </span>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Joined</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Resumes</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Last Active</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-muted-foreground">
                        No users match your filter
                      </td>
                    </tr>
                  ) : (
                    filtered.map((user) => (
                      <tr
                        key={user.user_id}
                        className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs max-w-[180px] truncate">
                          {user.email}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell max-w-[140px] truncate">
                          {user.full_name || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`capitalize text-xs ${PLAN_COLORS[user.plan_name] ?? ''}`}
                          >
                            {user.plan_name}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                          {user.resume_count}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                          {formatDate(user.last_sign_in_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => setSelectedUser(user)}
                          >
                            Set Plan
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Set Plan Modal */}
      {selectedUser && (
        <SetPlanModal
          user={selectedUser}
          password={password}
          open={!!selectedUser}
          onOpenChange={(open) => { if (!open) setSelectedUser(null); }}
          onSuccess={(newPlan) => {
            handlePlanChanged(selectedUser.user_id, newPlan);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}
