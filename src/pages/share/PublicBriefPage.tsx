import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { BriefOutput } from '@/components/wisehire/brief/BriefOutput';
import { BriefSkeleton } from '@/components/wisehire/brief/BriefSkeleton';
import type { CandidateBrief } from '@/hooks/wisehire/useBriefs';
import { invokeWisehireAccess } from '@/lib/wisehire/wisehireAccessClient';
import { usePrivateShareMeta } from '@/hooks/wisehire/usePrivateShareMeta';

export default function PublicBriefPage() {
  usePrivateShareMeta('Shared Candidate Brief · WiseHire');
  const { shareToken } = useParams<{ shareToken: string }>();
  const [brief, setBrief] = useState<CandidateBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!shareToken) { setNotFound(true); setLoading(false); return; }

    async function fetchBrief() {
      try {
        const { data, error } = await invokeWisehireAccess<{ brief: Record<string, unknown> | null }>(
          'public-brief',
          { share_token: shareToken! },
        );
        if (error || !data?.brief) { setNotFound(true); return; }
        setBrief({
          owner_id: '',
          candidate_id: '',
          role_id: null,
          ai_model_used: null,
          is_byok: false,
          share_token: null,
          share_token_active: false,
          ...data.brief,
        } as unknown as CandidateBrief);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchBrief();
  }, [shareToken]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-700">
            <span className="text-xs font-black text-white">W</span>
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-sm">WiseHire</span>
          <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">Candidate Brief · Shared View</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {loading ? (
          <BriefSkeleton />
        ) : notFound ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-red-500" aria-hidden="true" />
            </div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Brief not found</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This brief doesn't exist or the share link has been revoked.
            </p>
          </div>
        ) : brief ? (
          <BriefOutput brief={brief} publicView />
        ) : null}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400 dark:text-slate-600">
        Powered by WiseHire · thewise.cloud
      </footer>
    </div>
  );
}
