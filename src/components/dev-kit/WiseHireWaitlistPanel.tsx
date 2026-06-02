import { useState, useCallback, useEffect } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Briefcase, UserPlus, Clock, X, AlertTriangle } from 'lucide-react';
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

interface Props {
  onBadgeClear?: () => void;
}

export const WiseHireWaitlistPanel = ({ onBadgeClear }: Props) => {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingCollection, setMissingCollection] = useState(false);
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());
  const [pendingApprove, setPendingApprove] = useState<WaitlistEntry | null>(null);

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

  const handleDismiss = async (id: string) => {
    setDismissingIds(prev => new Set(prev).add(id));
    const result = await devKitCall<{ dismissed: boolean; email?: string }>({
      action: 'dismiss-wisehire-waitlist',
      payload: { waitlist_id: id },
    });
    if (result.ok) {
      setEntries(prev => {
        const next = prev.filter(e => e.$id !== id);
        if (next.length === 0) onBadgeClear?.();
        return next;
      });
      toast.success('Applicant dismissed.');
    } else {
      toast.error(`Failed to dismiss: ${result.error.message}`);
    }
    setDismissingIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const executeApprove = async (entry: WaitlistEntry) => {
    setPendingApprove(null);
    setApprovingIds(prev => new Set(prev).add(entry.$id));
    const result = await devKitCall<ApproveResponse>({
      action: 'approve-wisehire-waitlist',
      payload: { waitlist_id: entry.$id },
    });
    if (result.ok) {
      setEntries(prev => {
        const next = prev.filter(e => e.$id !== entry.$id);
        if (next.length === 0) onBadgeClear?.();
        return next;
      });
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
      next.delete(entry.$id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="flex items-center gap-3 text-white/60">
          <MiniSpinner size={20} />
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
      {/* Approve Confirmation Modal */}
      {pendingApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0e0e0e] p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <UserPlus size={24} />
              </div>
              <div>
                <h3 className="font-black text-white text-lg tracking-tight">Grant WiseHire Access?</h3>
                <p className="text-sm text-white/40 mt-0.5">This action will create or upgrade an account.</p>
              </div>
            </div>

            <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-1">
              <p className="font-bold text-white">{pendingApprove.name ?? '—'}</p>
              <p className="text-sm text-blue-400/70">{pendingApprove.email ?? 'No email'}</p>
              {pendingApprove.company_name && (
                <p className="text-xs text-white/40">{pendingApprove.company_name}</p>
              )}
            </div>

            <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 px-4 py-3 flex items-start gap-3">
              <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/60 leading-relaxed">
                A WiseHire recruiter account will be created or upgraded. An invite email will be sent if email is configured.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setPendingApprove(null)}
                className="flex-1 rounded-2xl border-white/10 bg-white/5 text-white/60 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => executeApprove(pendingApprove)}
                className="flex-1 rounded-2xl bg-white text-black hover:bg-white/90 font-bold"
              >
                <UserPlus size={16} className="mr-2" />
                Confirm Access
              </Button>
            </div>
          </div>
        </div>
      )}

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
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleDismiss(e.$id)}
              disabled={dismissingIds.has(e.$id) || approvingIds.has(e.$id)}
              variant="outline"
              className="rounded-2xl h-10 px-4 border-white/10 bg-white/5 text-white/50 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 font-bold uppercase italic disabled:opacity-30"
            >
              {dismissingIds.has(e.$id)
                ? <MiniSpinner size={14} className="mr-1.5" />
                : <X size={14} className="mr-1.5" />
              }
              {dismissingIds.has(e.$id) ? 'Dismissing…' : 'Dismiss'}
            </Button>
            <Button
              onClick={() => setPendingApprove(e)}
              disabled={approvingIds.has(e.$id) || dismissingIds.has(e.$id)}
              className="rounded-2xl h-10 px-6 bg-white text-black hover:bg-white/90 font-bold uppercase italic disabled:opacity-50"
            >
              {approvingIds.has(e.$id)
                ? <MiniSpinner size={16} className="mr-2" />
                : <UserPlus size={16} className="mr-2" />
              }
              {approvingIds.has(e.$id) ? 'Approving…' : 'Grant Access'}
            </Button>
          </div>
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
