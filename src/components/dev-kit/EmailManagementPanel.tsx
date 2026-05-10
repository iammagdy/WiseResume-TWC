import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Mail,
  RefreshCw,
  Search,
  Send,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { getDevKitToken } from '@/contexts/DevKitSessionContext';
import type { AdminUser } from './AdminUsersPanel';
import { useIsMounted } from '@/lib/devkit/hooks';
import { unwrapAdminResponse, tryUnwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { DevKitErrorCard } from './DevKitErrorCard';

type EmailAction = 'resend_confirmation' | 'send_magic_link' | 'send_otp' | 'send_password_reset' | 'send_custom' | 'wisehire_invite';

const ACTION_LABELS: Record<EmailAction, string> = {
  resend_confirmation: 'Resend Confirmation Email',
  send_magic_link: 'Send Magic Link',
  send_otp: 'Send OTP / Verification Code',
  send_password_reset: 'Send Password Reset',
  send_custom: 'Send Custom Email',
  wisehire_invite: 'Send WiseHire Invite',
};

const ACTION_DESCRIPTIONS: Record<EmailAction, string> = {
  resend_confirmation: 'Sends a new confirmation link to complete email verification.',
  send_magic_link: 'Sends a passwordless sign-in link that logs the user in directly.',
  send_otp: 'Sends a one-time verification code for reauthentication.',
  send_password_reset: 'Sends a link to reset the user\'s password.',
  send_custom: 'Compose and send a one-off custom email to this user via Resend.',
  wisehire_invite: 'Generates a signed 72-hour invite link and sends a WiseHire-branded email. The invite URL is shown after sending.',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface UnconfirmedUsersProps {
  onSendToUser: (user: AdminUser) => void;
}

const UNCONFIRMED_PER_PAGE = 100;

function UnconfirmedUsersSection({ onSendToUser }: UnconfirmedUsersProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);

  const isMounted = useIsMounted();

  const fetchUnconfirmed = useCallback(async (pageNum = 1, append = false) => {
    setLoading(true);
    if (!append) setError(null);
    try {
      const tuple = await appwriteFunctions.invoke('admin-list-users', {
        headers: devKitAuthHeaders(),
        body: { page: pageNum,
          per_page: UNCONFIRMED_PER_PAGE,
          filter_unconfirmed: true,
          sort: 'newest',
        },
      });
      const result = unwrapAdminResponse<{ users?: AdminUser[]; total?: number }>(tuple, 'admin-list-users');
      if (!isMounted()) return;
      const list = result.users ?? [];
      const tot = result.total ?? list.length;
      if (append) {
        setUsers(prev => [...prev, ...list]);
      } else {
        setUsers(list);
      }
      setTotal(tot);
      setLoaded(true);
    } catch (e) {
      if (!isMounted()) return;
      setError(formatEdgeError(e, 'Failed to load unconfirmed users'));
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    setPage(1);
    fetchUnconfirmed(1, false);
  }, [fetchUnconfirmed]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchUnconfirmed(nextPage, true);
  };

  const handleResendConfirmation = async (user: AdminUser) => {
    setSendingId(user.user_id);
    // For Kinde shadow/collision rows the auth email is a non-deliverable
    // placeholder (kp_xxx@collision.kinde.placeholder). Fall back to
    // contact_email so the confirmation reaches the real inbox.
    const isKindeShadow = (user.email ?? '').endsWith('@collision.kinde.placeholder');
    const resolvedEmail = isKindeShadow
      ? (user.contact_email ?? user.email)
      : user.email;
    try {
      const tuple = await appwriteFunctions.invoke('admin-email', {
        headers: devKitAuthHeaders(),
        body: { module: 'email-actions', action: 'resend_confirmation',
          target_user_id: user.user_id,
          target_email: resolvedEmail,
        },
      });
      const result = unwrapAdminResponse<{ message_id?: string }>(tuple, 'admin-email');
      if (result.message_id) {
        toast.success('Confirmation email accepted by Resend', {
          description: `ID: ${result.message_id} → ${resolvedEmail}. Delivery requires thewise.cloud to be verified in Resend.`,
        });
      } else {
        toast.warning('Email submitted but delivery unconfirmed', {
          description: `No message ID returned for ${resolvedEmail}. The sending domain (thewise.cloud) may not be verified in Resend — check your Resend dashboard.`,
        });
      }
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to send confirmation email'));
    } finally {
      if (isMounted()) setSendingId(null);
    }
  };

  const filtered = query.trim()
    ? users.filter(u =>
        u.email.toLowerCase().includes(query.trim().toLowerCase()) ||
        (u.full_name ?? '').toLowerCase().includes(query.trim().toLowerCase())
      )
    : users;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Unconfirmed Users
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Users who have not yet confirmed their email address.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setPage(1); fetchUnconfirmed(1, false); }}
          disabled={loading}
          className="h-8 flex items-center gap-1.5 text-xs shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          className="pl-8 h-8 text-xs"
          placeholder="Filter by email or name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && (
        <DevKitErrorCard
          error={error}
          title="Couldn't load email management"
          context={{ panel: 'Email Management', function: 'admin-email' }}
        />
      )}

      {loading && !loaded && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
      )}

      {loaded && (
        <>
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {users.length === 0
                ? <><CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-60" />All users have confirmed their email</>
                : 'No users match your filter'}
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">User</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden sm:table-cell">Joined</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((user) => (
                      <tr key={user.user_id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          {(() => {
                            const isKindeShadow = (user.email ?? '').endsWith('@collision.kinde.placeholder');
                            const displayEmail = isKindeShadow ? (user.contact_email ?? user.email) : user.email;
                            return (
                              <>
                                <p className="font-mono text-xs truncate max-w-[200px]">{displayEmail}</p>
                                {user.full_name && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{user.full_name}</p>
                                )}
                                {isKindeShadow && user.contact_email && (
                                  <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">
                                    Auth: {user.email}
                                  </p>
                                )}
                                {isKindeShadow && !user.contact_email && (
                                  <p className="text-[10px] text-amber-600 dark:text-amber-400">
                                    Unidentified · Kinde shadow
                                  </p>
                                )}
                              </>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={sendingId === user.user_id}
                              onClick={() => handleResendConfirmation(user)}
                            >
                              {sendingId === user.user_id ? (
                                <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Sending…</>
                              ) : (
                                'Resend Confirmation'
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-muted-foreground"
                              onClick={() => onSendToUser(user)}
                            >
                              Send Email
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {users.length} of {total} unconfirmed user{total !== 1 ? 's' : ''}
                {query.trim() ? ` · ${filtered.length} visible after filter` : ''}
              </p>
              {users.length < total && !query.trim() && (
                <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={loading} className="h-7 text-xs">
                  {loading ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Loading…</> : `Load more (${total - users.length} remaining)`}
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface ComposeEmailFormProps {
  prefillUser?: AdminUser | null;
  defaultSubject?: string;
  allowActionSelect?: boolean;
  bodyPlaceholder?: string;
  bodyRows?: number;
  sectionTitle?: string;
  sectionDescription?: string;
}

function ComposeEmailForm({
  prefillUser,
  defaultSubject = '',
  allowActionSelect = false,
  bodyPlaceholder = 'Email body (plain text)…',
  bodyRows = 5,
  sectionTitle,
  sectionDescription,
}: ComposeEmailFormProps) {
  const [emailSearch, setEmailSearch] = useState(prefillUser?.email ?? '');
  const [searchResults, setSearchResults] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(prefillUser ?? null);
  const [searching, setSearching] = useState(false);
  const [action, setAction] = useState<EmailAction>(allowActionSelect ? 'send_magic_link' : 'send_custom');
  const [sending, setSending] = useState(false);
  const [customSubject, setCustomSubject] = useState(defaultSubject);
  const [customBody, setCustomBody] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (prefillUser) {
      setSelectedUser(prefillUser);
      setEmailSearch(prefillUser.email);
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [prefillUser]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const handleSearch = useCallback((q: string) => {
    setEmailSearch(q);
    setSelectedUser(null);
    if (!q.trim() || q.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      if (!isMounted()) return;
      setSearching(true);
      try {
        const tuple = await appwriteFunctions.invoke('admin-list-users', {
          headers: devKitAuthHeaders(),
          body: { page: 1,
            per_page: 10,
            search: q.trim(),
            sort: 'newest',
          },
        });
        const result = tryUnwrapAdminResponse<{ users?: AdminUser[] }>(tuple, 'admin-list-users');
        if (!isMounted()) return;
        setSearchResults(result?.users ?? []);
        setShowDropdown(true);
      } catch {
        if (!isMounted()) return;
        setSearchResults([]);
      } finally {
        if (isMounted()) setSearching(false);
      }
    }, 350);
    // The debounced callback intentionally captures only the stable refs
    // (searchDebounceRef + isMounted); widening the dep array would
    // recreate the callback — and reset the debounce timer — on every
    // unrelated render that flips a piece of parent state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectUser = (user: AdminUser) => {
    setSelectedUser(user);
    setEmailSearch(user.email);
    setSearchResults([]);
    setShowDropdown(false);
  };

  const isCustomMode = action === 'send_custom';
  const isWiseHireInvite = action === 'wisehire_invite';

  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const handleCopyInvite = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!selectedUser && !emailSearch.trim()) {
      toast.error('Please select a user or enter an email address');
      return;
    }
    if (isCustomMode && (!customSubject.trim() || !customBody.trim())) {
      toast.error('Subject and body are required for custom emails');
      return;
    }

    setSending(true);
    setInviteUrl(null);
    try {
      // Resolve the deliverable email for the selected user: for Kinde shadow/
      // collision rows the auth email is a non-deliverable placeholder, so fall
      // back to contact_email which holds the real address.
      const resolvedUserEmail = selectedUser
        ? ((selectedUser.email ?? '').endsWith('@collision.kinde.placeholder')
            ? (selectedUser.contact_email ?? selectedUser.email)
            : selectedUser.email)
        : null;
      const recipientEmail = resolvedUserEmail ?? emailSearch.trim();

      if (isWiseHireInvite) {
        const tuple = await appwriteFunctions.invoke('admin-wisehire-invite', {
          headers: devKitAuthHeaders(),
          body: { recipient_email: recipientEmail },
        });
        const result = unwrapAdminResponse<{ invite_url?: string; expires_at?: string }>(tuple, 'admin-wisehire-invite');
        if (!isMounted()) return;
        toast.success(`WiseHire invite sent to ${recipientEmail}`);
        setInviteUrl(result.invite_url ?? null);
        return;
      }

      const body: Record<string, unknown> = {
        module: 'email-actions',
        action,
        ...(selectedUser
          ? { target_user_id: selectedUser.user_id, target_email: recipientEmail }
          : { target_email: emailSearch.trim() }),
      };
      if (isCustomMode) {
        body.custom_subject = customSubject.trim();
        body.custom_body = customBody.trim();
      }

      const tuple = await appwriteFunctions.invoke('admin-email', { headers: devKitAuthHeaders(), body });
      const result = unwrapAdminResponse<{ email?: string; message_id?: string }>(tuple, 'admin-email');
      if (!isMounted()) return;

      const toEmail = result.email ?? selectedUser?.email ?? emailSearch.trim();
      if (result.message_id) {
        toast.success(`${ACTION_LABELS[action]} accepted by Resend`, {
          description: `ID: ${result.message_id} → ${toEmail}. Delivery requires thewise.cloud to be verified in Resend.`,
        });
      } else {
        toast.warning('Email submitted but delivery unconfirmed', {
          description: `No message ID returned for ${toEmail}. The sending domain (thewise.cloud) may not be verified in Resend — check your Resend dashboard.`,
        });
      }

      if (isCustomMode) {
        setCustomSubject(defaultSubject);
        setCustomBody('');
      }
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to send email'));
    } finally {
      if (isMounted()) setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {(sectionTitle || sectionDescription) && (
        <div>
          {sectionTitle && (
            <h3 className="font-semibold text-sm flex items-center gap-2">
              {allowActionSelect
                ? <Send className="w-4 h-4 text-primary" />
                : <Mail className="w-4 h-4 text-primary" />}
              {sectionTitle}
            </h3>
          )}
          {sectionDescription && (
            <p className="text-xs text-muted-foreground mt-0.5">{sectionDescription}</p>
          )}
        </div>
      )}

      <div className={allowActionSelect ? 'grid gap-3 sm:grid-cols-2' : 'space-y-3'}>
        {/* User search */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {allowActionSelect ? 'User (search by email or name)' : 'Recipient'}
          </label>
          <div className="relative">
            <div className="relative">
              {searching ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              )}
              <Input
                className="pl-8 text-sm"
                placeholder={allowActionSelect ? 'Search email or name…' : 'Search user or enter email…'}
                value={emailSearch}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              />
            </div>
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-20 overflow-hidden">
                {searchResults.map((u) => (
                  <button
                    key={u.user_id}
                    className="w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors border-b border-border last:border-0"
                    onMouseDown={() => handleSelectUser(u)}
                  >
                    <p className="text-xs font-mono truncate">{u.email}</p>
                    {u.full_name && <p className="text-[11px] text-muted-foreground truncate">{u.full_name}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedUser && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-primary/5 border border-primary/20">
              <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-xs text-primary font-mono truncate">{selectedUser.email}</span>
              {!allowActionSelect && selectedUser.full_name && (
                <span className="text-xs text-muted-foreground">· {selectedUser.full_name}</span>
              )}
            </div>
          )}
        </div>

        {/* Action selector (only in multi-action mode) */}
        {allowActionSelect && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Action</label>
            <div className="relative">
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as EmailAction)}
                className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 pr-8 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {(Object.keys(ACTION_LABELS) as EmailAction[]).map((a) => (
                  <option key={a} value={a}>{ACTION_LABELS[a]}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-muted-foreground" />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{ACTION_DESCRIPTIONS[action]}</p>
          </div>
        )}
      </div>

      {/* Custom email compose fields */}
      {isCustomMode && (
        <div className={`space-y-3 ${allowActionSelect ? 'p-3 rounded-lg bg-muted/30 border border-border' : ''}`}>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Subject</label>
            <Input
              placeholder="Email subject…"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Body</label>
            <Textarea
              placeholder={bodyPlaceholder}
              value={customBody}
              onChange={(e) => setCustomBody(e.target.value)}
              rows={bodyRows}
              className="text-sm resize-none"
            />
            {!allowActionSelect && (
              <p className="text-[11px] text-muted-foreground">
                The email will be sent using the WiseResume branded template. Plain text only — no HTML needed.
              </p>
            )}
          </div>
        </div>
      )}

      <Button
        onClick={handleSend}
        disabled={sending || (!selectedUser && !emailSearch.trim()) || (isCustomMode && (!customSubject.trim() || !customBody.trim()))}
        className="flex items-center gap-2"
        size="sm"
      >
        {sending ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
        ) : (
          <><Send className="w-4 h-4" />{ACTION_LABELS[action]}</>
        )}
      </Button>

      {inviteUrl && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1.5">
          <p className="text-xs font-medium text-primary">Invite link generated</p>
          <p className="text-xs font-mono break-all text-foreground">{inviteUrl}</p>
          <button
            onClick={handleCopyInvite}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {inviteCopied ? <CheckCircle className="w-3 h-3" /> : <Send className="w-3 h-3" />}
            {inviteCopied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      )}
    </div>
  );
}

interface RecentSendEntry {
  id: string;
  action: string;
  metadata: {
    target_email?: string;
    message_id?: string;
    custom_subject?: string;
    performed_by?: string;
    sent_at?: string;
  };
  created_at: string;
}

function RecentSendsSection() {
  const [entries, setEntries] = useState<RecentSendEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const isMounted = useIsMounted();

  const fetchRecentSends = useCallback(async () => {
    setLoading(true);
    try {
      const tuple = await appwriteFunctions.invoke('admin-audit-logs', {
        headers: devKitAuthHeaders(),
        body: { limit: 20, category_filter: 'admin_email' },
      });
      const result = unwrapAdminResponse<{ logs?: RecentSendEntry[] }>(tuple, 'admin-audit-logs');
      if (!isMounted()) return;
      const all = (result?.logs ?? []) as RecentSendEntry[];
      setEntries(all.filter(l => l.action?.startsWith('send') || l.action === 'resend_confirmation' || l.action?.startsWith('resend')));
      setLoaded(true);
    } catch (e) {
      if (!isMounted()) return;
      setLoaded(true);
      toast.error(formatEdgeError(e, 'Failed to load recent email sends'));
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    fetchRecentSends();
  }, [fetchRecentSends]);

  if (!loaded) return null;

  const actionLabel = (action: string) => {
    const labels: Record<string, string> = {
      resend_confirmation: 'Confirmation',
      send_magic_link: 'Magic Link',
      send_otp: 'OTP Code',
      send_password_reset: 'Password Reset',
      send_custom: 'Custom',
    };
    return labels[action] ?? action.replace(/_/g, ' ');
  };

  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          Recent Sends
        </h3>
        <Button variant="ghost" size="sm" onClick={fetchRecentSends} disabled={loading} className="h-7 text-xs text-muted-foreground">
          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Recipient</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Type</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden md:table-cell">Message ID</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Sent</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-mono truncate max-w-[180px]">{e.metadata?.target_email ?? '—'}</td>
                <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{actionLabel(e.action)}</td>
                <td className="px-3 py-2 text-muted-foreground font-mono truncate max-w-[120px] hidden md:table-cell">
                  {e.metadata?.message_id ? e.metadata.message_id.slice(0, 14) + '…' : '—'}
                </td>
                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatDate(e.metadata?.sent_at ?? e.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type DiagnoseResult = { resend_api_key_configured?: boolean; note?: string } | null;

export function EmailManagementPanel() {
  const [prefillUser, setPrefillUser] = useState<AdminUser | null>(null);
  const [diagnose, setDiagnose] = useState<DiagnoseResult>(null);
  const [diagnosing, setDiagnosing] = useState(true);
  const [domainWarningDismissed, setDomainWarningDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tuple = await appwriteFunctions.invoke('admin-email', {
          headers: devKitAuthHeaders(),
          body: { module: 'email-actions', action: 'diagnose' },
        });
        const result = tryUnwrapAdminResponse<NonNullable<DiagnoseResult>>(tuple, 'admin-email');
        if (!cancelled) setDiagnose(result ?? null);
      } catch {
        if (!cancelled) setDiagnose(null);
      } finally {
        if (!cancelled) setDiagnosing(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSendToUser = (user: AdminUser) => {
    setPrefillUser(user);
    setTimeout(() => {
      document.getElementById('email-send-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const apiKeyMissing = !diagnosing && diagnose !== null && diagnose.resend_api_key_configured === false;
  const apiKeyOk = !diagnosing && diagnose !== null && diagnose.resend_api_key_configured === true;

  return (
    <div className="space-y-8">
      {/* Preflight diagnostic banner */}
      {diagnosing ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Checking email configuration…
        </div>
      ) : apiKeyMissing ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-400/50 bg-red-50 dark:bg-red-950/30 px-3.5 py-3 text-red-800 dark:text-red-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="text-xs leading-relaxed">
            <strong>RESEND_API_KEY is not configured.</strong> Emails will fail to send. Add <code className="font-mono">RESEND_API_KEY</code> in Appwrite Console → Functions → <code className="font-mono">admin-email</code> → Variables, then redeploy the function.
          </div>
        </div>
      ) : (
        !domainWarningDismissed && (
          <div className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 ${apiKeyOk ? 'border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300' : 'border-muted bg-muted/30 text-muted-foreground'}`}>
            <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/></svg>
            <div className="text-xs leading-relaxed flex-1">
              {apiKeyOk
                ? <><strong>RESEND_API_KEY is set.</strong> Emails are sent from <code className="font-mono">noreply@thewise.cloud</code>. Delivery also requires the <strong>thewise.cloud</strong> domain to be verified in your <a href="https://resend.com/domains" target="_blank" rel="noreferrer" className="underline underline-offset-2">Resend dashboard</a>. Without verification, Resend accepts calls but does not deliver.</>
                : <>Email configuration could not be verified. Check that you are authenticated and the function is deployed.</>
              }
            </div>
            {apiKeyOk && (
              <button
                onClick={() => setDomainWarningDismissed(true)}
                className="ml-1 shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Dismiss"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>
              </button>
            )}
          </div>
        )
      )}

      <UnconfirmedUsersSection onSendToUser={handleSendToUser} />

      <div className="border-t border-border" />

      <div id="email-send-section">
        <ComposeEmailForm
          prefillUser={prefillUser}
          allowActionSelect={true}
          sectionTitle="Send Email to User"
          sectionDescription="Search for a user and choose an action to send them an email."
          bodyPlaceholder="Email body (plain text)…"
          bodyRows={5}
        />
      </div>

      <div className="border-t border-border" />

      <ComposeEmailForm
        allowActionSelect={false}
        sectionTitle="Custom Email Composer"
        sectionDescription="Compose and send a one-off email to any user using the WiseResume branded template."
        bodyPlaceholder="Email body (plain text, newlines preserved)…"
        bodyRows={6}
      />

      <div className="border-t border-border" />

      <RecentSendsSection />
    </div>
  );
}
