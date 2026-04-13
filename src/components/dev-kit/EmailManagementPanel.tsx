import { useState, useCallback, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { getDevKitToken } from '@/contexts/DevKitSessionContext';
import type { AdminUser } from './AdminUsersPanel';

type EmailAction = 'resend_confirmation' | 'send_magic_link' | 'send_otp' | 'send_password_reset' | 'send_custom';

const ACTION_LABELS: Record<EmailAction, string> = {
  resend_confirmation: 'Resend Confirmation Email',
  send_magic_link: 'Send Magic Link',
  send_otp: 'Send OTP / Verification Code',
  send_password_reset: 'Send Password Reset',
  send_custom: 'Send Custom Email',
};

const ACTION_DESCRIPTIONS: Record<EmailAction, string> = {
  resend_confirmation: 'Sends a new confirmation link to complete email verification.',
  send_magic_link: 'Sends a passwordless sign-in link that logs the user in directly.',
  send_otp: 'Sends a one-time verification code for reauthentication.',
  send_password_reset: 'Sends a link to reset the user\'s password.',
  send_custom: 'Compose and send a one-off custom email to this user via Resend.',
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

  const fetchUnconfirmed = useCallback(async (pageNum = 1, append = false) => {
    setLoading(true);
    if (!append) setError(null);
    try {
      const password = getDevKitToken();
      const { data, error: err } = await edgeFunctions.functions.invoke('admin-list-users', {
        body: {
          password,
          page: pageNum,
          per_page: UNCONFIRMED_PER_PAGE,
          filter_unconfirmed: true,
          sort: 'newest',
        },
      });
      if (err) throw new Error(err.message);
      const result = data as { users?: AdminUser[]; total?: number };
      const list = result?.users ?? [];
      const tot = result?.total ?? list.length;
      if (append) {
        setUsers(prev => [...prev, ...list]);
      } else {
        setUsers(list);
      }
      setTotal(tot);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load unconfirmed users');
    } finally {
      setLoading(false);
    }
  }, []);

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
    try {
      const password = getDevKitToken();
      const { data, error: err } = await edgeFunctions.functions.invoke('admin-email-actions', {
        body: {
          password,
          action: 'resend_confirmation',
          target_user_id: user.user_id,
          target_email: user.email,
        },
      });
      if (err) throw new Error(err.message);
      const result = data as { success?: boolean; error?: string; message_id?: string };
      if (result?.success === false) throw new Error(result.error ?? 'Unknown error');
      const msgId = result.message_id ? ` · ID: ${result.message_id}` : '';
      toast.success('Confirmation email sent', {
        description: `Accepted by Resend for ${user.email}${msgId}. Delivery requires thewise.cloud to be verified in Resend.`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send confirmation email');
    } finally {
      setSendingId(null);
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
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
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
                          <p className="font-mono text-xs truncate max-w-[200px]">{user.email}</p>
                          {user.full_name && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{user.full_name}</p>
                          )}
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

interface SendEmailFormProps {
  prefillUser?: AdminUser | null;
}

function SendEmailForm({ prefillUser }: SendEmailFormProps) {
  const [emailSearch, setEmailSearch] = useState(prefillUser?.email ?? '');
  const [searchResults, setSearchResults] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(prefillUser ?? null);
  const [searching, setSearching] = useState(false);
  const [action, setAction] = useState<EmailAction>('send_magic_link');
  const [sending, setSending] = useState(false);
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (prefillUser) {
      setSelectedUser(prefillUser);
      setEmailSearch(prefillUser.email);
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [prefillUser]);

  const handleSearch = useCallback(async (q: string) => {
    setEmailSearch(q);
    setSelectedUser(null);
    if (!q.trim() || q.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    try {
      const password = getDevKitToken();
      const { data, error: err } = await edgeFunctions.functions.invoke('admin-list-users', {
        body: {
          password,
          page: 1,
          per_page: 10,
          search: q.trim(),
          sort: 'newest',
        },
      });
      if (err) throw new Error(err.message);
      const result = data as { users?: AdminUser[] };
      setSearchResults(result?.users ?? []);
      setShowDropdown(true);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSelectUser = (user: AdminUser) => {
    setSelectedUser(user);
    setEmailSearch(user.email);
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleSend = async () => {
    if (!selectedUser && !emailSearch.trim()) {
      toast.error('Please select a user or enter an email address');
      return;
    }
    if (action === 'send_custom' && (!customSubject.trim() || !customBody.trim())) {
      toast.error('Subject and body are required for custom emails');
      return;
    }

    setSending(true);
    try {
      const password = getDevKitToken();
      const body: Record<string, unknown> = {
        password,
        action,
        ...(selectedUser
          ? { target_user_id: selectedUser.user_id, target_email: selectedUser.email }
          : { target_email: emailSearch.trim() }),
      };
      if (action === 'send_custom') {
        body.custom_subject = customSubject.trim();
        body.custom_body = customBody.trim();
      }

      const { data, error: err } = await edgeFunctions.functions.invoke('admin-email-actions', { body });
      if (err) throw new Error(err.message);
      const result = data as { success?: boolean; error?: string; email?: string; message_id?: string };
      if (result?.success === false) throw new Error(result.error ?? 'Unknown error');

      const msgIdNote = result.message_id ? ` · ID: ${result.message_id}` : '';
      toast.success(`${ACTION_LABELS[action]} sent`, {
        description: `Accepted by Resend for ${result.email ?? selectedUser?.email ?? emailSearch.trim()}${msgIdNote}. Note: delivery requires the sending domain (thewise.cloud) to be verified in Resend.`,
      });

      if (action === 'send_custom') {
        setCustomSubject('');
        setCustomBody('');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Send className="w-4 h-4 text-primary" />
          Send Email to User
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Search for a user and choose an action to send them an email.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">User (search by email or name)</label>
          <div className="relative">
            <div className="relative">
              {searching ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              )}
              <Input
                className="pl-8 text-sm"
                placeholder="Search email or name…"
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
            </div>
          )}
        </div>

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
      </div>

      {action === 'send_custom' && (
        <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border">
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
              placeholder="Email body (plain text)…"
              value={customBody}
              onChange={(e) => setCustomBody(e.target.value)}
              rows={5}
              className="text-sm resize-none"
            />
          </div>
        </div>
      )}

      <Button
        onClick={handleSend}
        disabled={sending || (!selectedUser && !emailSearch.trim())}
        className="flex items-center gap-2"
        size="sm"
      >
        {sending ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
        ) : (
          <><Send className="w-4 h-4" />{ACTION_LABELS[action]}</>
        )}
      </Button>
    </div>
  );
}

function CustomBroadcastSection() {
  const [targetEmail, setTargetEmail] = useState('');
  const [searchResults, setSearchResults] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const handleSearch = useCallback(async (q: string) => {
    setTargetEmail(q);
    setSelectedUser(null);
    if (!q.trim() || q.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    try {
      const password = getDevKitToken();
      const { data, error: err } = await edgeFunctions.functions.invoke('admin-list-users', {
        body: { password, page: 1, per_page: 10, search: q.trim(), sort: 'newest' },
      });
      if (err) throw new Error(err.message);
      const result = data as { users?: AdminUser[] };
      setSearchResults(result?.users ?? []);
      setShowDropdown(true);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSelectUser = (user: AdminUser) => {
    setSelectedUser(user);
    setTargetEmail(user.email);
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleSend = async () => {
    if (!targetEmail.trim()) {
      toast.error('Please enter or select a recipient');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and body are required');
      return;
    }

    setSending(true);
    try {
      const password = getDevKitToken();
      const reqBody: Record<string, unknown> = {
        password,
        action: 'send_custom',
        custom_subject: subject.trim(),
        custom_body: body.trim(),
        ...(selectedUser
          ? { target_user_id: selectedUser.user_id, target_email: selectedUser.email }
          : { target_email: targetEmail.trim() }),
      };

      const { data, error: err } = await edgeFunctions.functions.invoke('admin-email-actions', { body: reqBody });
      if (err) throw new Error(err.message);
      const result = data as { success?: boolean; error?: string; email?: string };
      if (result?.success === false) throw new Error(result.error ?? 'Unknown error');

      toast.success('Custom email sent', {
        description: `Delivered to ${result.email ?? targetEmail.trim()}`,
      });
      setSubject('');
      setBody('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          Custom Email Composer
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Compose and send a one-off email to any user using the WiseResume branded template.
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Recipient</label>
          <div className="relative">
            <div className="relative">
              {searching ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              )}
              <Input
                className="pl-8 text-sm"
                placeholder="Search user or enter email…"
                value={targetEmail}
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
              {selectedUser.full_name && (
                <span className="text-xs text-muted-foreground">· {selectedUser.full_name}</span>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Subject</label>
          <Input
            placeholder="Email subject…"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Body</label>
          <Textarea
            placeholder="Email body (plain text, newlines preserved)…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="text-sm resize-none"
          />
          <p className="text-[11px] text-muted-foreground">
            The email will be sent using the WiseResume branded template. Plain text only — no HTML needed.
          </p>
        </div>

        <Button
          onClick={handleSend}
          disabled={sending || !targetEmail.trim() || !subject.trim() || !body.trim()}
          className="flex items-center gap-2"
          size="sm"
        >
          {sending ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
          ) : (
            <><Send className="w-4 h-4" />Send Email</>
          )}
        </Button>
      </div>
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

  const fetchRecentSends = useCallback(async () => {
    setLoading(true);
    try {
      const password = getDevKitToken();
      const { data, error: err } = await edgeFunctions.functions.invoke('admin-audit-logs', {
        body: { password, limit: 20, category_filter: 'admin_email' },
      });
      if (err) throw new Error(err.message);
      const result = data as { logs?: RecentSendEntry[] };
      const all = (result?.logs ?? []) as RecentSendEntry[];
      setEntries(all.filter(l => l.action?.startsWith('send') || l.action === 'resend_confirmation' || l.action?.startsWith('resend')));
      setLoaded(true);
    } catch {
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, []);

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

export function EmailManagementPanel() {
  const [prefillUser, setPrefillUser] = useState<AdminUser | null>(null);

  const handleSendToUser = (user: AdminUser) => {
    setPrefillUser(user);
    setTimeout(() => {
      document.getElementById('email-send-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div className="space-y-8">
      <UnconfirmedUsersSection onSendToUser={handleSendToUser} />

      <div className="border-t border-border" />

      <div id="email-send-section">
        <SendEmailForm prefillUser={prefillUser} />
      </div>

      <div className="border-t border-border" />

      <CustomBroadcastSection />

      <div className="border-t border-border" />

      <RecentSendsSection />
    </div>
  );
}
