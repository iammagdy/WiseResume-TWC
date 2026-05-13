import { useState, useCallback, useEffect } from 'react';
import { Briefcase, UserPlus, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { devKitCall } from '@/lib/devkit/devKitClient';
import { DevKitErrorCard } from './DevKitErrorCard';

interface WaitlistEntry {
  $id: string;
  name?: string;
  email?: string;
  company_name?: string;
  $createdAt: string;
}

interface WaitlistResponse {
  entries: WaitlistEntry[];
  total: number;
  missing_collection?: boolean;
}

interface ApproveResponse {
  approved: boolean;
  email?: string;
  emailSent: boolean;
}

export const WiseHireWaitlistPanel = () => {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingCollection, setMissingCollection] = useState(false);
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());

  const fetchWaitlist = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await devKitCall<WaitlistResponse>({ action: 'list-wisehire-waitlist' });
    if (result.ok) {
      setEntries(result.data.entries);
      setMissingCollection(!!result.data.missing_collection);
    } else {
      setError(result.error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchWaitlist(); }, [fetchWaitlist]);

  const handleApprove = async (id: string) => {
    setApprovingIds(prev => new Set(prev).add(id));
    const result = await devKitCall<ApproveResponse>({ action: 'approve-wisehire-waitlist', payload: { waitlist_id: id } });
    if (result.ok) {
      setEntries(prev => prev.filter(e => e.$id !== id));
      if (result.data.emailSent) {
        toast.success('Access granted — invite email sent!');
      } else {
        toast.success('Access granted — entry removed from waitlist.');
      }
    } else {
      toast.error(`Failed to grant access: ${result.error.message}`);
    }
    setApprovingIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="flex items-center gap-3 text-white/60">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-semibold">Loading waitlist…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <DevKitErrorCard
        error={error}
        title="Failed to load WiseHire waitlist"
        onRetry={fetchWaitlist}
        context={{ panel: 'WiseHire Waitlist', action: 'list-wisehire-waitlist' }}
      />
    );
  }

  if (missingCollection) {
    return (
      <div className="p-12 text-center text-white/40 border border-dashed border-white/10 rounded-3xl">
        <Briefcase className="mx-auto mb-3 opacity-40" size={32} />
        <p className="font-bold uppercase tracking-widest text-sm">WiseHire waitlist collection not found</p>
        <p className="text-xs mt-2 text-white/25">The wisehire_waitlist collection has not been created yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map(e => (
        <div key={e.$id} className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400"><Briefcase size={22} /></div>
            <div>
              <p className="font-black text-lg text-white tracking-tight">{e.name ?? '—'}</p>
              <p className="text-sm text-blue-400/60 font-medium">
                {e.email ?? 'No email'}{e.company_name ? ` • ${e.company_name}` : ''}
              </p>
              <div className="flex items-center gap-2 mt-2 text-[10px] uppercase font-bold text-white/40">
                <Clock size={12} /> Request Date: {new Date(e.$createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
          <Button
            onClick={() => handleApprove(e.$id)}
            disabled={approvingIds.has(e.$id)}
            className="rounded-2xl h-10 px-6 bg-white text-black hover:bg-white/90 font-bold uppercase italic disabled:opacity-50"
          >
            {approvingIds.has(e.$id)
              ? <Loader2 size={16} className="mr-2 animate-spin" />
              : <UserPlus size={16} className="mr-2" />
            }
            {approvingIds.has(e.$id) ? 'Approving…' : 'Grant Access'}
          </Button>
        </div>
      ))}
      {entries.length === 0 && (
        <div className="p-12 text-center text-white/40 border border-dashed border-white/10 rounded-3xl uppercase font-black italic tracking-widest opacity-50">
          Waitlist Empty
        </div>
      )}
    </div>
  );
};
