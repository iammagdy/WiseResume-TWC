import { useState, useEffect, useCallback } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { History, User, Terminal, RefreshCw, Search, Filter, ChevronDown } from 'lucide-react';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { DevKitErrorCard } from './DevKitErrorCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AuditEntry {
  $id: string;
  $createdAt: string;
  action: string;
  category: string | null;
  metadata: string | null;
  user_id: string | null;
  details?: string | null;
}

const PAGE_SIZE = 25;

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'auth', label: 'Auth' },
  { value: 'plan', label: 'Plan' },
  { value: 'credits', label: 'Credits' },
  { value: 'feature_flag', label: 'Feature Flags' },
  { value: 'moderation', label: 'Moderation' },
  { value: 'wisehire', label: 'WiseHire' },
  { value: 'system', label: 'System' },
];

const DATE_RANGE_OPTIONS: { value: '' | '24h' | '7d' | '30d'; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '', label: 'All' },
];

const CATEGORY_COLORS: Record<string, string> = {
  auth: 'bg-blue-500/10 text-blue-400',
  plan: 'bg-amber-500/10 text-amber-400',
  credits: 'bg-emerald-500/10 text-emerald-400',
  feature_flag: 'bg-violet-500/10 text-violet-400',
  moderation: 'bg-red-500/10 text-red-400',
  wisehire: 'bg-cyan-500/10 text-cyan-400',
  system: 'bg-white/8 text-white/40',
};

