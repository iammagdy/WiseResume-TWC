import { useState, useEffect, useRef } from 'react';
import { X, Crown, Shield, ShieldOff, Zap, StickyNote, Copy, Check, Clock, UserPen, AlertTriangle, Trash2, LogOut, UserX, FileText, ChevronRight, Fingerprint, Merge, RotateCcw, Activity, Filter, CalendarDays, Loader2 } from 'lucide-react';
import { AccountTypeBadge } from './DevKitBadges';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { databases, Query } from '@/lib/appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
import { useAuth } from '@/hooks/useAuth';
import { getDevKitToken } from '@/contexts/DevKitSessionContext';
import { useIsMounted } from '@/lib/devkit/hooks';
import { isImpersonating, subscribe as subscribeImpersonation } from '@/lib/impersonationStore';
import { unwrapAdminResponse, tryUnwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import type { AdminUser } from './AdminUsersPanel';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { DevKitErrorCard } from './DevKitErrorCard';


interface UserDetailDrawerProps {
  user: AdminUser;
  open: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
  onUserDeleted?: (userId: string) => void;
}

type PlanTab = 'permanent' | 'trial';
type DrawerTab = 'actions' | 'content' | 'activity';

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

interface ResumeItem {
  id: string;
  title: string;
  template_id: string | null;
  updated_at: string;
}

interface ResumeDetail extends ResumeItem {
  content: unknown;
}

interface UsageEvent {
  id: string;
  event_type: string;
  metadata: Record<string, unknown>;
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
  if (action === 'identity_merged') {
    const orphanId = meta.orphan_user_id as string | undefined;
    return `Identity merged${orphanId ? ` (orphan: ${String(orphanId).slice(0, 8)}…)` : ''}`;
  }
  return action.replace(/_/g, ' ');
}

export function UserDetailDrawer({ user: userProp, open, onClose, onUserUpdated, onUserDeleted }: UserDetailDrawerProps) {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const isMounted = useIsMounted();

  const [impersonating, setImpersonating] = useState(isImpersonating);
  useEffect(() => subscribeImpersonation(() => setImpersonating(isImpersonating())), []);

  const [user, setUser] = useState<AdminUser>(userProp);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('actions');

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

  useEffect(() => {
    setSelectedPlan(userProp.plan_name);
    setSuspendReason(userProp.suspension_reason || '');
    setNewDailyLimit(userProp.daily_limit !== null ? String(userProp.daily_limit) : '');
    setBonusCredits('');
    setPlanTab('permanent');
    setDrawerTab('actions');
  }, [userProp.user_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<string | null>(null);

  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([]);
  const [notesHistory, setNotesHistory] = useState<NoteEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Delete user dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteEmailConfirm, setDeleteEmailConfirm] = useState('');
  const [deletingUser, setDeletingUser] = useState(false);

  // WiseHire test reset dialog
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resettingUser, setResettingUser] = useState(false);

  // Revoke sessions
  const [revokingSessions, setRevokingSessions] = useState(false);

  // Content tab state
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [resumesLoading, setResumesLoading] = useState(false);
  const [selectedResume, setSelectedResume] = useState<ResumeDetail | null>(null);
  const [resumeDetailLoading, setResumeDetailLoading] = useState(false);

  // Activity tab state
  const [activityEvents, setActivityEvents] = useState<UsageEvent[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activityEventTypeFilter, setActivityEventTypeFilter] = useState<string>('all');
  const [contentStats, setContentStats] = useState<{
    resumeCount: number | null;
    coverLetterCount: number | null;
    hasPortfolio: boolean;
    portfolioEnabled: boolean | null;
    portfolioUsername: string | null;
    aiCredits30d: number | null;
    planHistory: Array<{ action: string; metadata: Record<string, unknown>; created_at: string }>;
  } | null>(null);

  // Identity section state
  const [identityData, setIdentityData] = useState<{
    auth_email: string | null;
    contact_email: string | null;
    kinde_sub: string | null;
    kinde_email: string | null;
    kinde_email_status: 'found' | 'lookup_failed' | 'not_needed' | 'credentials_missing';
    last_exchange_at: string | null;
    signed_up_at: string | null;
    last_sign_in_at: string | null;
    is_collision: boolean;
  } | null>(null);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [mergingIdentity, setMergingIdentity] = useState(false);

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
    appwriteFunctions.invoke('admin-devkit-data', {
      headers: devKitAuthHeaders(),
      body: { action: 'user-audit-logs', limit: 500, target_user_id: user.user_id },
    }).then((tuple) => {
      if (cancelled) return;
      try {
        const result = unwrapAdminResponse<{ logs?: AuditEntry[] }>(tuple, 'admin-devkit-data');
        setAuditHistory(result.logs ?? []);
      } catch (e) {
        const msg = formatEdgeError(e, 'Unknown error');
        console.warn('[UserDetailDrawer] audit-logs failed:', msg);
        toast.error('Could not load audit history', { description: msg });
        setAuditHistory([]);
      }
    });

    appwriteFunctions.invoke('admin-devkit-data', {
      headers: devKitAuthHeaders(),
      body: { action: 'save-note', target_user_id: user.user_id },
    }).then((tuple) => {
      if (cancelled) return;
      try {
        const result = unwrapAdminResponse<{ notes?: NoteEntry[] }>(tuple, 'admin-devkit-data');
        setNotesHistory(result.notes ?? []);
      } catch (e) {
        const msg = formatEdgeError(e, 'Unknown error');
        console.warn('[UserDetailDrawer] notes list failed:', msg);
        toast.error('Could not load admin notes', { description: msg });
        setNotesHistory([]);
      }
    }).finally(() => {
      if (!cancelled) setHistoryLoading(false);
    });

    return () => { cancelled = true; };
  }, [open, user.user_id]);

  // Load activity events + content stats when activity tab is opened
  useEffect(() => {
    if (drawerTab !== 'activity' || !open) return;
    let cancelled = false;
    setActivityLoading(true);
    setActivityError(null);

    const eventsPromise = appwriteFunctions.invoke('admin-devkit-data', {
      headers: devKitAuthHeaders(),
      body: { action: 'live-activity', resource: 'usage_events', user_id: user.user_id },
    }).then((tuple) => {
      if (cancelled) return;
      try {
        const result = unwrapAdminResponse<{ data?: UsageEvent[] }>(tuple, 'admin-devkit-data');
        setActivityEvents(result.data ?? []);
      } catch (e) {
        setActivityError(formatEdgeError(e, 'Failed to load activity'));
        setActivityEvents([]);
      }
    });

    const statsPromise = appwriteFunctions.invoke('admin-devkit-data', {
      headers: devKitAuthHeaders(),
      body: { action: 'live-activity', resource: 'user_content_stats', user_id: user.user_id },
    }).then((tuple) => {
      if (cancelled) return;
      try {
        const result = unwrapAdminResponse<{
          resumeCount: number | null;
          coverLetterCount: number | null;
          hasPortfolio: boolean;
          portfolioEnabled: boolean | null;
          portfolioUsername: string | null;
          aiCredits30d: number | null;
          planHistory: Array<{ action: string; metadata: Record<string, unknown>; created_at: string }>;
        }>(tuple, 'admin-devkit-data (stats)');
        setContentStats(result);
      } catch {
        // stats are non-critical; silently skip
      }
    });

    Promise.all([eventsPromise, statsPromise]).finally(() => {
      if (!cancelled) setActivityLoading(false);
    });

    return () => { cancelled = true; };
  }, [drawerTab, open, user.user_id]);

  // Load resumes when content tab is opened
  useEffect(() => {
    if (drawerTab !== 'content' || !open) return;
    let cancelled = false;
    setResumesLoading(true);
    setSelectedResume(null);
    appwriteFunctions.invoke('admin-devkit-data', {
      headers: devKitAuthHeaders(),
      body: { action: 'list-user-content', target_user_id: user.user_id },
    }).then((tuple) => {
      if (cancelled) return;
      const result = tryUnwrapAdminResponse<{ resumes?: ResumeItem[] }>(tuple, 'admin-devkit-data');
      if (!result) {
        setResumes([]);
        toast.error('Could not load user content');
        return;
      }
      setResumes(result.resumes ?? []);
    }).finally(() => {
      if (!cancelled) setResumesLoading(false);
    });

    return () => { cancelled = true; };
  }, [drawerTab, open, user.user_id]);

  // Load current profile username when drawer opens.
  // Routed through admin-update-profile edge function (action='get') so it works
  // regardless of whether the admin has a Supabase JWT (bypasses RLS).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setProfileFullName(user.full_name || '');
    setProfileUsernameLoaded(false);
    setProfileEnabled(null);
    setUsernameAvailable(null);
    setUsernameChangedOldValue(null);

    appwriteFunctions.invoke('admin-devkit-data', {
      headers: devKitAuthHeaders(),
      body: {
        action: 'update-profile',
        target_user_id: user.user_id,
        profile_action: 'get',
      },
    }).then((tuple) => {
      if (cancelled) return;
      try {
        const result = unwrapAdminResponse<{ profile?: { username?: string | null; portfolio_enabled?: boolean | null } | null }>(tuple, 'admin-devkit-data');
        const profileData = result.profile ?? null;
        setProfileUsername(profileData?.username ?? '');
        setProfileEnabled(profileData?.portfolio_enabled ?? false);
        setProfileUsernameLoaded(true);
      } catch (e) {
        const msg = formatEdgeError(e, 'Could not load portfolio profile fields');
        console.warn('[UserDetailDrawer] Profile GET failed:', msg);
        setProfileUsernameLoaded(true);
        setProfileEnabled(false);
        toast.error('Could not load portfolio profile fields. You may still edit other fields.', { description: msg });
      }
    });

    return () => { cancelled = true; };
  }, [open, user.user_id, user.full_name]);

  // Load identity data for this user (always, not just collision users)
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIdentityData(null);
    setIdentityLoading(true);
    setShowMergeConfirm(false);
    appwriteFunctions.invoke('admin-devkit-data', {
      headers: devKitAuthHeaders(),
      body: { action: 'get-identity', target_user_id: user.user_id },
    }).then((tuple) => {
      if (cancelled) return;
      try {
        const result = unwrapAdminResponse<{
          auth_email?: string | null;
          contact_email?: string | null;
          kinde_sub?: string | null;
          kinde_email?: string | null;
          kinde_email_status?: 'found' | 'lookup_failed' | 'not_needed' | 'credentials_missing';
          last_exchange_at?: string | null;
          signed_up_at?: string | null;
          last_sign_in_at?: string | null;
          is_collision?: boolean;
        }>(tuple, 'admin-devkit-data');
        setIdentityData({
          auth_email: result.auth_email ?? null,
          contact_email: result.contact_email ?? null,
          kinde_sub: result.kinde_sub ?? null,
          kinde_email: result.kinde_email ?? null,
          kinde_email_status: result.kinde_email_status ?? 'not_needed',
          last_exchange_at: result.last_exchange_at ?? null,
          signed_up_at: result.signed_up_at ?? null,
          last_sign_in_at: result.last_sign_in_at ?? null,
          is_collision: result.is_collision ?? false,
        });
      } catch (e) {
        const msg = formatEdgeError(e, 'Unknown error');
        console.warn('[UserDetailDrawer] get-identity failed:', msg);
        // Identity is informational; surface as a soft warning rather than blocking the drawer.
        toast.warning('Could not load identity record', { description: msg });
      }
    }).finally(() => {
      if (!cancelled) setIdentityLoading(false);
    });

    return () => { cancelled = true; };
  }, [open, user.user_id]);

  const handleMergeIdentity = async () => {
    setMergingIdentity(true);
    try {
      const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: { action: 'merge-identity', collision_user_id: user.user_id },
      });
      unwrapAdminResponse<{ merge_log?: string[] }>(tuple, 'admin-devkit-data');
      if (!isMounted()) return;
      toast.success('Identity merged successfully', {
        description: 'The orphan account has been suspended and merged into this account.',
        duration: 6000,
      });
      setShowMergeConfirm(false);
      onUserUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to merge identity');
    } finally {
      if (isMounted()) setMergingIdentity(false);
    }
  };

  // Debounced username uniqueness check (admin mode: only checks if slug is taken,
  // never blocks on length/character rules since admin can force any value)
  const handleUsernameChange = (val: string) => {
    setProfileUsername(val);
    setUsernameAvailable(null);
    if (usernameCheckRef.current) clearTimeout(usernameCheckRef.current);
    if (!val.trim()) {
      setCheckingUsername(false);
      return;
    }
    setCheckingUsername(true);
    usernameCheckRef.current = setTimeout(async () => {
      try {
        // Use a direct profiles lookup instead of the full check_username_available
        // RPC so length/character rules never block the admin's input.
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.profiles, [
          Query.equal('username', val.trim().toLowerCase()),
          Query.notEqual('user_id', user.user_id),
          Query.limit(1),
        ]);
        setUsernameAvailable(res.total === 0);
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

      const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: {
          action: 'update-profile',
          target_user_id: user.user_id,
          full_name: trimmedName || null,
          username: trimmedUsername || undefined,
          actor_email: authUser?.email ?? 'admin (dev-kit)',
          admin_bypass_validation: true,
        },
      });
      const result = unwrapAdminResponse<{ changed_fields?: Record<string, { old: unknown; new: unknown }> }>(tuple, 'admin-devkit-data');
      if (!isMounted()) return;

      const changed = result.changed_fields ?? {};
      if (Object.keys(changed).length === 0) {
        toast.info('No changes to save');
        return;
      }

      if (changed.username) {
        setUsernameChangedOldValue(changed.username.old as string | null);
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
      if (isMounted()) setSavingProfile(false);
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
      const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: { action: 'set-plan', target_user_id: user.user_id, plan: selectedPlan },
      });
      unwrapAdminResponse(tuple, 'admin-devkit-data');
      if (!isMounted()) return;
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
      if (isMounted()) setSavingPlan(false);
    }
  };

  const handleGrantTrial = async () => {
    setSavingTrial(true);
    try {
      const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: { action: 'grant-trial', target_user_id: user.user_id, plan: trialPlan, days: trialDays },
      });
      unwrapAdminResponse(tuple, 'admin-devkit-data');
      if (!isMounted()) return;
      const expiresAt = new Date(Date.now() + trialDays * 86400000).toISOString();
      toast.success(`${trialPlan} trial granted for ${trialDays} days`);
      setUser(prev => ({ ...prev, trial_plan: trialPlan, trial_expires_at: expiresAt }));
      onUserUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to grant trial');
    } finally {
      if (isMounted()) setSavingTrial(false);
    }
  };

  const handleRevokeTrial = async () => {
    setRevokingTrial(true);
    try {
      const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: { action: 'revoke-trial', target_user_id: user.user_id },
      });
      unwrapAdminResponse(tuple, 'admin-devkit-data');
      if (!isMounted()) return;
      toast.success('Trial revoked');
      setUser(prev => ({ ...prev, trial_plan: null, trial_expires_at: null }));
      onUserUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to revoke trial');
    } finally {
      if (isMounted()) setRevokingTrial(false);
    }
  };

  const handleToggleSuspend = async () => {
    setSavingSuspend(true);
    try {
      const suspend = !user.is_suspended;
      const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: { action: 'suspend-user', target_user_id: user.user_id, suspend, reason: suspend ? suspendReason : null },
      });
      unwrapAdminResponse(tuple, 'admin-devkit-data');
      if (!isMounted()) return;
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
      if (isMounted()) setSavingSuspend(false);
    }
  };

  const handleSetCredits = async () => {
    setSavingCredits(true);
    try {
      const parsedLimit = newDailyLimit !== '' ? Number(newDailyLimit) : undefined;
      const parsedBonus = bonusCredits ? Number(bonusCredits) : 0;
      const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: {
          action: 'set-credits',
          target_user_id: user.user_id,
          daily_limit: parsedLimit,
          bonus_credits: parsedBonus,
        },
      });
      unwrapAdminResponse(tuple, 'admin-devkit-data');
      if (!isMounted()) return;
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
      if (isMounted()) setSavingCredits(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: { action: 'save-note', target_user_id: user.user_id, note_text: noteText },
      });
      unwrapAdminResponse(tuple, 'admin-devkit-data');
      if (!isMounted()) return;
      toast.success('Note saved');
      setNoteText('');
      const newNote: NoteEntry = { id: Date.now().toString(), note_text: noteText, created_at: new Date().toISOString() };
      setNotesHistory(prev => [newNote, ...prev]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save note');
    } finally {
      if (isMounted()) setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setDeletingNoteId(noteId);
    try {
      const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: {
          action: 'save-note',
          target_user_id: user.user_id,
          note_id: noteId,
          actor_email: authUser?.email ?? 'admin (dev-kit)',
        },
      });
      unwrapAdminResponse(tuple, 'admin-devkit-data');
      if (!isMounted()) return;
      toast.success('Note deleted');
      setNotesHistory(prev => prev.filter(n => n.id !== noteId));
      setConfirmDeleteNoteId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete note');
    } finally {
      if (isMounted()) setDeletingNoteId(null);
    }
  };

  const handleRevokeSessions = async () => {
    setRevokingSessions(true);
    try {
      const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: {
          action: 'revoke-sessions',
          target_user_id: user.user_id,
          actor_email: authUser?.email ?? 'admin (dev-kit)',
        },
      });
      unwrapAdminResponse(tuple, 'admin-devkit-data');
      if (!isMounted()) return;
      toast.success('All sessions revoked', { description: 'The user has been signed out from all devices.' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to revoke sessions');
    } finally {
      if (isMounted()) setRevokingSessions(false);
    }
  };

  const handleDeleteUser = async () => {
    if (deleteEmailConfirm !== user.email) return;
    setDeletingUser(true);
    try {
      const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: {
          action: 'delete-user',
          target_user_id: user.user_id,
          actor_email: authUser?.email ?? 'admin (dev-kit)',
        },
      });
      unwrapAdminResponse(tuple, 'admin-devkit-data');
      if (!isMounted()) return;
      toast.success('User account permanently deleted');
      setShowDeleteDialog(false);
      onUserDeleted?.(user.user_id);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete user');
    } finally {
      if (isMounted()) setDeletingUser(false);
    }
  };

  const handleResetUser = async () => {
    if (resetConfirmText !== 'RESET') return;
    setResettingUser(true);
    try {
      const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: {
          action: 'wisehire-reset-user',
          target_user_id: user.user_id,
          actor_email: authUser?.email ?? 'admin (dev-kit)',
        },
      });
      const result = unwrapAdminResponse<{
        kinde_deleted: boolean;
        invite_tokens_reset: number;
        warnings: string[];
      }>(tuple, 'admin-devkit-data');

      if (!isMounted()) return;

      const warningList = result.warnings ?? [];
      if (warningList.length > 0) {
        toast.warning('Reset complete with warnings', {
          description: warningList.join(' • '),
          duration: 10000,
        });
      } else {
        toast.success('WiseHire user fully reset', {
          description: `Deleted from Appwrite${result.kinde_deleted ? ' & legacy identity provider' : ''}, ${result.invite_tokens_reset} invite token(s) revoked.`,
          duration: 7000,
        });
      }
      setShowResetDialog(false);
      onUserDeleted?.(user.user_id);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reset user');
    } finally {
      if (isMounted()) setResettingUser(false);
    }
  };

  const handleLoadResumeDetail = async (resumeId: string) => {
    setResumeDetailLoading(true);
    try {
      const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: { action: 'get-resume-detail', target_user_id: user.user_id, resume_id: resumeId },
      });
      const result = unwrapAdminResponse<{ resume?: ResumeDetail }>(tuple, 'admin-devkit-data');
      if (!isMounted()) return;
      setSelectedResume(result.resume ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load resume');
    } finally {
      if (isMounted()) setResumeDetailLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-card border-l border-border shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${user.account_type === 'hr' ? 'bg-[#1D4ED8]/10 text-[#1D4ED8] dark:text-blue-400' : 'bg-primary/10 text-primary'}`}>
              {getInitials(user)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{user.full_name || 'No name'}</p>
              <p className="text-xs text-muted-foreground truncate font-mono">{user.email}</p>
              <div className="mt-1">
                <AccountTypeBadge accountType={user.account_type} />
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Drawer Tabs */}
        <div className="flex gap-1 p-2 border-b border-border shrink-0">
          <button
            onClick={() => setDrawerTab('actions')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${drawerTab === 'actions' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
          >
            Actions
          </button>
          <button
            onClick={() => setDrawerTab('activity')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${drawerTab === 'activity' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
          >
            <Activity className="w-3.5 h-3.5" />
            Activity
          </button>
          <button
            onClick={() => setDrawerTab('content')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${drawerTab === 'content' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
          >
            <FileText className="w-3.5 h-3.5" />
            Content
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* === ACTIVITY TAB === */}
          {drawerTab === 'activity' && (
            <div className="space-y-4">
              {/* Account summary */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  Account Summary
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Signed up</span>
                  <span className="text-xs">{formatDate(user.created_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Last active</span>
                  <span className="text-xs">{formatDate(user.last_sign_in_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Provider</span>
                  <span className="text-xs">
                    {identityData?.kinde_sub ? 'Kinde (SSO)' : 'Email / password'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Email confirmed</span>
                  <span className={`text-xs ${user.email_confirmed_at ? 'text-green-600 dark:text-green-400' : 'text-amber-500'}`}>
                    {user.email_confirmed_at ? formatDate(user.email_confirmed_at) : 'Not confirmed'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Plan</span>
                  <span className="text-xs capitalize">{user.plan_name}{user.trial_plan ? ` (trial ${user.trial_plan})` : ''}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Account type</span>
                  <span className="text-xs capitalize">{user.account_type ?? 'job_seeker'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Suspended</span>
                  <span className={`text-xs ${user.is_suspended ? 'text-destructive font-medium' : ''}`}>{user.is_suspended ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">AI credits today</span>
                  <span className="text-xs">
                    {user.credits_used_today} / {user.daily_limit === -1 ? 'unlimited' : (user.daily_limit ?? '—')}
                  </span>
                </div>
              </div>

              {/* Content stats */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                <h3 className="text-sm font-semibold mb-3">Content &amp; Usage</h3>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Resumes</span>
                  <span className="text-xs">{contentStats?.resumeCount ?? user.resume_count ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Cover letters</span>
                  <span className="text-xs">{contentStats?.coverLetterCount !== null && contentStats?.coverLetterCount !== undefined ? contentStats.coverLetterCount : '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Portfolio</span>
                  <span className="text-xs">
                    {contentStats === null
                      ? '—'
                      : contentStats.hasPortfolio
                      ? `${contentStats.portfolioUsername ?? 'set'}${contentStats.portfolioEnabled ? ' (live)' : ' (hidden)'}`
                      : 'None'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Short links</span>
                  <span className="text-xs">{user.link_count ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">AI calls (30d)</span>
                  <span className="text-xs">{contentStats?.aiCredits30d !== null && contentStats?.aiCredits30d !== undefined ? contentStats.aiCredits30d : '—'}</span>
                </div>
              </div>

              {/* Onboarding funnel milestones */}
              {(() => {
                const eventTypes = new Set(activityEvents.map(e => e.event_type));
                const milestones = [
                  { label: 'Signed up', done: true },
                  { label: 'Email confirmed', done: !!user.email_confirmed_at },
                  { label: 'Created first resume', done: (contentStats?.resumeCount ?? user.resume_count ?? 0) > 0 },
                  { label: 'Used AI feature', done: [...eventTypes].some(t => t.startsWith('ai_')) || (contentStats?.aiCredits30d ?? 0) > 0 },
                  { label: 'Published portfolio', done: contentStats?.hasPortfolio === true },
                  { label: 'Upgraded plan', done: user.plan_name !== 'free' || (contentStats?.planHistory?.some(h => h.action === 'plan_change') ?? false) },
                ];
                return (
                  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                    <h3 className="text-sm font-semibold mb-3">Onboarding Progress</h3>
                    {milestones.map(m => (
                      <div key={m.label} className="flex items-center gap-2.5">
                        <span className={`inline-flex w-4 h-4 rounded-full shrink-0 items-center justify-center text-[10px] font-bold ${m.done ? 'bg-green-500 text-white' : 'bg-muted border border-border text-muted-foreground'}`}>
                          {m.done ? '✓' : ''}
                        </span>
                        <span className={`text-xs ${m.done ? 'text-foreground' : 'text-muted-foreground'}`}>{m.label}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Plan history */}
              {contentStats?.planHistory && contentStats.planHistory.length > 0 && (
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                  <h3 className="text-sm font-semibold mb-3">Plan History</h3>
                  {contentStats.planHistory.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs capitalize text-foreground">
                        {entry.action === 'plan_change' ? `Plan → ${String(entry.metadata?.new_plan ?? '?')}` : entry.action}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{formatDate(entry.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Usage events */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Activity className="w-4 h-4 text-primary" />
                    Recent Events
                    {activityEvents.length > 0 && (
                      <span className="text-xs font-normal text-muted-foreground">({activityEvents.length})</span>
                    )}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3 h-3 text-muted-foreground" />
                    <select
                      value={activityEventTypeFilter}
                      onChange={e => setActivityEventTypeFilter(e.target.value)}
                      className="text-[10px] bg-background border border-border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="all">All types</option>
                      {[...new Set(activityEvents.map(e => e.event_type))].sort().map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {activityLoading && (
                  <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading activity…</span>
                  </div>
                )}

                {activityError && (
                  <DevKitErrorCard
                    error={activityError}
                    title="Failed to load activity"
                    compact
                    context={{ panel: 'User Detail · Activity', function: 'admin-devkit-data', action: 'live-activity / usage_events' }}
                  />
                )}

                {!activityLoading && !activityError && activityEvents.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    <Activity className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No events recorded for this user.</p>
                    <p className="text-xs mt-1 opacity-60">Events are logged as users interact with the app.</p>
                  </div>
                )}

                {!activityLoading && activityEvents.length > 0 && (
                  <div className="rounded-xl border border-border overflow-hidden">
                    {activityEvents
                      .filter(e => activityEventTypeFilter === 'all' || e.event_type === activityEventTypeFilter)
                      .map(event => (
                        <div key={event.id} className="px-3 py-2 border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium font-mono truncate text-foreground">{event.event_type}</p>
                              {Object.keys(event.metadata ?? {}).length > 0 && (
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {Object.entries(event.metadata).slice(0, 3).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}
                                </p>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{formatDate(event.created_at)}</span>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === CONTENT TAB === */}
          {drawerTab === 'content' && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="w-4 h-4 text-primary" />
                Resumes ({resumes.length})
              </h3>

              {resumesLoading && (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-10 rounded-lg bg-muted/50 animate-pulse" />)}
                </div>
              )}

              {!resumesLoading && resumes.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">No resumes found for this user.</p>
              )}

              {!resumesLoading && resumes.length > 0 && (
                <div className="rounded-xl border border-border overflow-hidden">
                  {resumes.map((resume) => (
                    <button
                      key={resume.id}
                      onClick={() => handleLoadResumeDetail(resume.id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 border-b border-border last:border-0 hover:bg-muted/30 transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{resume.title || 'Untitled Resume'}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Template: {resume.template_id ?? '—'} · Updated {formatDate(resume.updated_at)}
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              )}

              {/* Resume JSON Detail side sheet */}
              {selectedResume && (
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border">
                    <p className="text-xs font-medium">{selectedResume.title || 'Untitled Resume'}</p>
                    <button
                      onClick={() => setSelectedResume(null)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="p-3 max-h-80 overflow-y-auto">
                    <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap break-words font-mono">
                      {JSON.stringify(selectedResume.content, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {resumeDetailLoading && (
                <div className="h-32 rounded-lg bg-muted/50 animate-pulse" />
              )}
            </div>
          )}

          {/* === ACTIONS TAB === */}
          {drawerTab === 'actions' && (
            <>
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

              {/* Identity Section */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Fingerprint className="w-4 h-4 text-indigo-500" />
                  Identity
                  {user.has_id_conflict && (
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400 ml-1">
                      ID conflict
                    </Badge>
                  )}
                </h3>

                {user.has_id_conflict && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Identity collision detected</p>
                      <p className="opacity-80 mt-0.5">This is a Kinde shadow account. The real email ({user.contact_email || identityData?.contact_email || '…'}) belongs to an orphaned legacy account. Use "Fix identity" below to merge them.</p>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                  {/* Real Kinde email — shown when available or when lookup was attempted */}
                  {(identityLoading || identityData?.kinde_email || (identityData?.kinde_email_status && identityData.kinde_email_status !== 'not_needed')) && (
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs text-muted-foreground font-medium shrink-0">Kinde email</span>
                      {identityLoading ? (
                        <span className="font-mono text-[10px] text-right break-all">…</span>
                      ) : identityData?.kinde_email ? (
                        <span className="font-mono text-[10px] text-right break-all">{identityData.kinde_email}</span>
                      ) : identityData?.kinde_email_status === 'lookup_failed' ? (
                        <span className="text-[10px] text-right text-destructive italic">Lookup failed — check M2M credentials</span>
                      ) : identityData?.kinde_email_status === 'credentials_missing' ? (
                        <span className="text-[10px] text-right text-muted-foreground italic">M2M credentials not configured</span>
                      ) : null}
                    </div>
                  )}
                  {/* Contact email (from profiles.contact_email) */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground font-medium shrink-0">Contact email</span>
                    <span className="font-mono text-[10px] text-right break-all">
                      {identityLoading ? '…' : (identityData?.contact_email ?? user.contact_email ?? '—')}
                    </span>
                  </div>
                  {/* Auth email (internal Appwrite Auth record — may be a placeholder) */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs text-muted-foreground font-medium shrink-0">Auth email (internal)</span>
                    <span className="font-mono text-[10px] text-right break-all">
                      {identityLoading ? '…' : (identityData?.auth_email ?? user.email ?? '—')}
                      {(identityData?.auth_email ?? user.email ?? '').endsWith('@kinde.placeholder') && (
                        <span className="ml-1 text-amber-600">(placeholder)</span>
                      )}
                    </span>
                  </div>
                  {/* Sign-up date */}
                  {(identityLoading || identityData?.signed_up_at) && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground font-medium shrink-0">Joined</span>
                      <span className="text-[10px] text-muted-foreground">
                        {identityLoading ? '…' : (identityData?.signed_up_at ? formatDate(identityData.signed_up_at) : '—')}
                      </span>
                    </div>
                  )}
                  {/* Last sign-in */}
                  {(identityLoading || identityData?.last_sign_in_at) && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground font-medium shrink-0">Last sign-in</span>
                      <span className="text-[10px] text-muted-foreground">
                        {identityLoading ? '…' : (identityData?.last_sign_in_at ? formatDate(identityData.last_sign_in_at) : '—')}
                      </span>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs text-muted-foreground font-medium shrink-0">Kinde sub</span>
                    <span className="font-mono text-[10px] text-right break-all max-w-[200px] truncate" title={identityData?.kinde_sub ?? ''}>
                      {identityLoading ? '…' : (identityData?.kinde_sub ?? '—')}
                    </span>
                  </div>
                  {identityData?.last_exchange_at && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground font-medium shrink-0">Last token exchange</span>
                      <span className="text-[10px] text-muted-foreground">{formatDate(identityData.last_exchange_at)}</span>
                    </div>
                  )}
                </div>

                {/* Fix identity action — only for collision users */}
                {(user.has_id_conflict || identityData?.is_collision) && (
                  <div className="space-y-2">
                    {!showMergeConfirm ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMergeConfirm(true)}
                        className="w-full h-8 text-xs flex items-center gap-2 border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
                      >
                        <Merge className="w-3.5 h-3.5" />
                        Fix identity…
                      </Button>
                    ) : (
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-3">
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Confirm identity merge</p>
                        <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                          This will:
                          <br />• Copy the orphan account's plan and profile fields into this account (if better)
                          <br />• Suspend the orphan account with reason <span className="font-mono">merged_into:{user.user_id.slice(0, 8)}…</span>
                          <br />• Write an audit log entry
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleMergeIdentity}
                            disabled={mergingIdentity}
                            className="flex-1 h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            {mergingIdentity ? 'Merging…' : 'Confirm merge'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowMergeConfirm(false)}
                            disabled={mergingIdentity}
                            className="h-7 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Danger Zone: Session Revoke + Delete Account */}
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-destructive">
                  <AlertTriangle className="w-4 h-4" />
                  Danger Zone
                </h3>
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium">Revoke all sessions</p>
                      <p className="text-[10px] text-muted-foreground">Signs the user out from all devices immediately.</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRevokeSessions}
                      disabled={revokingSessions}
                      className="h-7 text-xs shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="w-3 h-3 mr-1" />
                      {revokingSessions ? 'Revoking…' : 'Revoke'}
                    </Button>
                  </div>
                  <div className="border-t border-destructive/10 pt-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium">Delete account</p>
                      <p className="text-[10px] text-muted-foreground">Permanently removes this user and all their data.</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setShowDeleteDialog(true); setDeleteEmailConfirm(''); }}
                      className="h-7 text-xs shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10"
                    >
                      <UserX className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>

                  {/* WiseHire full reset — only shown for HR accounts */}
                  {user.account_type === 'hr' && (
                    <div className="border-t border-blue-500/20 pt-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Reset for Testing</p>
                        <p className="text-[10px] text-muted-foreground">
	                          Removes Appwrite account data and revokes invite token. WiseHire only.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setShowResetDialog(true); setResetConfirmText(''); }}
                        className="h-7 text-xs shrink-0 border-blue-500/30 text-blue-700 hover:bg-blue-500/10 dark:text-blue-400"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Reset
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Edit Profile */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <UserPen className="w-4 h-4 text-rose-500" />
                  Edit Profile
                </h3>

                {usernameChangedOldValue !== null && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      The old portfolio URL <span className="font-mono">resume.thewise.cloud/p/{usernameChangedOldValue}</span> will no longer work. The user has been sent an in-app notification about this change.
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
                    disabled={savingProfile}
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
                    <Button onClick={handleSetPlan} disabled={savingPlan || impersonating} size="sm" className="w-full mt-1" title={impersonating ? 'Unavailable during impersonation' : undefined}>
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
                        <Button variant="outline" size="sm" onClick={handleRevokeTrial} disabled={revokingTrial || impersonating} className="mt-2 h-6 text-[10px] text-destructive border-destructive/30" title={impersonating ? 'Unavailable during impersonation' : undefined}>
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
                    <Button onClick={handleGrantTrial} disabled={savingTrial || impersonating} size="sm" className="w-full" title={impersonating ? 'Unavailable during impersonation' : undefined}>
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
                    <Button variant="outline" size="sm" onClick={handleToggleSuspend} disabled={savingSuspend || impersonating} className="h-7 text-xs" title={impersonating ? 'Unavailable during impersonation' : undefined}>
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
                      disabled={savingSuspend || impersonating}
                      className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 w-full"
                      title={impersonating ? 'Unavailable during impersonation' : undefined}
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
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs flex-1">{note.note_text}</p>
                          {confirmDeleteNoteId === note.id ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] text-destructive">Delete?</span>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                disabled={deletingNoteId === note.id}
                                className="text-[10px] text-destructive font-semibold hover:underline disabled:opacity-50"
                              >
                                {deletingNoteId === note.id ? '…' : 'Yes'}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteNoteId(null)}
                                className="text-[10px] text-muted-foreground hover:text-foreground"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteNoteId(note.id)}
                              className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                              title="Delete note"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{formatDate(note.created_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* WiseHire full test reset confirmation dialog */}
      {showResetDialog && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Reset WiseHire user for testing</h3>
                <p className="text-xs text-muted-foreground mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-400 space-y-1.5">
              <p className="font-semibold">This will:</p>
              <ul className="list-disc list-inside space-y-0.5 pl-1 opacity-90">
	                <li>Delete <strong>{user.email}</strong> from Appwrite and related app data</li>
	                <li>Clear legacy identity-provider references when present</li>
                <li>Revoke &amp; un-mark all WiseHire invite tokens for this email</li>
                <li>Write an audit log entry (<code className="font-mono text-[10px]">wisehire_test_reset</code>)</li>
              </ul>
              <p className="pt-0.5 opacity-80">
                If Kinde M2M credentials are not configured, a warning will be shown and you must delete the Kinde user manually.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Type <span className="font-mono text-foreground">RESET</span> to confirm
              </label>
              <Input
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="RESET"
                className="h-9 text-xs font-mono"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && resetConfirmText === 'RESET') handleResetUser(); }}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowResetDialog(false); setResetConfirmText(''); }}
                className="flex-1"
                disabled={resettingUser}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleResetUser}
                disabled={resettingUser || resetConfirmText !== 'RESET' || impersonating}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                title={impersonating ? 'Unavailable during impersonation' : undefined}
              >
                {resettingUser ? 'Resetting…' : 'Reset user'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete user confirmation dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <UserX className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Delete account permanently</h3>
                <p className="text-xs text-muted-foreground mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              <p>This will permanently delete <strong>{user.email}</strong> and all their data including resumes, notes, and audit log entries.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Type <span className="font-mono text-foreground">{user.email}</span> to confirm
              </label>
              <Input
                value={deleteEmailConfirm}
                onChange={(e) => setDeleteEmailConfirm(e.target.value)}
                placeholder={user.email}
                className="h-9 text-xs font-mono"
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowDeleteDialog(false); setDeleteEmailConfirm(''); }}
                className="flex-1"
                disabled={deletingUser}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteUser}
                disabled={deletingUser || deleteEmailConfirm !== user.email || impersonating}
                className="flex-1"
                title={impersonating ? 'Unavailable during impersonation' : undefined}
              >
                {deletingUser ? 'Deleting…' : 'Delete account'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
