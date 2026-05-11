import { useState, useEffect, useCallback, useRef } from 'react';
import {
  User, Shield, Crown, Trash2, Search, Loader2, FileText,
  ExternalLink, RefreshCw, ChevronDown, Ban, SlidersHorizontal,
  CheckSquare, Square, Gift, TrendingUp, MessageSquare,
  Merge, Check, X, Activity, LayoutList,
} from 'lucide-react';
import { ActAsDialog, type ActAsSession } from './ActAsDialog';
import { UserDetailDrawer } from './UserDetailDrawer';
import { DevKitErrorCard } from './DevKitErrorCard';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export interface AdminUser {
  $id: string;
  $createdAt: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  contact_email: string | null;
  plan_name: 'free' | 'pro' | 'premium';
  plan_updated_at: string | null;
  is_suspended: boolean;
  suspension_reason: string | null;
  daily_limit: number | null;
  credits_used_today: number;
  trial_plan: string | null;
  trial_expires_at: string | null;
  resumeCount: number;
}

interface GlobalStats {
  total: number;
  premium: number;
  pro: number;
  suspended: number;
  activeToday: number;
}

type FilterTab = 'all' | 'premium' | 'pro' | 'free' | 'suspended';
type SortKey = 'joined' | 'active';
type BulkPlan = 'free' | 'pro' | 'premium';

const PAGE_SIZE = 50;

const PLAN_COLORS: Record<string, string> = {
  premium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  pro: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  free: 'bg-white/5 text-white/40 border-white/10',
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  premium: <Crown size={13} className="text-amber-400" />,
  pro: <Shield size={13} className="text-blue-400" />,
  free: <User size={13} className="text-white/30" />,
};

function initials(name: string | null, email: string | null): string {
  if (name) return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (email ?? 'U').charAt(0).toUpperCase();
}

function creditsBar(used: number, limit: number | null): React.ReactNode {
  if (limit === null || limit === -1) {
    return <span className="text-xs text-white/40">∞ unlimited</span>;
  }
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const color = pct >= 80 ? 'bg-red-400' : pct >= 50 ? 'bg-yellow-400' : 'bg-emerald-400';
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 rounded-full bg-white/10">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-white/40 whitespace-nowrap">{used}/{limit}</span>
    </div>
  );
}