export const AuditLogPanel = () => {
  const [allLogs, setAllLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateRange, setDateRange] = useState<'' | '24h' | '7d' | '30d'>('7d');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);

  const buildDateFrom = (range: '' | '24h' | '7d' | '30d'): string | undefined => {
    if (range === '') return undefined;
    const msMap = { '24h': 86_400_000, '7d': 7 * 86_400_000, '30d': 30 * 86_400_000 };
    return new Date(Date.now() - msMap[range]).toISOString();
  };

  const fetchLogs = useCallback(async (
    append = false,
    currentOffset = 0,
    cat = categoryFilter,
    range = dateRange,
  ) => {
    if (append) setLoadingMore(true);
    else { setLoading(true); setError(null); }
    try {
      const date_from = buildDateFrom(range);
      const body: Record<string, unknown> = {
        action: 'list-audit-logs',
        limit: PAGE_SIZE,
        offset: currentOffset,
      };
      if (cat) body.category = cat;
      if (date_from) body.date_from = date_from;

      const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body,
      });
      const result = unwrapAdminResponse<{ documents?: AuditEntry[]; total?: number }>(
        tuple,
        'admin-devkit-data',
      );
      const docs = result.documents ?? [];
      const tot = result.total ?? 0;
      if (append) {
        setAllLogs(prev => [...prev, ...docs]);
      } else {
        setAllLogs(docs);
      }
      setTotal(tot);
    } catch (e) {
      if (!append) setError(formatEdgeError(e, 'Failed to load audit logs'));
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchLogs(false, 0, categoryFilter, dateRange); }, [fetchLogs]);

  // Re-fetch from page 0 whenever server-side filters change
  useEffect(() => {
    setOffset(0);
    setAllLogs([]);
    fetchLogs(false, 0, categoryFilter, dateRange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, dateRange]);

  const handleRefresh = () => {
    setOffset(0);
    setSearch('');
    setCategoryFilter('');
    setDateRange('7d');
    fetchLogs(false, 0, '', '7d');
  };

  const handleLoadMore = () => {
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    fetchLogs(true, newOffset, categoryFilter, dateRange);
  };

  // Only search is client-side; category and date are server-side
  const filtered = allLogs.filter(log => {
    if (search === '') return true;
    const q = search.toLowerCase();
    return (
      (log.action ?? '').toLowerCase().includes(q) ||
      (log.details ?? '').toLowerCase().includes(q) ||
      (log.metadata ?? '').toLowerCase().includes(q) ||
      (log.user_id ?? '').toLowerCase().includes(q)
    );
  });

  const selectedCatLabel = CATEGORY_OPTIONS.find(c => c.value === categoryFilter)?.label ?? 'All Categories';
  const hasMore = allLogs.length < total;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-white font-bold flex items-center gap-2 italic uppercase tracking-tighter">
            <History size={20} /> Security Audit Trail
          </h3>
          {!loading && !error && (
            <p className="text-xs text-white/40 mt-0.5">
              {total.toLocaleString()} total entries
              {filtered.length !== allLogs.length && (
                <span className="ml-2 text-blue-400">{filtered.length} matching filter</span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-blue-400 bg-blue-500/5 px-2 py-1 rounded-full border border-blue-500/10">
            Appwrite Cloud Feed
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            className="rounded-xl border-white/10 bg-white/5 h-8 w-8"
          >
            {loading ? <MiniSpinner size={14} /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Search + Filter bar */}
      {!loading && !error && (
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <Input
              placeholder="Search action, details, user ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 rounded-xl h-9 text-sm text-white placeholder:text-white/30 focus-visible:border-white/20"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowCategoryMenu(v => !v)}
              className="flex items-center gap-2 h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 hover:text-white hover:border-white/20 transition-all"
            >
              <Filter size={14} />
              <span className="text-xs font-semibold">{selectedCatLabel}</span>
              <ChevronDown size={12} />
            </button>
            {showCategoryMenu && (
              <div className="absolute top-10 right-0 z-50 bg-[#111] border border-white/10 rounded-2xl p-1.5 shadow-2xl min-w-[160px]">
                {CATEGORY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setCategoryFilter(opt.value); setShowCategoryMenu(false); }}
                    className={cn(
                      'w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                      categoryFilter === opt.value
                        ? 'bg-blue-600 text-white'
                        : 'text-white/60 hover:bg-white/8 hover:text-white',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Date range segmented filter */}
          <div className="flex gap-1 p-0.5 rounded-xl bg-white/5 border border-white/10">
            {DATE_RANGE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDateRange(opt.value)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition-all',
                  dateRange === opt.value
                    ? 'bg-white text-black'
                    : 'text-white/40 hover:text-white/70',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12 gap-3 text-white/40">
          <MiniSpinner size={20} />
          <span className="text-sm">Loading audit logs…</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <DevKitErrorCard
          error={error}
          title="Failed to load audit logs"
          onRetry={() => fetchLogs(false, 0)}
          context={{ panel: 'AuditLogPanel', action: 'list-audit-logs' }}
        />
      )}

      {/* Logs */}
      {!loading && !error && (
        <div className="space-y-2">
          {filtered.map(log => (
            <div
              key={log.$id}
              className="p-4 rounded-2xl bg-card border border-border flex items-start gap-4 hover:border-blue-500/20 transition-all"
            >
              <div className="p-2 bg-white/5 rounded-xl text-blue-400 shrink-0">
                <History size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-black uppercase text-white">
                    {log.action || 'EVENT'}
                  </span>
                  {log.category && (
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-md font-mono uppercase',
                      CATEGORY_COLORS[log.category] ?? 'bg-white/8 text-white/40',
                    )}>
                      {log.category}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                    {new Date(log.$createdAt).toLocaleString()}
                  </span>
                </div>
                {(log.details || log.metadata) && (
                  <p className="text-sm text-muted-foreground truncate">
                    {log.details || log.metadata}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-white/30 uppercase">
                  <span className="flex items-center gap-1">
                    <User size={10} /> {log.user_id ? log.user_id.slice(0, 8) : 'SYSTEM'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Terminal size={10} /> {log.$id.slice(-6)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-3xl">
              {search || categoryFilter ? 'No entries match the current filter.' : 'No audit log entries found.'}
            </div>
          )}

          {/* Load More */}
          {hasMore && (
            <div className="pt-2 flex justify-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-2xl border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 gap-2"
              >
                {loadingMore ? <MiniSpinner size={16} /> : null}
                {loadingMore ? 'Loading…' : `Load more (${total - allLogs.length} remaining)`}
              </Button>
            </div>
          )}
          {!hasMore && allLogs.length > 0 && (
            <p className="text-center text-[11px] text-white/20 pt-2">
              All {total.toLocaleString()} entries loaded
            </p>
          )}
        </div>
      )}
    </div>
  );
};
