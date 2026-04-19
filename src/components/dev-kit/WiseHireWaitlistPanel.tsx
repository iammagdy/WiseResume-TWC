import { useState, useCallback, useEffect } from 'react';
import {
  RefreshCw,
  Search,
  Send,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  Users,
  ChevronLeft,
  ChevronRight,
  XCircle,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { getDevKitToken } from '@/contexts/DevKitSessionContext';
import { useIsMounted } from '@/lib/devkit/hooks';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';

interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  company_name: string;
  company_size: string;
  submitted_at: string;
  invited_at: string | null;
  invite_used_at: string | null;
  invite_status: 'active' | 'revoked' | 'expired' | null;
  notes: string | null;
}

interface InviteResult {
  invite_url: string;
  expires_at: string;
}

const PER_PAGE = 25;

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="ml-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export function WiseHireWaitlistPanel() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [inviting, setInviting] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [inviteFor, setInviteFor] = useState<string>('');

  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<WaitlistEntry | null>(null);

  const isMounted = useIsMounted();

  const fetchEntries = useCallback(async (pageNum: number, searchVal: string) => {
    setLoading(true);
    setError(null);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-wisehire-waitlist', {
        body: { password: getDevKitToken(), page: pageNum, per_page: PER_PAGE, search: searchVal },
      });
      const result = unwrapAdminResponse<{ entries?: WaitlistEntry[]; total?: number }>(tuple, 'admin-wisehire-waitlist');
      if (!isMounted()) return;
      setEntries(result.entries ?? []);
      setTotal(result.total ?? 0);
    } catch (e) {
      if (!isMounted()) return;
      setError(formatEdgeError(e, 'Failed to load waitlist'));
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => { fetchEntries(page, search); }, [fetchEntries, page, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleInvite = async (entry: WaitlistEntry) => {
    setInviting(entry.id);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-wisehire-invite', {
        body: {
          password: getDevKitToken(),
          recipient_email: entry.email,
          waitlist_id: entry.id,
        },
      });
      const result = unwrapAdminResponse<{ invite_url?: string; expires_at?: string }>(tuple, 'admin-wisehire-invite');
      if (!result.invite_url || !result.expires_at) {
        throw new Error('Invite URL or expiry missing from server response');
      }
      if (!isMounted()) return;
      toast.success(`Invite sent to ${entry.email}`);
      setInviteFor(entry.email);
      setInviteResult({ invite_url: result.invite_url, expires_at: result.expires_at });
      setEntries(prev => prev.map(e => e.id === entry.id
        ? { ...e, invited_at: new Date().toISOString(), invite_status: 'active' }
        : e
      ));
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to send invite'));
    } finally {
      if (isMounted()) setInviting(null);
    }
  };

  const handleRevoke = async (entry: WaitlistEntry) => {
    setRevokeTarget(null);
    setRevoking(entry.id);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-wisehire-revoke-invite', {
        body: {
          password: getDevKitToken(),
          recipient_email: entry.email,
          waitlist_id: entry.id,
        },
      });
      unwrapAdminResponse<{ revoked_count?: number }>(tuple, 'admin-wisehire-revoke-invite');
      if (!isMounted()) return;
      toast.success(`Invite revoked for ${entry.email}`);
      setEntries(prev => prev.map(e => e.id === entry.id
        ? { ...e, invite_status: 'revoked' }
        : e
      ));
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to revoke invite'));
    } finally {
      if (isMounted()) setRevoking(null);
    }
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{total} entr{total !== 1 ? 'ies' : 'y'} on waitlist</span>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <form onSubmit={handleSearch} className="flex gap-1.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search name, email, company…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-8 h-8 text-sm w-48 sm:w-64"
              />
            </div>
            <Button type="submit" size="sm" variant="outline" className="h-8">Search</Button>
          </form>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => { setPage(1); fetchEntries(1, search); }}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>
      )}

      {loading && entries.length === 0 && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted/50 animate-pulse" />)}
        </div>
      )}

      {!loading && entries.length === 0 && !error && (
        <div className="text-center py-10 text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">{search ? 'No results match your search.' : 'No waitlist entries yet.'}</p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Company</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Size</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Submitted</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const isRevoked = entry.invite_status === 'revoked';
                  const isActive = !!entry.invite_used_at;
                  const isInvited = !!entry.invited_at && entry.invite_status === 'active' && !isActive;
                  const isBusy = inviting === entry.id || revoking === entry.id;

                  return (
                    <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{entry.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{entry.email}</div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-sm text-foreground">
                        {entry.company_name || '—'}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                        {entry.company_size || '—'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                        {formatDate(entry.submitted_at)}
                      </td>
                      <td className="px-4 py-3">
                        {isActive ? (
                          <Badge variant="outline" className="text-blue-600 border-blue-500/20 bg-blue-500/10 gap-1">
                            <UserCheck className="w-3 h-3" />
                            Active
                          </Badge>
                        ) : isInvited ? (
                          <Badge variant="outline" className="text-green-600 border-green-500/20 bg-green-500/10 gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Invited
                          </Badge>
                        ) : isRevoked ? (
                          <Badge variant="outline" className="text-orange-600 border-orange-500/20 bg-orange-500/10 gap-1">
                            <XCircle className="w-3 h-3" />
                            Revoked
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isActive ? (
                            <span className="text-xs text-muted-foreground">Signed up</span>
                          ) : isInvited ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5"
                                onClick={() => handleInvite(entry)}
                                disabled={isBusy}
                              >
                                {inviting === entry.id
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <Send className="w-3 h-3" />
                                }
                                Resend
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => setRevokeTarget(entry)}
                                disabled={isBusy}
                              >
                                {revoking === entry.id
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <XCircle className="w-3 h-3" />
                                }
                                Revoke
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 text-xs gap-1.5"
                              onClick={() => handleInvite(entry)}
                              disabled={isBusy}
                            >
                              {inviting === entry.id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <Send className="w-3 h-3" />
                              }
                              Invite
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-1">
          <span>Page {page} of {totalPages} ({total} total)</span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={inviteResult !== null} onOpenChange={(open) => { if (!open) setInviteResult(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Invite sent to {inviteFor}
            </DialogTitle>
            <DialogDescription>
              The invite email has been dispatched. Share the link below if needed.
            </DialogDescription>
          </DialogHeader>
          {inviteResult && (
            <div className="space-y-3 pt-1">
              <div className="rounded-lg bg-muted/50 border border-border p-3">
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">Invite URL</p>
                <p className="text-xs font-mono break-all text-foreground">{inviteResult.invite_url}</p>
                <CopyButton value={inviteResult.invite_url} />
              </div>
              <p className="text-xs text-muted-foreground">
                Expires: {new Date(inviteResult.expires_at).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                  hour: 'numeric', minute: '2-digit',
                })}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={revokeTarget !== null} onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              Revoke invite?
            </DialogTitle>
            <DialogDescription>
              This will invalidate the active invite link for{' '}
              <strong className="text-foreground">{revokeTarget?.email}</strong>. They won't be
              able to use it to sign up. You can re-invite them at any time.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setRevokeTarget(null)} disabled={revoking !== null}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={revoking !== null}
              onClick={() => revokeTarget && handleRevoke(revokeTarget)}
            >
              {revoking !== null ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : null}
              Revoke invite
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
