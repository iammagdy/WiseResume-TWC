import { useState, useEffect, useCallback } from 'react';
import { Database, Search, Clock, Layout, User, Loader2, RefreshCw } from 'lucide-react';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { DevKitErrorCard } from './DevKitErrorCard';
import { Button } from '@/components/ui/button';

interface ResumeDoc {
  $id: string;
  $createdAt: string;
  title: string;
  user_id: string;
  [key: string]: unknown;
}

export const DatabaseXRay = () => {
  const [resumes, setResumes] = useState<ResumeDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResumes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: { action: 'list-all-resumes', limit: 20 },
      });
      const result = unwrapAdminResponse<{ data?: { documents?: ResumeDoc[]; total?: number } }>(
        tuple,
        'admin-devkit-data',
      );
      setResumes(result.data?.documents ?? []);
      setTotal(result.data?.total ?? 0);
    } catch (e) {
      setError(formatEdgeError(e, 'Failed to load resumes'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchResumes(); }, [fetchResumes]);

  const filtered = resumes.filter(r => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (r.title ?? '').toLowerCase().includes(q) ||
      (r.user_id ?? '').toLowerCase().includes(q) ||
      r.$id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-white/60">
          <Database size={16} />
          <span className="text-sm font-semibold">
            {loading ? 'Loading…' : `${total.toLocaleString()} total resumes`}
          </span>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={fetchResumes}
          disabled={loading}
          className="rounded-xl border-white/10 bg-white/5 h-8 w-8"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search by title, user ID, or document ID…"
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-blue-500/50 transition-all"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 gap-3 text-white/40">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading resumes…</span>
        </div>
      )}

      {!loading && error && (
        <DevKitErrorCard
          error={error}
          title="Failed to load resumes"
          onRetry={fetchResumes}
          context={{ panel: 'DatabaseXRay', action: 'list-all-resumes' }}
        />
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(r => (
            <div
              key={r.$id}
              className="p-5 rounded-3xl bg-card border border-border flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    <Layout size={16} />
                  </div>
                  <h4 className="font-bold text-white truncate max-w-[150px]">{r.title || '(untitled)'}</h4>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground bg-white/5 px-2 py-1 rounded-full">
                  {r.$id.slice(-6)}
                </span>
              </div>

              <div className="flex items-center gap-6 text-[10px] uppercase font-black text-muted-foreground tracking-tighter">
                <span className="flex items-center gap-1">
                  <User size={12} /> {(r.user_id ?? 'unknown').slice(0, 8)}…
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {new Date(r.$createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#05050a] border border-white/5 font-mono text-[10px] text-emerald-400/70 overflow-hidden h-24">
                {JSON.stringify(r).slice(0, 300)}…
              </div>
            </div>
          ))}

          {filtered.length === 0 && resumes.length > 0 && (
            <div className="col-span-2 p-8 text-center text-muted-foreground border border-dashed border-border rounded-3xl">
              No resumes match "{searchTerm}"
            </div>
          )}

          {filtered.length === 0 && resumes.length === 0 && (
            <div className="col-span-2 p-8 text-center text-muted-foreground border border-dashed border-border rounded-3xl">
              No resumes found in the database.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
