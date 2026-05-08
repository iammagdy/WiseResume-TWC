import { useState, useCallback, useEffect } from 'react';
import {
  RefreshCw,
  Bug,
  ShieldBan,
  AlertTriangle,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { edgeFunctions } from '@/lib/edgeFunctions';
import { devKitInvokeOptions } from '@/lib/devkit/devKitAuth';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { useIsMounted } from '@/lib/devkit/hooks';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DevKitErrorCard } from './DevKitErrorCard';

type InternalTab = 'bugs' | 'blocklist' | 'queue';

interface BugReport {
  id: string;
  user_email: string;
  error_message: string;
  error_stack: string | null;
  component_stack: string | null;
  additional_context: string | null;
  session_id: string | null;
  user_agent: string | null;
  route: string | null;
  status: string;
  private_note: string | null;
  app_version: string | null;
  created_at: string;
}

interface BlocklistEntry {
  id: string;
  type: string;
  value: string;
  reason: string | null;
  added_by: string | null;
  added_at: string;
}

interface QueueItem {
  id: string;
  content_type: string;
  content_id: string | null;
  snippet: string | null;
  reporter_user_id: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const BUG_STATUSES = ['open', 'in-progress', 'resolved', 'wont-fix'];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    open: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    'in-progress': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    resolved: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    'wont-fix': 'bg-muted text-muted-foreground border-border',
    pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    approved: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    removed: 'bg-destructive/10 text-destructive border-destructive/20',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border',
        map[status] ?? 'bg-muted text-muted-foreground border-border',
      )}
    >
      {status}
    </span>
  );
}

// ── Bug Inbox ────────────────────────────────────────────────────────────────

