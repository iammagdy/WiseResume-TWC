import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  Search,
  Edit2,
  Trash2,
  Plus,
  Power,
  X,
  Save,
  User as UserIcon,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Crown,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { getPortfolioUrl } from '@/lib/portfolioUrl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { edgeFunctions } from '@/lib/edgeFunctions';
import { getDevKitToken } from '@/contexts/DevKitSessionContext';
import { cn } from '@/lib/utils';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';

type DirectoryRow = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  portfolio_enabled: boolean | null;
  updated_at: string | null;
  created_at: string | null;
};

type Rules = {
  id: number;
  min_length: number;
  max_length: number;
  allow_hyphens: boolean;
};

type OverrideRow = {
  user_id: string;
  min_length: number | null;
  max_length: number | null;
  allow_hyphens: boolean | null;
  note: string | null;
  updated_at: string | null;
  profile: { email: string | null; full_name: string | null; username: string | null } | null;
};

type ReservedRow = {
  username: string;
  reason: string | null;
  created_at: string | null;
};

type ExclusiveRow = {
  username: string;
  user_id: string;
  note: string | null;
  created_at: string | null;
  profile: { email: string | null; full_name: string | null; username: string | null } | null;
};

type PremiumRow = {
  username: string;
  price_cents: number;
  currency: string;
  status: 'available' | 'pending' | 'assigned';
  assigned_to_user_id: string | null;
  assigned_at: string | null;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
  profile: { email: string | null; full_name: string | null; username: string | null } | null;
};

type UserSearchResult = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
};

async function invoke<T = unknown>(
  action: string,
  extra: Record<string, unknown> = {},
): Promise<{ data: T | null; error: string | null }> {
  try {
    const tuple = await edgeFunctions.functions.invoke('admin-portfolio-usernames', {
      headers: devKitAuthHeaders(),
      body: { action, ...extra },
    });
    const result = unwrapAdminResponse<T>(tuple, 'admin-portfolio-usernames');
    return { data: result, error: null };
  } catch (e) {
    return { data: null, error: formatEdgeError(e, 'Request failed') };
  }
}

