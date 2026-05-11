import { useState, useEffect, useCallback } from 'react';
import { History, User, Terminal, RefreshCw, Loader2 } from 'lucide-react';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { DevKitErrorCard } from './DevKitErrorCard';
import { Button } from '@/components/ui/button';

interface AuditEntry {
  $id: string;
  $createdAt: string;
  action: string;
  category: string | null;
  metadata: string | null;
  user_id: string | null;
  details?: string | null;
}

export const AuditLogPanel = () => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: { action: 'list-audit-logs', limit: 25 },
      });
      const result = unwrapAdminResponse<{ data?: { documents?: AuditEntry[]; total?: number } }>(
        tuple,
        'admin-devkit-data',
      );
      setLogs(result.data?.documents ?? []);
      setTotal(result.data?.total ?? 0);
    } catch (e) {
      setError(formatEdgeError(e, 'Failed to load audit logs'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-white font-bold flex items-center gap-2 italic uppercase tracking-tighter">
            <History size={20} /> Security Audit Trail
          </h3>
          {!loading && !error && (
            <p className="text-xs text-white/40 mt-0.5">{total.toLocaleString()} total entries</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-blue-400 bg-blue-500/5 px-2 py-1 rounded-full border border-blue-500/10">
            Appwrite Cloud Feed
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchLogs}
            disabled={loading}
            className="rounded-xl border-white/10 bg-white/5 h-8 w-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 gap-3 text-white/40">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading audit logs…</span>
        </div>
      )}

      {!loading && error && (
        <DevKitErrorCard
          error={error}
          title="Failed to load audit logs"
          onRetry={fetchLogs}
          context={{ panel: 'AuditLogPanel', action: 'list-audit-logs' }}
        />
      )}

      {!loading && !error && (
        <div className="space-y-2">
          {logs.map(log => (
            <div
              key={log.$id}
              className="p-4 rounded-2xl bg-card border border-border flex items-start gap-4 hover:border-blue-500/20 transition-all"
            >
              <div className="p-2 bg-white/5 rounded-xl text-blue-400 shrink-0">
                <History size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black uppercase text-white">
                    {log.action || 'EVENT'}
                  </span>
                  {log.category && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 font-mono uppercase">
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

          {logs.length === 0 && (
            <div className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-3xl">
              No audit log entries found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