export const AdminUsersPanel = () => {
  const { user: authUser } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState<SortKey>('joined');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const [actAsSession, setActAsSession] = useState<ActAsSession | null>(null);
  const [drawerUser, setDrawerUser] = useState<AdminUser | null>(null);

  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);
  const [savingTrialId, setSavingTrialId] = useState<string | null>(null);
  const [savingSuspendId, setSavingSuspendId] = useState<string | null>(null);
  const [savingCreditsId, setSavingCreditsId] = useState<string | null>(null);
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mergingId, setMergingId] = useState<string | null>(null);
  const [bulkActing, setBulkActing] = useState(false);

  const [trialDays, setTrialDays] = useState<Record<string, number>>({});
  const [trialPlan, setTrialPlan] = useState<Record<string, 'pro' | 'premium'>>({});
  const [suspendReason, setSuspendReason] = useState<Record<string, string>>({});
  const [newLimit, setNewLimit] = useState<Record<string, string>>({});
  const [bonusCredits, setBonusCredits] = useState<Record<string, string>>({});
  const [noteText, setNoteText] = useState<Record<string, string>>({});
  const [mergeConfirming, setMergeConfirming] = useState<Record<string, boolean>>({});
  const [bulkPlan, setBulkPlan] = useState<BulkPlan>('pro');
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  const fetchGlobalStats = useCallback(async () => {
    try {
      const tuple = await appwriteFunctions.invoke<GlobalStats>(
        'admin-devkit-data',
        {
          headers: devKitAuthHeaders(),
          body: { action: 'global-stats' },
        },
      );
      const result = unwrapAdminResponse<{ data?: GlobalStats }>(tuple, 'admin-devkit-data');
      if (result.data) {
        setGlobalStats(result.data);
      }
    } catch {
      // silently ignore — stats bar will show page-local fallback
    }
  }, []);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const sortField = sortBy === 'joined' ? '$createdAt' : '$updatedAt';
      // Use the server-side admin-devkit-data action so the subscriptions +
      // ai_credits join runs with the server API key and is not blocked by
      // Appwrite's document-level permissions (which prevent cross-user reads
      // when called from the client SDK).
      const tuple = await appwriteFunctions.invoke<{ users?: AdminUser[]; total?: number }>(
        'admin-devkit-data',
        {
          headers: devKitAuthHeaders(),
          body: { action: 'list-users-page', page: p, pageSize: PAGE_SIZE, sortField },
        },
      );
      // The function returns { success: true, data: { users, total } }, so
      // unwrapAdminResponse returns the full body — access via result.data.*
      const result = unwrapAdminResponse<{ data?: { users?: AdminUser[]; total?: number } }>(tuple, 'admin-devkit-data');
      const fetchedUsers = result.data?.users ?? [];
      const newTotal = result.data?.total ?? 0;
      setTotalCount(newTotal);
      setGlobalStats(prev => ({ ...prev ?? { premium: 0, pro: 0, suspended: 0, activeToday: 0 }, total: newTotal }));
      setFetchError(null);
      setUsers(fetchedUsers);
    } catch (err) {
      const msg = formatEdgeError(err);
      console.error('[AdminUsersPanel] fetch failed:', err);
      setFetchError(msg);
      toast.error(msg);
      setUsers([]); // reset table so stale data does not linger
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => {
    fetchPage(page);
    fetchGlobalStats();
  }, [fetchPage, fetchGlobalStats, page]);

  const refresh = () => {
    setSelected(new Set());
    fetchPage(page);
    fetchGlobalStats();
  };

  const updateUser = (userId: string, patch: Partial<AdminUser>) => {
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, ...patch } : u));
    if (drawerUser?.user_id === userId) {
      setDrawerUser(prev => prev ? { ...prev, ...patch } : prev);
    }
  };

  const handleSetPlan = async (userId: string, plan: 'free' | 'pro' | 'premium') => {
    setSavingPlanId(userId);
    try {
      const tuple = await appwriteFunctions.invoke('admin-set-plan', {
        headers: devKitAuthHeaders(),
        body: { target_user_id: userId, plan, actor_email: authUser?.email ?? 'admin (dev-kit)' },
      });
      unwrapAdminResponse(tuple, 'admin-set-plan');
      updateUser(userId, { plan_name: plan, plan_updated_at: new Date().toISOString() });
      toast.success(`Plan set to ${plan.toUpperCase()}`);
      fetchGlobalStats();
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to update plan'));
    } finally {
      setSavingPlanId(null);
    }
  };

  const handleGrantTrial = async (userId: string) => {
    const days = trialDays[userId] ?? 7;
    const plan = trialPlan[userId] ?? 'pro';
    setSavingTrialId(userId);
    try {
      const tuple = await appwriteFunctions.invoke('admin-grant-trial', {
        headers: devKitAuthHeaders(),
        body: { target_user_id: userId, plan, days },
      });
      unwrapAdminResponse(tuple, 'admin-grant-trial');
      const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
      updateUser(userId, { trial_plan: plan, trial_expires_at: expiresAt });
      toast.success(`${plan} trial granted for ${days} days`);
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to grant trial'));
    } finally {
      setSavingTrialId(null);
    }
  };

  const handleRevokeTrial = async (userId: string) => {
    setSavingTrialId(userId);
    try {
      const tuple = await appwriteFunctions.invoke('admin-revoke-trial', {
        headers: devKitAuthHeaders(),
        body: { target_user_id: userId },
      });
      unwrapAdminResponse(tuple, 'admin-revoke-trial');
      updateUser(userId, { trial_plan: null, trial_expires_at: null });
      toast.success('Trial revoked');
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to revoke trial'));
    } finally {
      setSavingTrialId(null);
    }
  };

  const handleToggleSuspend = async (userId: string, currentlySuspended: boolean) => {
    setSavingSuspendId(userId);
    try {
      const suspend = !currentlySuspended;
      const tuple = await appwriteFunctions.invoke('admin-suspend-user', {
        headers: devKitAuthHeaders(),
        body: {
          target_user_id: userId,
          suspend,
          reason: suspend ? (suspendReason[userId] || null) : null,
          actor_email: authUser?.email ?? 'admin (dev-kit)',
        },
      });
      unwrapAdminResponse(tuple, 'admin-suspend-user');
      updateUser(userId, {
        is_suspended: suspend,
        suspension_reason: suspend ? (suspendReason[userId] || null) : null,
      });
      toast.success(suspend ? 'User suspended' : 'User unsuspended');
      fetchGlobalStats();
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to update suspension'));
    } finally {
      setSavingSuspendId(null);
    }
  };

  const handleSetCredits = async (userId: string) => {
    const limit = newLimit[userId]?.trim();
    const bonus = bonusCredits[userId]?.trim();
    if (!limit && !bonus) { toast.info('Enter a limit or bonus amount'); return; }
    setSavingCreditsId(userId);
    try {
      const body: Record<string, unknown> = { target_user_id: userId, actor_email: authUser?.email ?? 'admin (dev-kit)' };
      if (limit) body.daily_limit = parseInt(limit, 10);
      if (bonus) body.bonus_credits = parseInt(bonus, 10);
      const tuple = await appwriteFunctions.invoke('admin-set-credits', {
        headers: devKitAuthHeaders(),
        body,
      });
      unwrapAdminResponse(tuple, 'admin-set-credits');
      const patch: Partial<AdminUser> = {};
      if (limit) patch.daily_limit = parseInt(limit, 10);
      if (bonus) {
        const u = users.find(x => x.user_id === userId);
        if (u) patch.credits_used_today = Math.max(0, u.credits_used_today - parseInt(bonus, 10));
      }
      updateUser(userId, patch);
      setNewLimit(prev => ({ ...prev, [userId]: '' }));
      setBonusCredits(prev => ({ ...prev, [userId]: '' }));
      toast.success('Credits updated');
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to update credits'));
    } finally {
      setSavingCreditsId(null);
    }
  };

  const handleSaveNote = async (userId: string) => {
    const text = noteText[userId]?.trim();
    if (!text) { toast.info('Enter a note'); return; }
    setSavingNoteId(userId);
    try {
      const tuple = await appwriteFunctions.invoke('admin-save-note', {
        headers: devKitAuthHeaders(),
        body: { target_user_id: userId, action: 'add', note_text: text, actor_email: authUser?.email ?? 'admin (dev-kit)' },
      });
      unwrapAdminResponse(tuple, 'admin-save-note');
      setNoteText(prev => ({ ...prev, [userId]: '' }));
      toast.success('Note saved');
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to save note'));
    } finally {
      setSavingNoteId(null);
    }
  };

  const handleImpersonate = async (userId: string) => {
    setImpersonatingId(userId);
    try {
      const tuple = await appwriteFunctions.invoke('admin-impersonate', {
        headers: devKitAuthHeaders(),
        body: { action: 'claim', target_user_id: userId },
      });
      const session = unwrapAdminResponse<ActAsSession>(tuple, 'admin-impersonate');
      setActAsSession(session);
    } catch (e) {
      toast.error('Impersonation failed', { description: formatEdgeError(e, 'Failed to generate session link') });
    } finally {
      setImpersonatingId(null);
    }
  };

  const handleMergeIdentity = async (userId: string) => {
    setMergingId(userId);
    try {
      const tuple = await appwriteFunctions.invoke('admin-merge-identity', {
        headers: devKitAuthHeaders(),
        body: { collision_user_id: userId },
      });
      unwrapAdminResponse<{ merge_log?: string[] }>(tuple, 'admin-merge-identity');
      toast.success('Identity merged', {
        description: 'The orphan account has been suspended and merged into this account.',
        duration: 6000,
      });
      setMergeConfirming(prev => ({ ...prev, [userId]: false }));
      refresh();
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to merge identity'));
    } finally {
      setMergingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, profileId: string) => {
    if (!window.confirm('Permanently delete this user? This cannot be undone.')) return;
    setDeletingId(userId);
    try {
      const tuple = await appwriteFunctions.invoke('admin-delete-user', {
        headers: devKitAuthHeaders(),
        body: { target_user_id: userId, actor_email: authUser?.email ?? 'admin (dev-kit)' },
      });
      unwrapAdminResponse(tuple, 'admin-delete-user');
      setUsers(prev => prev.filter(u => u.$id !== profileId));
      setTotalCount(c => c - 1);
      toast.success('User deleted');
      fetchGlobalStats();
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to delete user'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkSetPlan = async () => {
    if (selected.size === 0) return;
    setBulkActing(true);
    setShowBulkMenu(false);
    let ok = 0;
    for (const uid of selected) {
      try {
        const tuple = await appwriteFunctions.invoke('admin-set-plan', {
          headers: devKitAuthHeaders(),
          body: { target_user_id: uid, plan: bulkPlan, actor_email: authUser?.email ?? 'admin (dev-kit)' },
        });
        unwrapAdminResponse(tuple, 'admin-set-plan');
        updateUser(uid, { plan_name: bulkPlan });
        ok++;
      } catch { /* continue */ }
    }
    toast.success(`Plan set to ${bulkPlan.toUpperCase()} for ${ok} user${ok !== 1 ? 's' : ''}`);
    setSelected(new Set());
    setBulkActing(false);
    fetchGlobalStats();
  };

  const handleBulkSuspend = async () => {
    if (selected.size === 0) return;
    setBulkActing(true);
    let ok = 0;
    for (const uid of selected) {
      const u = users.find(x => x.user_id === uid);
      if (!u || u.is_suspended) continue;
      try {
        const tuple = await appwriteFunctions.invoke('admin-suspend-user', {
          headers: devKitAuthHeaders(),
          body: { target_user_id: uid, suspend: true, actor_email: authUser?.email ?? 'admin (dev-kit)' },
        });
        unwrapAdminResponse(tuple, 'admin-suspend-user');
        updateUser(uid, { is_suspended: true });
        ok++;
      } catch { /* continue */ }
    }
    toast.success(`Suspended ${ok} user${ok !== 1 ? 's' : ''}`);
    setSelected(new Set());
    setBulkActing(false);
    fetchGlobalStats();
  };

  const filtered = users.filter(u => {
    const matchSearch = searchTerm === '' ||
      (u.email ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.full_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.user_id.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'all') return true;
    if (filter === 'suspended') return u.is_suspended;
    return u.plan_name === filter;
  });

  const displayStats = {
    total: globalStats?.total ?? totalCount,
    premium: globalStats?.premium ?? users.filter(u => u.plan_name === 'premium').length,
    pro: globalStats?.pro ?? users.filter(u => u.plan_name === 'pro').length,
    suspended: globalStats?.suspended ?? users.filter(u => u.is_suspended).length,
    activeToday: globalStats?.activeToday ?? 0,
  };

  const allSelected = filtered.length > 0 && filtered.every(u => selected.has(u.user_id));
  const toggleAll = () => {
    if (allSelected) {
      setSelected(prev => { const n = new Set(prev); filtered.forEach(u => n.delete(u.user_id)); return n; });
    } else {
      setSelected(prev => { const n = new Set(prev); filtered.forEach(u => n.add(u.user_id)); return n; });
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm text-muted-foreground font-mono">Loading Real-Time User Data…</p>
      </div>
    );
  }

  if (fetchError && users.length === 0) {
    return (
      <DevKitErrorCard
        error={fetchError}
        title="Failed to load users"
        onRetry={() => { setFetchError(null); fetchPage(page); }}
        context={{ panel: 'AdminUsersPanel', action: 'list-users-page' }}
      />
    );
  }

  return (
    <div className="space-y-5 min-h-0">
      <ActAsDialog session={actAsSession} onClose={() => setActAsSession(null)} />
      {drawerUser && (
        <UserDetailDrawer
          open={!!drawerUser}
          user={drawerUser}
          onClose={() => setDrawerUser(null)}
          onUserUpdated={() => { refresh(); setDrawerUser(null); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight text-white">God Mode</h2>
          <p className="text-xs text-white/40 mt-0.5">Full platform control · {displayStats.total.toLocaleString()} users total</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <span className="text-white/60">{selected.size} selected</span>
              <span className="text-white/20">|</span>
              <div className="relative">
                <button
                  onClick={() => setShowBulkMenu(v => !v)}
                  disabled={bulkActing}
                  className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                >
                  Set Plan <ChevronDown size={10} />
                </button>
                {showBulkMenu && (
                  <div className="absolute top-6 left-0 z-50 bg-[#111] border border-white/10 rounded-xl p-1.5 shadow-2xl min-w-[120px]">
                    {(['free', 'pro', 'premium'] as BulkPlan[]).map(p => (
                      <button
                        key={p}
                        onClick={() => { setBulkPlan(p); handleBulkSetPlan(); }}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs capitalize font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-all"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-white/20">|</span>
              <button onClick={handleBulkSuspend} disabled={bulkActing} className="text-red-400 hover:text-red-300 font-semibold">
                Suspend
              </button>
              <span className="text-white/20">|</span>
              <button onClick={() => setSelected(new Set())} className="text-white/40 hover:text-white/70">
                <X size={10} />
              </button>
              {bulkActing && <Loader2 size={12} className="animate-spin text-white/40" />}
            </div>
          )}
          <Button onClick={refresh} variant="outline" size="icon" className="rounded-xl border-white/10 bg-white/5 h-8 w-8">
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Stats pills — global totals from Appwrite, not page-local */}
      <div className="flex gap-2 flex-wrap">
        {([
          { label: 'Total', value: displayStats.total, icon: <User size={12} />, cls: 'text-white' },
          { label: 'Premium', value: displayStats.premium, icon: <Crown size={12} />, cls: 'text-amber-400' },
          { label: 'Pro', value: displayStats.pro, icon: <Shield size={12} />, cls: 'text-blue-400' },
          { label: 'Suspended', value: displayStats.suspended, icon: <Ban size={12} />, cls: 'text-red-400' },
          { label: 'Active Today', value: displayStats.activeToday, icon: <Activity size={12} />, cls: 'text-emerald-400' },
        ] as const).map(s => (
          <div key={s.label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10">
            <span className={s.cls}>{s.icon}</span>
            <span className="text-[11px] text-white/40">{s.label}</span>
            <span className={cn('text-sm font-bold', s.cls)}>{s.value.toLocaleString()}</span>
          </div>
        ))}
        {globalStats === null && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10">
            <Loader2 size={12} className="animate-spin text-white/30" />
            <span className="text-[11px] text-white/30">Loading global stats…</span>
          </div>
        )}
      </div>

      {/* Search + filter tabs */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input
            placeholder="Search by name, email, or ID…"
            className="pl-9 bg-white/5 border-white/10 rounded-xl h-9 text-sm text-white placeholder:text-white/30 focus-visible:border-white/20"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'premium', 'pro', 'free', 'suspended'] as FilterTab[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 text-[10px] font-black uppercase rounded-xl border transition-all',
                filter === f
                  ? 'bg-white text-black border-white'
                  : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20 hover:text-white/60',
              )}
            >
              {f}
            </button>
          ))}
          <button
            onClick={() => setSortBy(s => s === 'joined' ? 'active' : 'joined')}
            className="px-2.5 py-1.5 text-[10px] font-black uppercase rounded-xl border border-white/10 bg-white/5 text-white/40 hover:text-white/60 flex items-center gap-1"
            title={sortBy === 'active' ? 'Sorting by last profile update (proxy for activity)' : 'Sorting by join date'}
          >
            <SlidersHorizontal size={11} />
            {sortBy === 'joined' ? 'Joined' : 'Last Active'}
          </button>
        </div>
      </div>

      {/* Table header */}
      <div className="hidden md:flex items-center gap-3 px-4 py-1.5 text-[10px] text-white/25 uppercase tracking-widest font-bold">
        <button onClick={toggleAll} className="w-4 flex-shrink-0 flex items-center justify-center">
          {allSelected ? <CheckSquare size={13} className="text-white/50" /> : <Square size={13} />}
        </button>
        <div className="w-44">User</div>
        <div className="w-24">Plan</div>
        <div className="w-36">Credits</div>
        <div className="w-20">Status</div>
        <div className="flex-1">Quick actions</div>
      </div>

      {/* User rows */}
      <div className="space-y-1.5">
        {filtered.length === 0 && !loading && (
          <div className="py-16 text-center text-sm text-white/30">
            No users match the current filter
          </div>
        )}
        {filtered.map(u => (
          <UserRow
            key={u.$id}
            user={u}
            selected={selected.has(u.user_id)}
            expanded={expandedUser === u.user_id}
            impersonatingId={impersonatingId}
            savingPlanId={savingPlanId}
            savingTrialId={savingTrialId}
            savingSuspendId={savingSuspendId}
            savingCreditsId={savingCreditsId}
            savingNoteId={savingNoteId}
            deletingId={deletingId}
            mergingId={mergingId}
            mergeConfirming={!!mergeConfirming[u.user_id]}
            trialDays={trialDays[u.user_id] ?? 7}
            trialPlanValue={trialPlan[u.user_id] ?? 'pro'}
            suspendReasonValue={suspendReason[u.user_id] ?? ''}
            newLimitValue={newLimit[u.user_id] ?? ''}
            bonusCreditsValue={bonusCredits[u.user_id] ?? ''}
            noteTextValue={noteText[u.user_id] ?? ''}
            onToggleSelect={() => setSelected(prev => {
              const n = new Set(prev);
              if (n.has(u.user_id)) n.delete(u.user_id); else n.add(u.user_id);
              return n;
            })}
            onToggleExpand={() => setExpandedUser(expandedUser === u.user_id ? null : u.user_id)}
            onSetPlan={handleSetPlan}
            onGrantTrial={handleGrantTrial}
            onRevokeTrial={handleRevokeTrial}
            onToggleSuspend={handleToggleSuspend}
            onSetCredits={handleSetCredits}
            onSaveNote={handleSaveNote}
            onImpersonate={handleImpersonate}
            onDeleteUser={handleDeleteUser}
            onMergeIdentity={handleMergeIdentity}
            onSetMergeConfirming={v => setMergeConfirming(prev => ({ ...prev, [u.user_id]: v }))}
            onOpenDrawer={() => setDrawerUser(u)}
            onTrialDaysChange={v => setTrialDays(prev => ({ ...prev, [u.user_id]: v }))}
            onTrialPlanChange={v => setTrialPlan(prev => ({ ...prev, [u.user_id]: v }))}
            onSuspendReasonChange={v => setSuspendReason(prev => ({ ...prev, [u.user_id]: v }))}
            onNewLimitChange={v => setNewLimit(prev => ({ ...prev, [u.user_id]: v }))}
            onBonusCreditsChange={v => setBonusCredits(prev => ({ ...prev, [u.user_id]: v }))}
            onNoteTextChange={v => setNoteText(prev => ({ ...prev, [u.user_id]: v }))}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-white/30">
          <span>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount.toLocaleString()} users
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:text-white/60 disabled:opacity-30 transition-all"
            >
              ← Prev
            </button>
            <span className="px-2">Page {page + 1} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:text-white/60 disabled:opacity-30 transition-all"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface UserRowProps {
  user: AdminUser;
  selected: boolean;
  expanded: boolean;
  impersonatingId: string | null;
  savingPlanId: string | null;
  savingTrialId: string | null;
  savingSuspendId: string | null;
  savingCreditsId: string | null;
  savingNoteId: string | null;
  deletingId: string | null;
  mergingId: string | null;
  mergeConfirming: boolean;
  trialDays: number;
  trialPlanValue: 'pro' | 'premium';
  suspendReasonValue: string;
  newLimitValue: string;
  bonusCreditsValue: string;
  noteTextValue: string;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onSetPlan: (userId: string, plan: 'free' | 'pro' | 'premium') => void;
  onGrantTrial: (userId: string) => void;
  onRevokeTrial: (userId: string) => void;
  onToggleSuspend: (userId: string, isSuspended: boolean) => void;
  onSetCredits: (userId: string) => void;
  onSaveNote: (userId: string) => void;
  onImpersonate: (userId: string) => void;
  onDeleteUser: (userId: string, profileId: string) => void;
  onMergeIdentity: (userId: string) => void;
  onSetMergeConfirming: (v: boolean) => void;
  onOpenDrawer: () => void;
  onTrialDaysChange: (v: number) => void;
  onTrialPlanChange: (v: 'pro' | 'premium') => void;
  onSuspendReasonChange: (v: string) => void;
  onNewLimitChange: (v: string) => void;
  onBonusCreditsChange: (v: string) => void;
  onNoteTextChange: (v: string) => void;
}

function UserRow({
  user, selected, expanded,
  impersonatingId, savingPlanId, savingTrialId, savingSuspendId,
  savingCreditsId, savingNoteId, deletingId, mergingId, mergeConfirming,
  trialDays, trialPlanValue, suspendReasonValue, newLimitValue, bonusCreditsValue, noteTextValue,
  onToggleSelect, onToggleExpand,
  onSetPlan, onGrantTrial, onRevokeTrial, onToggleSuspend, onSetCredits, onSaveNote,
  onImpersonate, onDeleteUser, onMergeIdentity, onSetMergeConfirming, onOpenDrawer,
  onTrialDaysChange, onTrialPlanChange, onSuspendReasonChange,
  onNewLimitChange, onBonusCreditsChange, onNoteTextChange,
}: UserRowProps) {
  const isTrialActive = user.trial_plan && user.trial_expires_at && new Date(user.trial_expires_at) > new Date();
  const isCollision = (user.email ?? '').endsWith('@collision.kinde.placeholder');
  const planSaving = savingPlanId === user.user_id;
  const trialSaving = savingTrialId === user.user_id;
  const suspendSaving = savingSuspendId === user.user_id;
  const creditsSaving = savingCreditsId === user.user_id;
  const noteSaving = savingNoteId === user.user_id;
  const deleting = deletingId === user.user_id;
  const merging = mergingId === user.user_id;
  const impersonating = impersonatingId === user.user_id;

  return (
    <div className={cn('rounded-2xl border overflow-hidden transition-all', expanded ? 'border-blue-500/20' : 'border-white/8')}>
      {/* Main row */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 cursor-pointer transition-all',
          expanded ? 'bg-white/8' : 'bg-white/3 hover:bg-white/6',
        )}
        onClick={onToggleExpand}
      >
        <button
          onClick={e => { e.stopPropagation(); onToggleSelect(); }}
          className="w-4 flex-shrink-0 flex items-center justify-center"
        >
          {selected
            ? <CheckSquare size={13} className="text-blue-400" />
            : <Square size={13} className="text-white/20" />}
        </button>

        {/* Identity */}
        <div className="w-44 flex items-center gap-2.5 min-w-0">
          <div className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0',
            user.plan_name === 'premium' ? 'bg-amber-500/15 text-amber-400' :
            user.plan_name === 'pro' ? 'bg-blue-500/15 text-blue-400' : 'bg-white/8 text-white/40',
          )}>
            {initials(user.full_name, user.email)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {user.full_name || 'Anonymous'}
            </p>
            <p className="text-[11px] text-white/30 truncate leading-tight">{user.email}</p>
          </div>
        </div>

        {/* Plan */}
        <div className="w-24 hidden md:block">
          <span className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border',
            PLAN_COLORS[user.plan_name],
          )}>
            {PLAN_ICONS[user.plan_name]}
            {user.plan_name}
            {isTrialActive && <span className="text-violet-400 ml-0.5">trial</span>}
          </span>
        </div>

        {/* Credits */}
        <div className="w-36 hidden md:block">
          {creditsBar(user.credits_used_today, user.daily_limit)}
        </div>

        {/* Status */}
        <div className="w-20 hidden md:block">
          {user.is_suspended
            ? <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-500/15 text-red-400">suspended</span>
            : <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-400">active</span>}
        </div>

        {/* Quick row actions */}
        <div className="flex-1 flex items-center gap-1.5 justify-end" onClick={e => e.stopPropagation()}>
          <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10">
            {(['free', 'pro', 'premium'] as const).map(p => (
              <button
                key={p}
                disabled={planSaving}
                onClick={() => onSetPlan(user.user_id, p)}
                className={cn(
                  'px-2 py-1 text-[9px] uppercase font-black rounded-md transition-all',
                  user.plan_name === p ? 'bg-white text-black' : 'text-white/30 hover:text-white/60',
                )}
              >
                {planSaving && user.plan_name !== p ? p[0] : planSaving && user.plan_name === p ? <Loader2 size={9} className="animate-spin" /> : p[0]}
              </button>
            ))}
          </div>
          <button
            onClick={() => onImpersonate(user.user_id)}
            disabled={impersonating}
            className="p-1.5 rounded-lg bg-blue-500/15 border border-blue-500/20 text-blue-400 hover:bg-blue-500/25 transition-all"
            title="Act As"
          >
            {impersonating ? <Loader2 size={11} className="animate-spin" /> : <ExternalLink size={11} />}
          </button>
          <ChevronDown size={13} className={cn('text-white/30 transition-transform flex-shrink-0', expanded && 'rotate-180')} />
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-white/8 bg-black/20 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">

            {/* Plan & Billing */}
            <div className="bg-white/4 rounded-xl p-3 border border-white/8 space-y-2.5">
              <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Plan & Billing</p>
              <div className="flex gap-1">
                {(['free', 'pro', 'premium'] as const).map(p => (
                  <button
                    key={p}
                    disabled={planSaving}
                    onClick={() => onSetPlan(user.user_id, p)}
                    className={cn(
                      'flex-1 py-1.5 text-[10px] uppercase font-black rounded-lg border transition-all',
                      user.plan_name === p
                        ? p === 'premium' ? 'bg-amber-500 text-black border-amber-400'
                          : p === 'pro' ? 'bg-blue-500 text-white border-blue-400'
                          : 'bg-white text-black border-white'
                        : 'bg-white/5 text-white/40 border-white/10 hover:text-white/70',
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] text-white/30">Grant trial</p>
                <div className="flex gap-1">
                  {(['pro', 'premium'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => onTrialPlanChange(p)}
                      className={cn(
                        'flex-1 py-1 text-[9px] uppercase font-bold rounded-lg border transition-all',
                        trialPlanValue === p ? 'bg-violet-500/25 text-violet-300 border-violet-500/30' : 'bg-white/5 text-white/30 border-white/10',
                      )}
                    >
                      {p}
                    </button>
                  ))}
                  <input
                    type="number"
                    value={trialDays}
                    onChange={e => onTrialDaysChange(parseInt(e.target.value, 10) || 7)}
                    min={1} max={90}
                    className="w-12 px-1.5 py-1 text-[10px] bg-white/5 border border-white/10 rounded-lg text-white/70 text-center focus:outline-none focus:border-white/20"
                    title="Days"
                  />
                  <span className="text-[10px] text-white/30 self-center">d</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => onGrantTrial(user.user_id)}
                    disabled={trialSaving}
                    className="flex-1 py-1.5 text-[10px] font-semibold rounded-lg bg-violet-500/15 border border-violet-500/20 text-violet-400 hover:bg-violet-500/25 transition-all flex items-center justify-center gap-1"
                  >
                    {trialSaving ? <Loader2 size={10} className="animate-spin" /> : <Gift size={10} />}
                    {trialSaving ? 'Granting…' : 'Grant'}
                  </button>
                  {isTrialActive && (
                    <button
                      onClick={() => onRevokeTrial(user.user_id)}
                      disabled={trialSaving}
                      className="flex-1 py-1.5 text-[10px] font-semibold rounded-lg bg-red-500/10 border border-red-500/15 text-red-400/70 hover:bg-red-500/20 transition-all flex items-center justify-center gap-1"
                    >
                      <X size={10} /> Revoke
                    </button>
                  )}
                </div>
                {isTrialActive && (
                  <p className="text-[10px] text-violet-400/70">
                    Trial: {user.trial_plan} · expires {new Date(user.trial_expires_at!).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {/* AI Credits */}
            <div className="bg-white/4 rounded-xl p-3 border border-white/8 space-y-2.5">
              <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">AI Credits</p>
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-white/40">Used today</span>
                  <span className="text-white/70 font-bold">
                    {user.credits_used_today} / {user.daily_limit === -1 ? '∞' : (user.daily_limit ?? '—')}
                  </span>
                </div>
                {creditsBar(user.credits_used_today, user.daily_limit)}
              </div>
              <div className="space-y-1.5">
                <input
                  type="number"
                  placeholder="New daily limit"
                  value={newLimitValue}
                  onChange={e => onNewLimitChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white/70 focus:outline-none focus:border-white/20 placeholder:text-white/20"
                />
                <input
                  type="number"
                  placeholder="Bonus credits to add"
                  value={bonusCreditsValue}
                  onChange={e => onBonusCreditsChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white/70 focus:outline-none focus:border-white/20 placeholder:text-white/20"
                />
                <button
                  onClick={() => onSetCredits(user.user_id)}
                  disabled={creditsSaving}
                  className="w-full py-1.5 text-[10px] font-semibold rounded-lg bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-all flex items-center justify-center gap-1"
                >
                  {creditsSaving ? <Loader2 size={10} className="animate-spin" /> : <TrendingUp size={10} />}
                  {creditsSaving ? 'Saving…' : 'Apply credits'}
                </button>
              </div>
            </div>

            {/* Access & Identity */}
            <div className="bg-white/4 rounded-xl p-3 border border-white/8 space-y-2">
              <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Access & Identity</p>

              {/* Act As */}
              <button
                onClick={() => onImpersonate(user.user_id)}
                disabled={impersonating}
                className="w-full py-2 text-[10px] font-semibold rounded-lg bg-blue-500/15 border border-blue-500/20 text-blue-400 hover:bg-blue-500/25 transition-all flex items-center justify-center gap-1.5"
              >
                {impersonating ? <Loader2 size={11} className="animate-spin" /> : <ExternalLink size={11} />}
                {impersonating ? 'Generating…' : 'Act As this user'}
              </button>

              {/* View Resumes — opens full drawer */}
              <button
                onClick={onOpenDrawer}
                className="w-full py-2 text-[10px] font-semibold rounded-lg bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-all flex items-center justify-center gap-1.5"
              >
                <LayoutList size={11} />
                View Resumes &amp; Full Profile
              </button>

              {/* Merge Identity — shown for all accounts, critical for Kinde collision accounts */}
              {mergeConfirming ? (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 space-y-1.5">
                  <p className="text-[10px] text-amber-400 font-semibold">Confirm identity merge?</p>
                  <p className="text-[10px] text-white/40 leading-tight">
                    This will suspend the orphan account and transfer all data to this account. Cannot be undone.
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onMergeIdentity(user.user_id)}
                      disabled={merging}
                      className="flex-1 py-1.5 text-[10px] font-bold rounded-lg bg-amber-500 text-black flex items-center justify-center gap-1"
                    >
                      {merging ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                      {merging ? 'Merging…' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => onSetMergeConfirming(false)}
                      className="flex-1 py-1.5 text-[10px] font-bold rounded-lg bg-white/5 border border-white/10 text-white/40"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => onSetMergeConfirming(true)}
                  className={cn(
                    'w-full py-1.5 text-[10px] font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5',
                    isCollision
                      ? 'bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/30'
                      : 'bg-white/4 border-white/8 text-white/30 hover:bg-white/8 hover:text-white/50',
                  )}
                  title="Merge this account's data into its canonical identity"
                >
                  <Merge size={11} />
                  {isCollision ? 'Fix Identity (Collision)' : 'Merge Identity'}
                </button>
              )}

              {/* Metadata */}
              <div className="text-[10px] text-white/30 space-y-0.5 pt-1">
                <p className="font-mono truncate">{user.user_id}</p>
                <div className="flex items-center gap-2">
                  <FileText size={10} />
                  <span>{user.resumeCount} resumes</span>
                  <span className="text-white/15">·</span>
                  <span>Joined {new Date(user.$createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* Moderation */}
            <div className="bg-white/4 rounded-xl p-3 border border-white/8 space-y-2">
              <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Moderation</p>
              {user.is_suspended ? (
                <div className="space-y-1.5">
                  {user.suspension_reason && (
                    <p className="text-[10px] text-red-400/70 truncate">Reason: {user.suspension_reason}</p>
                  )}
                  <button
                    onClick={() => onToggleSuspend(user.user_id, true)}
                    disabled={suspendSaving}
                    className="w-full py-2 text-[10px] font-semibold rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 transition-all flex items-center justify-center gap-1.5"
                  >
                    {suspendSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                    Unsuspend user
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <input
                    placeholder="Suspension reason (optional)"
                    value={suspendReasonValue}
                    onChange={e => onSuspendReasonChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white/70 focus:outline-none focus:border-white/20 placeholder:text-white/20"
                  />
                  <button
                    onClick={() => onToggleSuspend(user.user_id, false)}
                    disabled={suspendSaving}
                    className="w-full py-2 text-[10px] font-semibold rounded-lg bg-red-500/15 border border-red-500/20 text-red-400 hover:bg-red-500/25 transition-all flex items-center justify-center gap-1.5"
                  >
                    {suspendSaving ? <Loader2 size={11} className="animate-spin" /> : <Ban size={11} />}
                    Suspend user
                  </button>
                </div>
              )}
              <div className="space-y-1">
                <textarea
                  placeholder="Admin note…"
                  value={noteTextValue}
                  onChange={e => onNoteTextChange(e.target.value)}
                  rows={2}
                  className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white/70 focus:outline-none focus:border-white/20 placeholder:text-white/20 resize-none"
                />
                <button
                  onClick={() => onSaveNote(user.user_id)}
                  disabled={noteSaving}
                  className="w-full py-1.5 text-[10px] font-semibold rounded-lg bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 transition-all flex items-center justify-center gap-1"
                >
                  {noteSaving ? <Loader2 size={10} className="animate-spin" /> : <MessageSquare size={10} />}
                  Save note
                </button>
              </div>
              <button
                onClick={() => onDeleteUser(user.user_id, user.$id)}
                disabled={deleting}
                className="w-full py-1.5 text-[10px] font-semibold rounded-lg bg-red-500/8 border border-red-500/10 text-red-400/50 hover:bg-red-500/15 hover:text-red-400 transition-all flex items-center justify-center gap-1"
              >
                {deleting ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                Delete profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