function BugInboxTab({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const isMounted = useIsMounted();
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('open');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  const fetchBugs = useCallback(async () => {
    if (!isMounted()) return;
    setLoading(true);
    setError(null);
    try {
      const tuple = await edgeFunctions.functions.invoke(
        'admin-moderation',
        devKitInvokeOptions({ action: 'list_bug_reports', status_filter: statusFilter }),
      );
      const data = unwrapAdminResponse<{ bug_reports: BugReport[]; total: number }>(tuple, 'admin-moderation');
      if (!isMounted()) return;
      setBugs(data.bug_reports ?? []);
      setTotal(data.total ?? 0);
      // Update the parent badge count when showing open bugs.
      if (statusFilter === 'open' && onCountChange) onCountChange(data.total ?? 0);
    } catch (err) {
      if (!isMounted()) return;
      setError(formatEdgeError(err));
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted, statusFilter, onCountChange]);

  useEffect(() => { fetchBugs(); }, [fetchBugs]);

  const updateBug = useCallback(async (id: string, updates: { status?: string; private_note?: string }) => {
    setSaving(id);
    try {
      const tuple = await edgeFunctions.functions.invoke(
        'admin-moderation',
        devKitInvokeOptions({ action: 'update_bug_report', report_id: id, ...updates }),
      );
      unwrapAdminResponse(tuple, 'admin-moderation');
      toast.success('Bug report updated');
      fetchBugs();
    } catch (err) {
      toast.error(formatEdgeError(err));
    } finally {
      setSaving(null);
    }
  }, [fetchBugs]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {['all', ...BUG_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              statusFilter === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-transparent text-muted-foreground border-border hover:border-foreground/30',
            )}
          >
            {s === 'all' ? 'All' : s}
          </button>
        ))}
        <Button size="sm" variant="ghost" onClick={fetchBugs} disabled={loading} className="ml-auto">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </Button>
      </div>

      {error && <DevKitErrorCard error={error} title="Couldn't load bug reports" onRetry={fetchBugs} context={{ panel: 'Moderation · Bugs', function: 'admin-moderation', action: 'list_bug_reports' }} />}

      {!loading && bugs.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <Inbox className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">No bug reports found</p>
        </div>
      )}

      <div className="space-y-2">
        {bugs.map((bug) => (
          <div key={bug.id} className="rounded-lg border border-border bg-card overflow-hidden">
            <button
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              onClick={() => setExpanded((e) => (e === bug.id ? null : bug.id))}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {statusBadge(bug.status)}
                  <span className="text-xs text-muted-foreground">{bug.user_email}</span>
                  {bug.route && (
                    <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                      {bug.route}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">{fmtDate(bug.created_at)}</span>
                </div>
                <p className="text-sm font-medium truncate">{bug.error_message}</p>
              </div>
              {expanded === bug.id ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              )}
            </button>

            {expanded === bug.id && (
              <div className="px-4 pb-4 border-t border-border bg-muted/20 space-y-3 pt-3">
                {/* Full report metadata */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {bug.app_version && <span><span className="font-medium text-foreground/70">Version:</span> {bug.app_version}</span>}
                  {bug.session_id && <span className="truncate"><span className="font-medium text-foreground/70">Session:</span> {bug.session_id}</span>}
                  {bug.user_agent && <span className="col-span-2 truncate"><span className="font-medium text-foreground/70">UA:</span> {bug.user_agent}</span>}
                </div>

                {bug.additional_context && (
                  <div>
                    <p className="text-[11px] font-medium text-foreground/60 uppercase tracking-wide mb-1">Additional Context</p>
                    <pre className="text-xs bg-muted rounded px-2 py-1.5 whitespace-pre-wrap break-words max-h-24 overflow-y-auto">{bug.additional_context}</pre>
                  </div>
                )}

                {bug.error_stack && (
                  <div>
                    <p className="text-[11px] font-medium text-foreground/60 uppercase tracking-wide mb-1">Error Stack</p>
                    <pre className="text-xs bg-muted rounded px-2 py-1.5 whitespace-pre-wrap break-words max-h-32 overflow-y-auto font-mono text-destructive/80">{bug.error_stack}</pre>
                  </div>
                )}

                {bug.component_stack && (
                  <div>
                    <p className="text-[11px] font-medium text-foreground/60 uppercase tracking-wide mb-1">Component Stack</p>
                    <pre className="text-xs bg-muted rounded px-2 py-1.5 whitespace-pre-wrap break-words max-h-24 overflow-y-auto font-mono">{bug.component_stack}</pre>
                  </div>
                )}

                {bug.private_note && (
                  <div className="text-xs bg-amber-500/10 border border-amber-500/20 rounded px-3 py-2 text-amber-700 dark:text-amber-400">
                    <span className="font-medium">Note:</span> {bug.private_note}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground self-center">Change status:</span>
                  {BUG_STATUSES.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={bug.status === s ? 'default' : 'outline'}
                      disabled={saving === bug.id || bug.status === s}
                      onClick={() => updateBug(bug.id, { status: s })}
                      className="h-6 text-xs px-2"
                    >
                      {s}
                    </Button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Private note…"
                    className="h-7 text-xs"
                    value={noteInputs[bug.id] ?? bug.private_note ?? ''}
                    onChange={(e) => setNoteInputs((prev) => ({ ...prev, [bug.id]: e.target.value }))}
                  />
                  <Button
                    size="sm"
                    disabled={saving === bug.id}
                    onClick={() => updateBug(bug.id, { private_note: noteInputs[bug.id] ?? '' })}
                    className="h-7 text-xs px-3"
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {total > bugs.length && (
        <p className="text-xs text-center text-muted-foreground">
          Showing {bugs.length} of {total} reports
        </p>
      )}
    </div>
  );
}

// ── Blocklist ────────────────────────────────────────────────────────────────

function BlocklistTab() {
  const isMounted = useIsMounted();
  const [entries, setEntries] = useState<BlocklistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ type: 'email', value: '', reason: '' });

  const fetchEntries = useCallback(async () => {
    if (!isMounted()) return;
    setLoading(true);
    setError(null);
    try {
      const tuple = await edgeFunctions.functions.invoke(
        'admin-moderation',
        devKitInvokeOptions({ action: 'list_blocklist' }),
      );
      const data = unwrapAdminResponse<{ entries: BlocklistEntry[] }>(tuple, 'admin-moderation');
      if (!isMounted()) return;
      setEntries(data.entries ?? []);
    } catch (err) {
      if (!isMounted()) return;
      setError(formatEdgeError(err));
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const addEntry = useCallback(async () => {
    if (!form.value.trim()) return toast.error('Value is required');
    setAdding(true);
    try {
      const tuple = await edgeFunctions.functions.invoke(
        'admin-moderation',
        devKitInvokeOptions({ action: 'add_blocklist', type: form.type, value: form.value, reason: form.reason }),
      );
      unwrapAdminResponse(tuple, 'admin-moderation');
      toast.success(`Blocked ${form.type}: ${form.value}`);
      setForm({ type: 'email', value: '', reason: '' });
      fetchEntries();
    } catch (err) {
      toast.error(formatEdgeError(err));
    } finally {
      setAdding(false);
    }
  }, [form, fetchEntries]);

  const removeEntry = useCallback(async (id: string) => {
    setRemoving(id);
    try {
      const tuple = await edgeFunctions.functions.invoke(
        'admin-moderation',
        devKitInvokeOptions({ action: 'remove_blocklist', entry_id: id }),
      );
      unwrapAdminResponse(tuple, 'admin-moderation');
      toast.success('Entry removed');
      fetchEntries();
    } catch (err) {
      toast.error(formatEdgeError(err));
    } finally {
      setRemoving(null);
    }
  }, [fetchEntries]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <p className="text-sm font-medium">Add to blocklist</p>
        <div className="flex gap-2 flex-wrap">
          {(['email', 'user_id', 'pattern'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setForm((f) => ({ ...f, type: t }))}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                form.type === t
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-muted-foreground border-border hover:border-foreground/30',
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder={
              form.type === 'email' ? 'user@example.com' :
              form.type === 'user_id' ? 'UUID of user' :
              'Pattern (e.g. @spam.com)'
            }
            className="h-8 text-sm flex-1"
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
          />
          <Input
            placeholder="Reason (optional)"
            className="h-8 text-sm flex-1"
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          />
          <Button size="sm" disabled={adding} onClick={addEntry} className="h-8">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Block
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{entries.length} entries</p>
        <Button size="sm" variant="ghost" onClick={fetchEntries} disabled={loading}>
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </Button>
      </div>

      {error && <DevKitErrorCard error={error} title="Couldn't load blocklist" onRetry={fetchEntries} context={{ panel: 'Moderation · Blocklist', function: 'admin-moderation', action: 'list_blocklist' }} />}

      {!loading && entries.length === 0 && !error && (
        <p className="text-sm text-center text-muted-foreground py-6">Blocklist is empty</p>
      )}

      <div className="space-y-2">
        {entries.map((e) => (
          <div key={e.id} className="flex items-center gap-3 rounded-lg border border-border px-4 py-2.5 bg-card">
            <span className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border shrink-0',
              e.type === 'email' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
              e.type === 'user_id' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' :
              'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
            )}>
              {e.type}
            </span>
            <span className="text-sm font-mono flex-1 truncate">{e.value}</span>
            {e.reason && <span className="text-xs text-muted-foreground truncate max-w-[160px]">{e.reason}</span>}
            <span className="text-xs text-muted-foreground shrink-0">{fmtDate(e.added_at)}</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
              disabled={removing === e.id}
              onClick={() => removeEntry(e.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Moderation Queue ─────────────────────────────────────────────────────────

function ModerationQueueTab() {
  const isMounted = useIsMounted();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('pending');

  const fetchItems = useCallback(async () => {
    if (!isMounted()) return;
    setLoading(true);
    setError(null);
    try {
      const tuple = await edgeFunctions.functions.invoke(
        'admin-moderation',
        devKitInvokeOptions({ action: 'list_moderation_queue', status_filter: statusFilter }),
      );
      const data = unwrapAdminResponse<{ items: QueueItem[]; total: number }>(tuple, 'admin-moderation');
      if (!isMounted()) return;
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      if (!isMounted()) return;
      setError(formatEdgeError(err));
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted, statusFilter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const review = useCallback(async (id: string, decision: 'approved' | 'removed', suspendUser = false) => {
    setReviewing(id);
    try {
      const tuple = await edgeFunctions.functions.invoke(
        'admin-moderation',
        devKitInvokeOptions({ action: 'review_queue_item', item_id: id, decision, suspend_user: suspendUser }),
      );
      unwrapAdminResponse(tuple, 'admin-moderation');
      toast.success(`Item marked as ${decision}`);
      fetchItems();
    } catch (err) {
      toast.error(formatEdgeError(err));
    } finally {
      setReviewing(null);
    }
  }, [fetchItems]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {['all', 'pending', 'approved', 'removed'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              statusFilter === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-transparent text-muted-foreground border-border hover:border-foreground/30',
            )}
          >
            {s}
          </button>
        ))}
        <Button size="sm" variant="ghost" onClick={fetchItems} disabled={loading} className="ml-auto">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </Button>
      </div>

      {error && <DevKitErrorCard error={error} title="Couldn't load moderation queue" onRetry={fetchItems} context={{ panel: 'Moderation · Queue', function: 'admin-moderation', action: 'list_queue' }} />}

      {!loading && items.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <AlertTriangle className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">No items in queue</p>
        </div>
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-border bg-card px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {statusBadge(item.status)}
              <Badge variant="outline" className="text-[11px]">{item.content_type}</Badge>
              {item.reporter_user_id && (
                <span className="text-[11px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                  reporter: {item.reporter_user_id.slice(0, 8)}…
                </span>
              )}
              <span className="text-xs text-muted-foreground ml-auto">{fmtDate(item.created_at)}</span>
            </div>
            {item.snippet && (
              <p className="text-sm text-muted-foreground line-clamp-2 bg-muted/40 rounded px-2 py-1">
                {item.snippet}
              </p>
            )}
            {item.status === 'pending' && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-green-600 border-green-500/30 hover:bg-green-500/10"
                  disabled={reviewing === item.id}
                  onClick={() => review(item.id, 'approved')}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                  disabled={reviewing === item.id}
                  onClick={() => review(item.id, 'removed')}
                >
                  Remove
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                  disabled={reviewing === item.id}
                  onClick={() => review(item.id, 'removed', true)}
                >
                  Remove + Suspend User
                </Button>
              </div>
            )}
            {item.reviewed_by && (
              <p className="text-xs text-muted-foreground">
                Reviewed by {item.reviewed_by}
                {item.reviewed_at ? ` · ${fmtDate(item.reviewed_at)}` : ''}
              </p>
            )}
          </div>
        ))}
      </div>

      {total > items.length && (
        <p className="text-xs text-center text-muted-foreground">
          Showing {items.length} of {total} items
        </p>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function ModerationPanel() {
  const isMounted = useIsMounted();
  const [activeTab, setActiveTab] = useState<InternalTab>('bugs');
  const [openBugCount, setOpenBugCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchOpenCount() {
      try {
        const tuple = await edgeFunctions.functions.invoke(
          'admin-moderation',
          devKitInvokeOptions({ action: 'list_bug_reports', status_filter: 'open', per_page: 1 }),
        );
        const data = unwrapAdminResponse<{ total: number }>(tuple, 'admin-moderation');
        if (active && isMounted()) setOpenBugCount(data.total ?? 0);
      } catch { /* ignore — badge is non-critical */ }
    }
    fetchOpenCount();
    return () => { active = false; };
  }, [isMounted]);

  const TABS: { id: InternalTab; label: string; icon: React.ElementType; badge?: number | null }[] = [
    { id: 'bugs', label: 'Bug Inbox', icon: Bug, badge: openBugCount },
    { id: 'blocklist', label: 'Blocklist', icon: ShieldBan },
    { id: 'queue', label: 'Moderation Queue', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border pb-1">
        {TABS.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-t text-sm font-medium transition-colors',
              activeTab === id
                ? 'text-foreground border-b-2 border-primary -mb-px'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {badge != null && badge > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'bugs' && <BugInboxTab onCountChange={setOpenBugCount} />}
      {activeTab === 'blocklist' && <BlocklistTab />}
      {activeTab === 'queue' && <ModerationQueueTab />}
    </div>
  );
}
