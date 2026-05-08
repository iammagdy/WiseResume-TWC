import { useState, useEffect } from 'react';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { History, User, Terminal, Calendar, ShieldCheck } from 'lucide-react';

export const AuditLogPanel = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await databases.listDocuments(DATABASE_ID, 'audit_logs', [
        Query.orderDesc('$createdAt'),
        Query.limit(25)
      ]);
      setLogs(res.documents);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-bold flex items-center gap-2 italic uppercase tracking-tighter"><History size={20}/> Security Audit Trail</h3>
        <span className="text-[10px] font-mono text-blue-400 bg-blue-500/5 px-2 py-1 rounded-full border border-blue-500/10">Appwrite Frankfurt Feed</span>
      </div>

      <div className="space-y-2">
        {logs.map(log => (
          <div key={log.$id} className="p-4 rounded-2xl bg-card border border-border flex items-start gap-4 hover:border-blue-500/20 transition-all">
            <div className="p-2 bg-white/5 rounded-xl text-blue-400"><ShieldCheck size={16}/></div>
            <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black uppercase text-white">{log.action || 'AUTH_EVENT'}</span>
                  <span className="text-[10px] text-muted-foreground">• {new Date(log.$createdAt).toLocaleString()}</span>
               </div>
               <p className="text-sm text-muted-foreground truncate">{log.details || 'System generated event'}</p>
               <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-white/30 uppercase">
                  <span className="flex items-center gap-1"><User size={10}/> {log.user_id?.slice(0,8) || 'SYSTEM'}</span>
                  <span className="flex items-center gap-1"><Terminal size={10}/> {log.$id.slice(-6)}</span>
               </div>
            </div>
          </div>
        ))}
        {!loading && logs.length === 0 && (
          <div className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-3xl">No logs found in Appwrite.</div>
        )}
      </div>
    </div>
  );
};