// ============================================================
// DIRECTORY
// ============================================================
function DirectorySection() {
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const perPage = 50;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState<DirectoryRow | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [releaseTarget, setReleaseTarget] = useState<DirectoryRow | null>(null);
  const [bulkReleaseOpen, setBulkReleaseOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await invoke<{ rows: DirectoryRow[]; total: number }>(
      'directory_list',
      { search, sort, page, per_page: perPage },
    );
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    setRows(data?.rows ?? []);
    setTotal(data?.total ?? 0);
    setSelected(new Set());
  }, [search, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const doRename = async () => {
    if (!renaming) return;
    const val = newUsername.trim().toLowerCase();
    if (!val) {
      toast.error('Username cannot be empty');
      return;
    }
    // Defer length/character validation to the server — it enforces the
    // effective rules (global + per-user overrides) via check_username_available.
    const { error } = await invoke('directory_rename', {
      user_id: renaming.user_id,
      new_username: val,
    });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(`Renamed to @${val}`);
    setRenaming(null);
    setNewUsername('');
    load();
  };

  const doToggle = async (row: DirectoryRow) => {
    const { error } = await invoke('directory_toggle_enabled', {
      user_id: row.user_id,
      enabled: !row.portfolio_enabled,
    });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(row.portfolio_enabled ? 'Portfolio disabled' : 'Portfolio enabled');
    load();
  };

  const doRelease = async () => {
    if (!releaseTarget) return;
    const { error } = await invoke('directory_release', {
      user_id: releaseTarget.user_id,
    });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(`Released @${releaseTarget.username}`);
    setReleaseTarget(null);
    load();
  };

  const doBulkRelease = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    const { error } = await invoke<{ released: number }>('directory_release', {
      user_ids: ids,
    });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(`Released ${ids.length} username(s)`);
    setBulkReleaseOpen(false);
    load();
  };

  const doBulkDisable = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    const { error } = await invoke('directory_bulk_disable', { user_ids: ids });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(`Disabled ${ids.length} portfolio(s)`);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by username, email, or name…"
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
          <SelectTrigger className="sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="username_asc">Username A→Z</SelectItem>
            <SelectItem value="username_desc">Username Z→A</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label="Refresh">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </Button>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 border border-border">
          <span className="text-xs text-muted-foreground">
            {selected.size} selected
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={doBulkDisable}>
              <Power className="w-3.5 h-3.5 mr-1" />
              Disable
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setBulkReleaseOpen(true)}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Release
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="w-10 p-2">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selected.size === rows.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelected(new Set(rows.map((r) => r.user_id)));
                      else setSelected(new Set());
                    }}
                  />
                </th>
                <th className="p-2 font-medium">Username</th>
                <th className="p-2 font-medium">User</th>
                <th className="p-2 font-medium">Claimed</th>
                <th className="p-2 font-medium">Enabled</th>
                <th className="p-2 font-medium w-40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground text-sm">Loading…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground text-sm">No usernames found.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.user_id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selected.has(r.user_id)}
                      onChange={() => toggleSelect(r.user_id)}
                    />
                  </td>
                  <td className="p-2 font-mono text-xs">@{r.username}</td>
                  <td className="p-2">
                    <div className="text-xs">
                      <div className="font-medium text-foreground">{r.full_name || '—'}</div>
                      <div className="text-muted-foreground">{r.email || '—'}</div>
                    </div>
                  </td>
                  <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="p-2">
                    <Switch
                      checked={!!r.portfolio_enabled}
                      onCheckedChange={() => doToggle(r)}
                    />
                  </td>
                  <td className="p-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                          if (!r.username) return;
                          window.open(getPortfolioUrl(r.username), '_blank', 'noopener,noreferrer');
                        }}
                        aria-label="Open portfolio"
                        disabled={!r.username}
                        title="Open portfolio"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => { setRenaming(r); setNewUsername(r.username ?? ''); }}
                        aria-label="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setReleaseTarget(r)}
                        aria-label="Release"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{total} total</span>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span>Page {page} / {totalPages}</span>
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Rename dialog */}
      <Dialog open={!!renaming} onOpenChange={(o) => { if (!o) { setRenaming(null); setNewUsername(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename username</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {renaming?.full_name || renaming?.email} currently holds <span className="font-mono">@{renaming?.username}</span>.
            </p>
            <Input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="new-username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setRenaming(null); setNewUsername(''); }}>Cancel</Button>
            <Button onClick={doRename}><Save className="w-4 h-4 mr-1" />Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!releaseTarget} onOpenChange={(o) => { if (!o) setReleaseTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release username?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears <span className="font-mono">@{releaseTarget?.username}</span> from {releaseTarget?.email || 'this account'} and disables their portfolio. The username becomes available again for anyone to claim.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doRelease} className="bg-destructive hover:bg-destructive/90">Release</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkReleaseOpen} onOpenChange={setBulkReleaseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release {selected.size} username(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears the usernames from the selected accounts and disables their portfolios. Usernames become available again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doBulkRelease} className="bg-destructive hover:bg-destructive/90">Release all</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// RULES
// ============================================================
function UserSearchInput({
  onPick,
}: {
  onPick: (u: UserSearchResult) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancel = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await invoke<{ rows: UserSearchResult[] }>('user_search', { query });
      if (cancel) return;
      setResults(data?.rows ?? []);
      setLoading(false);
    }, 250);
    return () => { cancel = true; clearTimeout(t); };
  }, [query]);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search user by email, name, or username…"
          className="pl-9"
        />
      </div>
      {query.trim().length >= 2 && (
        <div className="rounded-lg border border-border max-h-48 overflow-y-auto">
          {loading && <p className="p-2 text-xs text-muted-foreground">Searching…</p>}
          {!loading && results.length === 0 && <p className="p-2 text-xs text-muted-foreground">No users found.</p>}
          {results.map((r) => (
            <button
              key={r.user_id}
              type="button"
              onClick={() => { onPick(r); setQuery(''); setResults([]); }}
              className="w-full text-left p-2 hover:bg-muted/50 text-xs flex flex-col gap-0.5"
            >
              <span className="font-medium text-foreground">{r.full_name || '—'} {r.username && <span className="font-mono text-muted-foreground">@{r.username}</span>}</span>
              <span className="text-muted-foreground">{r.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RulesSection() {
  const [rules, setRules] = useState<Rules>({ id: 1, min_length: 3, max_length: 30, allow_hyphens: true });
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overridePick, setOverridePick] = useState<UserSearchResult | null>(null);
  const [ovMin, setOvMin] = useState('');
  const [ovMax, setOvMax] = useState('');
  const [ovHyphens, setOvHyphens] = useState<string>('inherit');
  const [ovNote, setOvNote] = useState('');
  const [deleteOverride, setDeleteOverride] = useState<OverrideRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await invoke<{ rules: Rules; overrides: OverrideRow[] }>('rules_get');
    setLoading(false);
    if (error) return toast.error(error);
    if (data) {
      setRules(data.rules);
      setOverrides(data.overrides ?? []);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveRules = async () => {
    setSaving(true);
    const { error } = await invoke('rules_update', {
      min_length: rules.min_length,
      max_length: rules.max_length,
      allow_hyphens: rules.allow_hyphens,
    });
    setSaving(false);
    if (error) return toast.error(error);
    toast.success('Rules updated');
    load();
  };

  const saveOverride = async () => {
    if (!overridePick) return toast.error('Pick a user first');
    const { error } = await invoke('rules_override_upsert', {
      user_id: overridePick.user_id,
      min_length: ovMin === '' ? null : Number(ovMin),
      max_length: ovMax === '' ? null : Number(ovMax),
      allow_hyphens: ovHyphens === 'inherit' ? null : ovHyphens === 'yes',
      note: ovNote,
    });
    if (error) return toast.error(error);
    toast.success('Override saved');
    setOverrideOpen(false);
    setOverridePick(null);
    setOvMin(''); setOvMax(''); setOvHyphens('inherit'); setOvNote('');
    load();
  };

  const doDeleteOverride = async () => {
    if (!deleteOverride) return;
    const { error } = await invoke('rules_override_delete', { user_id: deleteOverride.user_id });
    if (error) return toast.error(error);
    toast.success('Override removed');
    setDeleteOverride(null);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Global rules</h3>
          <p className="text-xs text-muted-foreground">These apply to every user unless overridden below.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium">Min length</label>
            <Input
              type="number"
              min={1}
              max={100}
              value={rules.min_length}
              onChange={(e) => setRules({ ...rules, min_length: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs font-medium">Max length</label>
            <Input
              type="number"
              min={1}
              max={100}
              value={rules.max_length}
              onChange={(e) => setRules({ ...rules, max_length: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-medium">Allow hyphens</label>
            <p className="text-[11px] text-muted-foreground">Permit `-` inside usernames.</p>
          </div>
          <Switch
            checked={rules.allow_hyphens}
            onCheckedChange={(v) => setRules({ ...rules, allow_hyphens: v })}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1', loading && 'animate-spin')} />
            Reload
          </Button>
          <Button size="sm" onClick={saveRules} disabled={saving}>
            <Save className="w-3.5 h-3.5 mr-1" />
            {saving ? 'Saving…' : 'Save rules'}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold">Per-user overrides</h3>
            <p className="text-xs text-muted-foreground">Give specific users looser or stricter rules.</p>
          </div>
          <Button size="sm" onClick={() => setOverrideOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add override
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="p-2 font-medium">User</th>
                <th className="p-2 font-medium">Min</th>
                <th className="p-2 font-medium">Max</th>
                <th className="p-2 font-medium">Hyphens</th>
                <th className="p-2 font-medium">Note</th>
                <th className="p-2 w-12" />
              </tr>
            </thead>
            <tbody>
              {overrides.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-xs text-muted-foreground">No per-user overrides.</td></tr>
              )}
              {overrides.map((o) => (
                <tr key={o.user_id} className="border-t border-border">
                  <td className="p-2 text-xs">
                    <div className="font-medium">{o.profile?.full_name || '—'}</div>
                    <div className="text-muted-foreground">{o.profile?.email}</div>
                  </td>
                  <td className="p-2 text-xs">{o.min_length ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-2 text-xs">{o.max_length ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-2 text-xs">
                    {o.allow_hyphens === null ? <span className="text-muted-foreground">inherit</span> : o.allow_hyphens ? 'yes' : 'no'}
                  </td>
                  <td className="p-2 text-xs max-w-[180px] truncate text-muted-foreground" title={o.note ?? ''}>{o.note || '—'}</td>
                  <td className="p-2">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                      onClick={() => setDeleteOverride(o)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={overrideOpen} onOpenChange={(o) => {
        setOverrideOpen(o);
        if (!o) { setOverridePick(null); setOvMin(''); setOvMax(''); setOvHyphens('inherit'); setOvNote(''); }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add per-user override</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {overridePick ? (
              <div className="flex items-center justify-between p-2 rounded-md border border-border">
                <div className="text-xs">
                  <div className="font-medium">{overridePick.full_name || '—'}</div>
                  <div className="text-muted-foreground">{overridePick.email}</div>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOverridePick(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <UserSearchInput onPick={setOverridePick} />
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Min length</label>
                <Input type="number" placeholder="inherit" value={ovMin} onChange={(e) => setOvMin(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium">Max length</label>
                <Input type="number" placeholder="inherit" value={ovMax} onChange={(e) => setOvMax(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Allow hyphens</label>
              <Select value={ovHyphens} onValueChange={setOvHyphens}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">Inherit from global</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">Note (optional)</label>
              <Textarea value={ovNote} onChange={(e) => setOvNote(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOverrideOpen(false)}>Cancel</Button>
            <Button onClick={saveOverride} disabled={!overridePick}><Save className="w-4 h-4 mr-1" />Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteOverride} onOpenChange={(o) => { if (!o) setDeleteOverride(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove override?</AlertDialogTitle>
            <AlertDialogDescription>
              This user will fall back to the global rules.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDeleteOverride} className="bg-destructive hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// RESERVED
// ============================================================
function ReservedSection() {
  const [rows, setRows] = useState<ReservedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newReason, setNewReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ReservedRow | null>(null);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await invoke<{ rows: ReservedRow[] }>('reserved_list');
    setLoading(false);
    if (error) return toast.error(error);
    setRows(data?.rows ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const doAdd = async () => {
    const u = newUsername.trim().toLowerCase();
    if (!u) return toast.error('Username required');
    const { error } = await invoke('reserved_add', { username: u, reason: newReason.trim() });
    if (error) return toast.error(error);
    toast.success(`Reserved @${u}`);
    setAdding(false);
    setNewUsername(''); setNewReason('');
    load();
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await invoke('reserved_delete', { username: deleteTarget.username });
    if (error) return toast.error(error);
    toast.success(`Removed @${deleteTarget.username}`);
    setDeleteTarget(null);
    load();
  };

  const filtered = useMemo(
    () => rows.filter((r) => !filter || r.username.includes(filter.toLowerCase())),
    [rows, filter],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter reserved words…" className="pl-9" />
        </div>
        <Button variant="outline" size="icon" onClick={load} aria-label="Refresh">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </Button>
        <Button onClick={() => setAdding(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add reserved
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="p-2 font-medium">Username</th>
                <th className="p-2 font-medium">Reason</th>
                <th className="p-2 w-12" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={3} className="p-4 text-center text-xs text-muted-foreground">No reserved usernames.</td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.username} className="border-t border-border">
                  <td className="p-2 font-mono text-xs">@{r.username}</td>
                  <td className="p-2 text-xs text-muted-foreground">{r.reason || '—'}</td>
                  <td className="p-2">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                      onClick={() => setDeleteTarget(r)} aria-label="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add reserved username</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Username</label>
              <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="admin" autoCapitalize="none" />
            </div>
            <div>
              <label className="text-xs font-medium">Reason (optional)</label>
              <Textarea value={newReason} onChange={(e) => setNewReason(e.target.value)} rows={2} placeholder="e.g. system route" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={doAdd}><Save className="w-4 h-4 mr-1" />Reserve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove reserved?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono">@{deleteTarget?.username}</span> will become available again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// EXCLUSIVE
// ============================================================
function ExclusiveSection() {
  const [rows, setRows] = useState<ExclusiveRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newNote, setNewNote] = useState('');
  const [picked, setPicked] = useState<UserSearchResult | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExclusiveRow | null>(null);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await invoke<{ rows: ExclusiveRow[] }>('exclusive_list');
    setLoading(false);
    if (error) return toast.error(error);
    setRows(data?.rows ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const doAdd = async () => {
    const u = newUsername.trim().toLowerCase();
    if (!u) return toast.error('Username required');
    if (!picked) return toast.error('Pick the exclusive holder');
    const { error } = await invoke('exclusive_add', {
      username: u,
      user_id: picked.user_id,
      note: newNote.trim(),
    });
    if (error) return toast.error(error);
    toast.success(`@${u} is now exclusive to ${picked.email}`);
    setAdding(false);
    setNewUsername(''); setNewNote(''); setPicked(null);
    load();
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await invoke('exclusive_delete', { username: deleteTarget.username });
    if (error) return toast.error(error);
    toast.success(`Removed exclusive @${deleteTarget.username}`);
    setDeleteTarget(null);
    load();
  };

  const filtered = useMemo(
    () => rows.filter((r) =>
      !filter ||
      r.username.includes(filter.toLowerCase()) ||
      (r.profile?.email ?? '').toLowerCase().includes(filter.toLowerCase()) ||
      (r.profile?.full_name ?? '').toLowerCase().includes(filter.toLowerCase()),
    ),
    [rows, filter],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Exclusive usernames are reserved for a specific user account. Only that user can claim the username — for everyone else it reports as reserved.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter exclusives…" className="pl-9" />
        </div>
        <Button variant="outline" size="icon" onClick={load} aria-label="Refresh">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </Button>
        <Button onClick={() => setAdding(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add exclusive
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="p-2 font-medium">Username</th>
                <th className="p-2 font-medium">Holder</th>
                <th className="p-2 font-medium">Status</th>
                <th className="p-2 font-medium">Note</th>
                <th className="p-2 w-12" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-xs text-muted-foreground">No exclusive assignments.</td></tr>
              )}
              {filtered.map((r) => {
                const claimed = r.profile?.username === r.username;
                return (
                  <tr key={r.username} className="border-t border-border">
                    <td className="p-2 font-mono text-xs">@{r.username}</td>
                    <td className="p-2 text-xs">
                      <div className="font-medium">{r.profile?.full_name || '—'}</div>
                      <div className="text-muted-foreground">{r.profile?.email}</div>
                    </td>
                    <td className="p-2">
                      <Badge variant={claimed ? 'default' : 'secondary'} className="text-[10px]">
                        {claimed ? 'Claimed' : 'Unclaimed'}
                      </Badge>
                    </td>
                    <td className="p-2 text-xs max-w-[180px] truncate text-muted-foreground" title={r.note ?? ''}>{r.note || '—'}</td>
                    <td className="p-2">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                        onClick={() => setDeleteTarget(r)} aria-label="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={adding} onOpenChange={(o) => {
        setAdding(o);
        if (!o) { setNewUsername(''); setNewNote(''); setPicked(null); }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add exclusive assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Username</label>
              <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="brand-name" autoCapitalize="none" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Assign to user</label>
              {picked ? (
                <div className="flex items-center justify-between p-2 rounded-md border border-border">
                  <div className="text-xs">
                    <div className="font-medium">{picked.full_name || '—'}</div>
                    <div className="text-muted-foreground">{picked.email}</div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPicked(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <UserSearchInput onPick={setPicked} />
              )}
            </div>
            <div>
              <label className="text-xs font-medium">Note (optional)</label>
              <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={doAdd} disabled={!picked || !newUsername.trim()}><Save className="w-4 h-4 mr-1" />Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove exclusive?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono">@{deleteTarget?.username}</span> will become available for anyone to claim.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// PREMIUM HANDLES MARKETPLACE
// ============================================================
function formatPrice(cents: number, currency: string): string {
  if (cents === 0) return 'Free';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function PremiumSection() {
  const [rows, setRows] = useState<PremiumRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPriceCents, setNewPriceCents] = useState('');
  const [newNote, setNewNote] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<PremiumRow | null>(null);
  const [assignTarget, setAssignTarget] = useState<PremiumRow | null>(null);
  const [assignPick, setAssignPick] = useState<UserSearchResult | null>(null);
  const [assignNote, setAssignNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await invoke<{ rows: PremiumRow[] }>('premium_list');
    setLoading(false);
    if (error) return toast.error(error);
    setRows(data?.rows ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const doAdd = async () => {
    const username = newUsername.trim().toLowerCase();
    if (!username) return toast.error('Username is required');
    const priceCents = newPriceCents === '' ? 0 : Math.round(Number(newPriceCents) * 100);
    if (isNaN(priceCents) || priceCents < 0) return toast.error('Enter a valid price (e.g. 49.99)');

    const { error } = await invoke('premium_add', {
      username,
      price_cents: priceCents,
      currency: 'usd',
      note: newNote,
    });
    if (error) return toast.error(error);
    toast.success(`@${username} added to premium marketplace`);
    setAdding(false);
    setNewUsername(''); setNewPriceCents(''); setNewNote('');
    load();
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await invoke('premium_delete', { username: deleteTarget.username });
    if (error) return toast.error(error);
    toast.success(`@${deleteTarget.username} removed`);
    setDeleteTarget(null);
    load();
  };

  const doAssign = async () => {
    if (!assignTarget || !assignPick) return toast.error('Select a user first');
    const { error } = await invoke('premium_assign', {
      username: assignTarget.username,
      user_id: assignPick.user_id,
      note: assignNote,
    });
    if (error) return toast.error(error);
    toast.success(`@${assignTarget.username} assigned to ${assignPick.email ?? assignPick.full_name}`);
    setAssignTarget(null);
    setAssignPick(null);
    setAssignNote('');
    load();
  };

  const statusBadge = (status: PremiumRow['status']) => {
    if (status === 'assigned') return <Badge className="text-[10px] bg-green-500/15 text-green-600 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Assigned</Badge>;
    if (status === 'pending') return <Badge className="text-[10px] bg-amber-500/15 text-amber-600 border-amber-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    return <Badge variant="secondary" className="text-[10px]">Available</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-amber-500" />
            Premium handles
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mark usernames as premium with a price. Manually assign after payment is confirmed.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label="Refresh">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add handle
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="p-2 font-medium">Username</th>
                <th className="p-2 font-medium">Price</th>
                <th className="p-2 font-medium">Status</th>
                <th className="p-2 font-medium">Assigned to</th>
                <th className="p-2 font-medium">Note</th>
                <th className="p-2 font-medium w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground text-sm">Loading…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground text-sm">No premium handles yet. Add one to get started.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.username} className="border-t border-border hover:bg-muted/30">
                  <td className="p-2 font-mono text-xs font-semibold">@{r.username}</td>
                  <td className="p-2 text-xs font-medium text-amber-600">
                    {formatPrice(r.price_cents, r.currency)}
                  </td>
                  <td className="p-2">{statusBadge(r.status)}</td>
                  <td className="p-2">
                    {r.profile ? (
                      <div className="text-xs">
                        <div className="font-medium">{r.profile.full_name || '—'}</div>
                        <div className="text-muted-foreground">{r.profile.email}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-2 text-xs text-muted-foreground max-w-[160px] truncate" title={r.note ?? ''}>{r.note || '—'}</td>
                  <td className="p-2">
                    <div className="flex justify-end gap-1">
                      {r.status !== 'assigned' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2"
                          onClick={() => { setAssignTarget(r); setAssignPick(null); setAssignNote(''); }}
                        >
                          Assign
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(r)}
                        aria-label="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add handle dialog */}
      <Dialog open={adding} onOpenChange={(o) => {
        setAdding(o);
        if (!o) { setNewUsername(''); setNewPriceCents(''); setNewNote(''); }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              Add premium handle
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Username</label>
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="brand-name"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
            <div>
              <label className="text-xs font-medium">Price (USD)</label>
              <p className="text-[11px] text-muted-foreground mb-1">Enter 0 for free / gifted assignment.</p>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={newPriceCents}
                onChange={(e) => setNewPriceCents(e.target.value)}
                placeholder="49.99"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Note (optional)</label>
              <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={2} placeholder="Internal note about this handle…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={doAdd} disabled={!newUsername.trim()}>
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={!!assignTarget} onOpenChange={(o) => { if (!o) { setAssignTarget(null); setAssignPick(null); setAssignNote(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign <span className="font-mono">@{assignTarget?.username}</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md bg-muted/40 border border-border p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Handle</span>
                <span className="font-mono font-semibold">@{assignTarget?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price</span>
                <span className="font-medium text-amber-600">
                  {assignTarget ? formatPrice(assignTarget.price_cents, assignTarget.currency) : '—'}
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Assign to user</label>
              {assignPick ? (
                <div className="flex items-center justify-between p-2 rounded-md border border-border">
                  <div className="text-xs">
                    <div className="font-medium">{assignPick.full_name || '—'}</div>
                    <div className="text-muted-foreground">{assignPick.email}</div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setAssignPick(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <UserSearchInput onPick={setAssignPick} />
              )}
            </div>
            <div>
              <label className="text-xs font-medium">Payment note (optional)</label>
              <Textarea
                value={assignNote}
                onChange={(e) => setAssignNote(e.target.value)}
                rows={2}
                placeholder="e.g. Paid via bank transfer on 2026-05-14"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              This will immediately set <span className="font-mono">@{assignTarget?.username}</span> as the user's portfolio username.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setAssignTarget(null); setAssignPick(null); }}>Cancel</Button>
            <Button onClick={doAssign} disabled={!assignPick}>
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Confirm assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove premium handle?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono">@{deleteTarget?.username}</span> will be removed from the premium marketplace.
              {deleteTarget?.status === 'assigned' && ' This handle has already been assigned — removing it here will NOT reclaim the username from the user.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// ROOT
// ============================================================
export function PortfolioUsernamesPanel() {
  return (
    <Tabs defaultValue="directory" className="space-y-4">
      <TabsList className="grid grid-cols-5 w-full sm:w-auto">
        <TabsTrigger value="directory">Directory</TabsTrigger>
        <TabsTrigger value="rules">Rules</TabsTrigger>
        <TabsTrigger value="reserved">Reserved</TabsTrigger>
        <TabsTrigger value="exclusive">Exclusive</TabsTrigger>
        <TabsTrigger value="premium" className="flex items-center gap-1">
          <Crown className="w-3.5 h-3.5 text-amber-500" />
          Premium
        </TabsTrigger>
      </TabsList>
      <TabsContent value="directory"><DirectorySection /></TabsContent>
      <TabsContent value="rules"><RulesSection /></TabsContent>
      <TabsContent value="reserved"><ReservedSection /></TabsContent>
      <TabsContent value="exclusive"><ExclusiveSection /></TabsContent>
      <TabsContent value="premium"><PremiumSection /></TabsContent>
    </Tabs>
  );
}
