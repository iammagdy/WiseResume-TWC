import { useState, useEffect, useRef } from 'react';
import { X, Crown, Shield, ShieldOff, Zap, StickyNote, Copy, Check, Clock, UserPen, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import type { AdminUser } from './AdminUsersPanel';

interface UserDetailDrawerProps {
  user: AdminUser;
  password: string;
  open: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
}

type PlanTab = 'permanent' | 'trial';

interface AuditEntry {
  id: string;
  user_id: string;
  action: string;
  category?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface NoteEntry {
  id: string;
  note_text: string;
  created_at: string;
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-muted text-muted-foreground border-border',
  pro: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
  premium: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getInitials(user: AdminUser) {
  if (user.full_name) return user.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return user.email?.charAt(0).toUpperCase() || 'U';
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function summarizeAction(action: string, meta: Record<string, unknown>): string {
  if (action === 'plan_change') return `Plan → ${meta.new_plan ?? '?'}`;
  if (action === 'trial_grant') return `Trial ${meta.trial_plan ?? ''} for ${meta.days ?? '?'}d`;
  if (action === 'trial_revoke') return 'Trial revoked';
  if (action === 'suspend') return `Suspended${meta.reason ? `: ${meta.reason}` : ''}`;
  if (action === 'unsuspend') return 'Unsuspended';
  if (action === 'credits_override') {
    const parts: string[] = [];
    if (meta.daily_limit != null) parts.push(`limit→${meta.daily_limit}`);
    if (meta.bonus_credits) parts.push(`+${meta.bonus_credits} bonus`);
    return parts.join(', ') || 'Credits updated';
  }
  if (action === 'profile_update') {
    const changed = meta.changed_fields as Record<string, { old: unknown; new: unknown }> | undefined;
    if (!changed) return 'Profile updated';
    const parts: string[] = [];
    if (changed.full_name) parts.push(`name: "${changed.full_name.old}" → "${changed.full_name.new}"`);
    if (changed.username) parts.push(`username: "${changed.username.old}" → "${changed.username.new}"`);
    return parts.join(', ') || 'Profile updated';
  }
  return action.replace(/_/g, ' ');
}

export function UserDetailDrawer({ user: userProp, password, open, onClose, onUserUpdated }: UserDetailDrawerProps) {
  // Local copy of user so we can reflect mutations immediately without waiting for parent refetch
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();

  const [user, setUser] = useState<AdminUser>(userProp);
  // Sync local user state and form fields whenever the parent provides fresh server data
  useEffect(() => {
    setUser(userProp);
    setSelectedPlan(userProp.plan_name);
    setSuspendReason(userProp.suspension_reason || '');
    setNewDailyLimit(userProp.daily_limit !== null ? String(userProp.daily_limit) : '');
    setProfileFullName(userProp.full_name || '');
  }, [userProp]);

  const [planTab, setPlanTab] = useState<PlanTab>('permanent');
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro' | 'premium'>(user.plan_name);
  const [savingPlan, setSavingPlan] = useState(false);
  const [trialPlan, setTrialPlan] = useState<'pro' | 'premium'>('pro');
  const [trialDays, setTrialDays] = useState(7);
  const [savingTrial, setSavingTrial] = useState(false);
  const [revokingTrial, setRevokingTrial] = useState(false);
  const [suspendReason, setSuspendReason] = useState(user.suspension_reason || '');
  const [savingSuspend, setSavingSuspend] = useState(false);
  const [newDailyLimit, setNewDailyLimit] = useState(user.daily_limit !== null ? String(user.daily_limit) : '');
  const [bonusCredits, setBonusCredits] = useState('');
  const [savingCredits, setSavingCredits] = useState(false);

  // When a DIFFERENT user is opened (user_id changes), reset all form fields to the new user's data
  useEffect(() => {
    setSelectedPlan(userProp.plan_name);
    setSuspendReason(userProp.suspension_reason || '');
    setNewDailyLimit(userProp.daily_limit !== null ? String(userProp.daily_limit) : '');
    setBonusCredits('');
    setPlanTab('permanent');
  }, [userProp.user_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([]);
  const [notesHistory, setNotesHistory] = useState<NoteEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Profile edit state
  const [profileFullName, setProfileFullName] = useState(user.full_name || '');
  const [profileUsername, setProfileUsername] = useState('');
  const [profileUsernameLoaded, setProfileUsernameLoaded] = useState(false);
  const [profileEnabled, setProfileEnabled] = useState<boolean | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [usernameChangedOldValue, setUsernameChangedOldValue] = useState<string | null>(null);
  const usernameCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setHistoryLoading(true);

    edgeFunctions.functions.invoke('admin-audit-logs', {
      body: { password, limit: 500 },
    }).then(({ data }) => {
      if (cancelled) return;
      const result = data as { success?: boolean; logs?: AuditEntry[] };
      const all = result?.logs ?? [];
      // Filter to this user — audit_logs stores user_id as the target
      setAuditHistory(all.filter(l => l.user_id === user.user_id));
    }).catch(() => {});

    edgeFunctions.functions.invoke('admin-save-note', {
      body: { password, target_user_id: user.user_id, action: 'list' },
    }).then(({ data }) => {
      if (cancelled) return;
      const result = data as { success?: boolean; notes?: NoteEntry[] };
      setNotesHistory(result?.notes ?? []);
    }).catch(() => {}).finally(() => {
      if (!cancelled) setHistoryLoading(false);
    });

    return () => { cancelled = true; };
  }, [open, user.user_id, password]);

  // Load current profile username when drawer opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setProfileFullName(user.full_name || '');
    setProfileUsernameLoaded(false);
    setProfileEnabled(null);
    setUsernameAvailable(null);
    setUsernameChangedOldValue(null);

    supabase
      .from('profiles')
      .select('username, portfolio_enabled')
      .eq('user_id', user.user_id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        const profileData = data as { username?: string | null; portfolio_enabled?: boolean | null } | null;
        setProfileUsername(profileData?.username ?? '');
        setProfileEnabled(profileData?.portfolio_enabled ?? false);
        setProfileUsernameLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setProfileUsernameLoaded(true);
          setProfileEnabled(false);
        }
      });

    return () => { cancelled = true; };
  }, [open, user.user_id, user.full_name]);

  // Debounced username availability check
  const handleUsernameChange = (val: string) => {
    setProfileUsername(val);
    setUsernameAvailable(null);
    if (usernameCheckRef.current) clearTimeout(usernameCheckRef.current);
    if (!val.trim() || val.trim().length < 3) {
      setCheckingUsername(false);
      return;
    }
    setCheckingUsername(true);
    usernameCheckRef.current = setTimeout(async () => {
      try {
        // Using same pattern as PortfolioEditorPage.tsx for RPC call
        const { data, error } = await supabase.rpc('check_username_available', {
          p_username: val.trim().toLowerCase(),
          p_user_id: user.user_id,
        });
        if (error) throw error;
        setUsernameAvailable(data === true);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const trimmedUsername = profileUsername.trim().toLowerCase();
      const trimmedName = profileFullName.trim();

      const { data, error } = await edgeFunctions.functions.invoke('admin-update-profile', {
        body: {
          password,
          target_user_id: user.user_id,
          full_name: trimmedName || null,
          username: trimmedUsername || undefined,
          actor_email: authUser?.email ?? 'admin (dev-kit)',
        },
      });
      if (error) throw new Error(error.message);
      const result = data as { success?: boolean; error?: string; changed_fields?: Record<string, { old: unknown; new: unknown }> };
      if (result?.success === false) throw new Error(result.error ?? 'Unknown error');

      const changed = result?.changed_fields ?? {};
      if (Object.keys(changed).length === 0) {
        toast.info('No changes to save');
        return;
      }

      if (changed.username) {
        setUsernameChangedOldValue(changed.username.old as string | null);
        // Invalidate the public portfolio cache for the old and new username
        queryClient.invalidateQueries({ queryKey: ['public-portfolio'] });
      }

      toast.success('Profile updated successfully');
      setUser(prev => ({
        ...prev,
        full_name: trimmedName || null,
      }));
      onUserUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  if (!open) return null;

  const isTrialActive = user.trial_plan && user.trial_expires_at && new Date(user.trial_expires_at) > new Date();
  const trialDaysLeft = user.trial_expires_at
    ? Math.max(0, Math.ceil((new Date(user.trial_expires_at).getTime() - Date.now()) / 86400000))
    : 0;

  const handleSetPlan = async () => {
    if (selectedPlan === user.plan_name) { toast.info('Plan unchanged'); return; }
    setSavingPlan(true);
    try {
      const { data, error } = await edgeFunctions.functions.invoke('admin-set-plan', {
        body: { password, target_user_id: user.user_id, plan: selectedPlan },
      });
      if (error) throw new Error(error.message);
      const result = data as { success?: boolean; error?: string };
      if (result?.success === false) throw new Error(result.error ?? 'Unknown error');
      toast.success(`Plan set to ${selectedPlan}`, {
        description: "The user's app will reflect this within 10 seconds.",
        duration: 5000,
      });
      setUser(prev => ({ ...prev, plan_name: selectedPlan, plan_updated_at: new Date().toISOString() }));
      queryClient.invalidateQueries({ queryKey: ['me'] });
      onUserUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to set plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleGrantTrial = async () => {
    setSavingTrial(true);
    try {
      const { data, error } = await edgeFunctions.functions.invoke('admin-grant-trial', {
        body: { password, target_user_id: user.user_id, plan: trialPlan, days: trialDays },
      });
      if (error) throw new Error(error.message);
      const result = data as { success?: boolean; error?: string };
      if (result?.success === false) throw new Error(result.error ?? 'Unknown error');
      const expiresAt = new Date(Date.now() + trialDays * 86400000).toISOString();
      toast.success(`${trialPlan} trial granted for ${trialDays} days`);
      setUser(prev => ({ ...prev, trial_plan: trialPlan, trial_expires_at: expiresAt }));
      onUserUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to grant trial');
    } finally {
      setSavingTrial(false);
    }
  };

  const handleRevokeTrial = async () => {
    setRevokingTrial(true);
    try {
      const { data, error } = await edgeFunctions.functions.invoke('admin-revoke-trial', {
        body: { password, target_user_id: user.user_id },
      });
      if (error) throw new Error(error.message);
      const result = data as { success?: boolean; error?: string };
      if (result?.success === false) throw new Error(result.error ?? 'Unknown error');
      toast.success('Trial revoked');
      setUser(prev => ({ ...prev, trial_plan: null, trial_expires_at: null }));
      onUserUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to revoke trial');
    } finally {
      setRevokingTrial(false);
    }
  };

  const handleToggleSuspend = async () => {
    setSavingSuspend(true);
    try {
      const suspend = !user.is_suspended;
      const { data, error } = await edgeFunctions.functions.invoke('admin-suspend-user', {
        body: { password, target_user_id: user.user_id, suspend, reason: suspend ? suspendReason : null },
      });
      if (error) throw new Error(error.message);
      const result = data as { success?: boolean; error?: string };
      if (result?.success === false) throw new Error(result.error ?? 'Unknown error');
      toast.success(suspend ? 'User suspended' : 'User unsuspended');
      setUser(prev => ({
        ...prev,
        is_suspended: suspend,
        suspension_reason: suspend ? suspendReason || null : null,
      }));
      onUserUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update suspension');
    } finally {
      setSavingSuspend(false);
    }
  };

  const handleSetCredits = async () => {
    setSavingCredits(true);
    try {
      const parsedLimit = newDailyLimit !== '' ? Number(newDailyLimit) : undefined;
      const parsedBonus = bonusCredits ? Number(bonusCredits) : 0;
      const { data, error } = await edgeFunctions.functions.invoke('admin-set-credits', {
        body: {
          password,
          target_user_id: user.user_id,
          daily_limit: parsedLimit,
          bonus_credits: parsedBonus,
        },
      });
      if (error) throw new Error(error.message);
      const result = data as { success?: boolean; error?: string };
      if (result?.success === false) throw new Error(result.error ?? 'Unknown error');
      toast.success('Credits updated');
      setUser(prev => ({
        ...prev,
        ...(parsedLimit !== undefined ? { daily_limit: parsedLimit } : {}),
        ...(parsedBonus > 0 ? { credits_used_today: Math.max(0, prev.credits_used_today - parsedBonus) } : {}),
      }));
      setNewDailyLimit(parsedLimit !== undefined ? String(parsedLimit) : '');
      setBonusCredits('');
      queryClient.invalidateQueries({ queryKey: ['me'] });
      onUserUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update credits');
    } finally {
      setSavingCredits(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      const { data, error } = await edgeFunctions.functions.invoke('admin-save-note', {
        body: { password, target_user_id: user.user_id, note_text: noteText },
      });
      if (error) throw new Error(error.message);
      const result = data as { success?: boolean; error?: string };
      if (result?.success === false) throw new Error(result.error ?? 'Unknown error');
      toast.success('Note saved');
      setNoteText('');
      const newNote: NoteEntry = { id: Date.now().toString(), note_text: noteText, created_at: new Date().toISOString() };
      setNotesHistory(prev => [newNote, ...prev]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-card border-l border-border shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
              {getInitials(user)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{user.full_name || 'No name'}</p>
              <p className="text-xs text-muted-foreground truncate font-mono">{user.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* User Info Card */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">User ID</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-[10px] text-muted-foreground">{user.user_id.slice(0, 16)}…</span>
                <CopyButton value={user.user_id} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Current plan</span>
              <div className="flex items-center gap-1.5">
                {user.is_suspended && <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20">Suspended</Badge>}
                {isTrialActive && <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/20">Trial {user.trial_plan} · {trialDaysLeft}d left</Badge>}
                <Badge variant="outline" className={`capitalize text-[10px] ${PLAN_COLORS[user.plan_name] ?? ''}`}>{user.plan_name}</Badge>
              </div>
            </div>
            {isTrialActive && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Trial expires</span>
                <span className="text-xs text-muted-foreground">{formatDate(user.trial_expires_at)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Joined</span>
              <span className="text-xs text-muted-foreground">{formatDate(user.created_at)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Last active</span>
              <span className="text-xs text-muted-foreground">{formatDate(user.last_sign_in_at)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Resumes</span>
              <span className="text-xs text-muted-foreground">{user.resume_count}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Short links</span>
              <span className="text-xs text-muted-foreground">{user.link_count ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">AI credits (today)</span>
              <span className="text-xs text-muted-foreground">
                {user.credits_used_today} / {user.daily_limit === -1 ? 'unlimited' : (user.daily_limit ?? '—')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Daily AI limit</span>
              <span className="text-xs text-muted-foreground">
                {user.daily_limit === -1 ? 'Unlimited' : user.daily_limit != null ? `${user.daily_limit} / day` : '—'}
              </span>
            </div>
            {user.plan_updated_at && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Plan last changed</span>
                <span className="text-xs text-muted-foreground">{formatDate(user.plan_updated_at)}</span>
              </div>
            )}
          </div>

          {/* Edit Profile */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <UserPen className="w-4 h-4 text-indigo-500" />
              Edit Profile
            </h3>

            {usernameChangedOldValue !== null && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  The old portfolio URL <span className="font-mono">resume.thewise.cloud/p/{usernameChangedOldValue}</span> will no longer work. The user should be notified.
                </span>
              </div>
            )}

            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground font-medium">Full name</label>
                <Input
                  value={profileFullName}
                  onChange={(e) => setProfileFullName(e.target.value)}
                  placeholder="e.g. Jane Smith"
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-medium">Portfolio username</label>
                <div className="relative mt-1">
                  <Input
                    value={profileUsername}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder={profileUsernameLoaded ? 'e.g. janesmith' : 'Loading…'}
                    disabled={!profileUsernameLoaded}
                    className="h-9 text-xs pr-8"
                  />
                  {checkingUsername && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">…</span>
                  )}
                  {!checkingUsername && usernameAvailable === true && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-green-600 font-bold">✓</span>
                  )}
                  {!checkingUsername && usernameAvailable === false && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-destructive font-bold">✗</span>
                  )}
                </div>
                {!checkingUsername && usernameAvailable === false && (
                  <p className="text-[10px] text-destructive mt-0.5">Username is already taken</p>
                )}
                {!checkingUsername && usernameAvailable === true && (
                  <p className="text-[10px] text-green-600 mt-0.5">Username is available</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Portfolio URL: <span className="font-mono">resume.thewise.cloud/p/{profileUsername || '…'}</span>
                </p>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-muted-foreground font-medium">Portfolio enabled</span>
                {profileEnabled === null ? (
                  <span className="text-[10px] text-muted-foreground">Loading…</span>
                ) : (
                  <Badge
                    variant="outline"
                    className={profileEnabled
                      ? 'text-[10px] bg-green-500/10 text-green-600 border-green-500/20'
                      : 'text-[10px] bg-muted text-muted-foreground border-border'}
                  >
                    {profileEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                )}
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={savingProfile || usernameAvailable === false || checkingUsername}
                size="sm"
                className="w-full mt-1"
              >
                {savingProfile ? 'Saving…' : 'Save profile changes'}
              </Button>
            </div>
          </div>

          {/* Plan Controls */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Crown className="w-4 h-4 text-amber-500" />
              Plan Control
            </h3>
            <div className="flex gap-1 p-1 bg-muted/40 rounded-lg border border-border w-fit">
              {(['permanent', 'trial'] as PlanTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPlanTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${planTab === tab ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {planTab === 'permanent' && (
              <div className="space-y-2">
                {(['free', 'pro', 'premium'] as const).map((plan) => (
                  <button
                    key={plan}
                    onClick={() => setSelectedPlan(plan)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${selectedPlan === plan ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted'}`}
                  >
                    <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${selectedPlan === plan ? 'border-primary' : 'border-muted-foreground/40'}`}>
                      {selectedPlan === plan && <span className="w-2 h-2 rounded-full bg-primary block" />}
                    </span>
                    <span className="text-sm capitalize font-medium">{plan}</span>
                    {user.plan_name === plan && <span className="ml-auto text-[10px] text-muted-foreground">current</span>}
                  </button>
                ))}
                <Button onClick={handleSetPlan} disabled={savingPlan} size="sm" className="w-full mt-1">
                  {savingPlan ? 'Saving…' : 'Set permanent plan'}
                </Button>
              </div>
            )}

            {planTab === 'trial' && (
              <div className="space-y-3">
                {isTrialActive && (
                  <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-600 dark:text-purple-400">
                    <p className="font-medium">Active {user.trial_plan} trial</p>
                    <p className="opacity-80 mt-0.5">Expires {formatDate(user.trial_expires_at)} · {trialDaysLeft} days left</p>
                    <Button variant="outline" size="sm" onClick={handleRevokeTrial} disabled={revokingTrial} className="mt-2 h-6 text-[10px] text-destructive border-destructive/30">
                      {revokingTrial ? 'Revoking…' : 'Revoke trial'}
                    </Button>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Trial plan</p>
                    <select
                      value={trialPlan}
                      onChange={(e) => setTrialPlan(e.target.value as 'pro' | 'premium')}
                      className="w-full text-xs bg-background border border-border rounded-md px-2 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="pro">Pro</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Duration (days)</p>
                    <select
                      value={trialDays}
                      onChange={(e) => setTrialDays(Number(e.target.value))}
                      className="w-full text-xs bg-background border border-border rounded-md px-2 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {[3, 7, 14, 30, 60, 90].map(d => <option key={d} value={d}>{d} days</option>)}
                    </select>
                  </div>
                </div>
                <Button onClick={handleGrantTrial} disabled={savingTrial} size="sm" className="w-full">
                  {savingTrial ? 'Granting…' : `Grant ${trialPlan} trial for ${trialDays} days`}
                </Button>
              </div>
            )}
          </div>

          {/* Account History */}
          {auditHistory.length > 0 && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Plan & Action History
              </h3>
              <div className="rounded-xl border border-border overflow-hidden">
                {auditHistory.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 px-3 py-2 border-b border-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium capitalize">{entry.action.replace(/_/g, ' ')}</p>
                      <p className="text-[10px] text-muted-foreground">{summarizeAction(entry.action, entry.metadata)}</p>
                      <p className="text-[10px] text-muted-foreground/60">
                        by {(entry.metadata?.actor_email as string) ?? (entry.category === 'admin' ? 'Admin' : 'System')}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground shrink-0">{formatDate(entry.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suspension */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              {user.is_suspended ? <ShieldOff className="w-4 h-4 text-red-500" /> : <Shield className="w-4 h-4 text-green-500" />}
              Account Status
            </h3>
            {user.is_suspended ? (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 space-y-2">
                <p className="font-medium">Account is suspended</p>
                {user.suspension_reason && <p className="opacity-80">Reason: {user.suspension_reason}</p>}
                <Button variant="outline" size="sm" onClick={handleToggleSuspend} disabled={savingSuspend} className="h-7 text-xs">
                  {savingSuspend ? 'Unsuspending…' : 'Unsuspend account'}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Suspension reason (optional)"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="text-xs h-9"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleSuspend}
                  disabled={savingSuspend}
                  className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 w-full"
                >
                  {savingSuspend ? 'Suspending…' : 'Suspend account'}
                </Button>
              </div>
            )}
          </div>

          {/* AI Credits Override */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="w-4 h-4 text-yellow-500" />
              AI Credits Override
            </h3>
            <p className="text-xs text-muted-foreground">
              Currently using <strong>{user.credits_used_today}</strong> of <strong>{user.daily_limit === -1 ? 'unlimited' : (user.daily_limit ?? '?')}</strong> credits today.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">New daily limit (-1 = unlimited)</p>
                <Input
                  type="number"
                  placeholder={user.daily_limit !== null ? String(user.daily_limit) : 'current'}
                  value={newDailyLimit}
                  onChange={(e) => setNewDailyLimit(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Add bonus credits</p>
                <Input
                  type="number"
                  placeholder="0"
                  value={bonusCredits}
                  onChange={(e) => setBonusCredits(e.target.value)}
                  className="h-9 text-xs"
                  min="0"
                />
              </div>
            </div>
            <Button onClick={handleSetCredits} disabled={savingCredits} size="sm" variant="outline" className="w-full h-8 text-xs">
              {savingCredits ? 'Saving…' : 'Apply credits override'}
            </Button>
          </div>

          {/* Admin Notes */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <StickyNote className="w-4 h-4 text-blue-500" />
              Admin Notes
            </h3>
            <Textarea
              placeholder="Add an internal note about this user…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={2}
              className="text-xs resize-none"
            />
            <Button onClick={handleSaveNote} disabled={savingNote || !noteText.trim()} size="sm" variant="outline" className="h-8 text-xs w-full">
              {savingNote ? 'Saving…' : 'Save note'}
            </Button>
            <p className="text-[10px] text-muted-foreground">Notes are internal — never visible to the user.</p>

            {/* Notes history */}
            {notesHistory.length > 0 && (
              <div className="rounded-xl border border-border overflow-hidden mt-2">
                <div className="px-3 py-2 bg-muted/30 border-b border-border">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Previous notes</p>
                </div>
                {notesHistory.map((note) => (
                  <div key={note.id} className="px-3 py-2 border-b border-border last:border-0">
                    <p className="text-xs">{note.note_text}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{formatDate(note.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
