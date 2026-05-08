import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { databases, Query } from '@/lib/appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
import { BriefOutput } from '@/components/wisehire/brief/BriefOutput';
import { BriefSkeleton } from '@/components/wisehire/brief/BriefSkeleton';
import type { CandidateBrief } from '@/hooks/wisehire/useBriefs';

export default function PublicBriefPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [brief, setBrief] = useState<CandidateBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!shareToken) { setNotFound(true); setLoading(false); return; }

    async function fetchBrief() {
      try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.wisehire_candidate_briefs, [
          Query.equal('share_token', shareToken!),
          Query.equal('share_token_active', true),
          Query.limit(1),
        ]);

        if (res.total === 0) { setNotFound(true); return; }

        const doc = res.documents[0];

        let candidate: { name: string; email: string } | null = null;
        let role: { title: string } | null = null;

        if (doc.candidate_id) {
          try {
            const candidateDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.wisehire_candidates, doc.candidate_id as string);
            candidate = { name: candidateDoc.name as string, email: candidateDoc.email as string };
          } catch { /* ignore — show brief without candidate name */ }
        }

        if (doc.role_id) {
          try {
            const roleDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.wisehire_roles, doc.role_id as string);
            role = { title: roleDoc.title as string };
          } catch { /* ignore — show brief without role title */ }
        }

        setBrief({ ...doc, id: doc.$id, candidate, role } as unknown as CandidateBrief);
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
              <span className="text-red-500 text-xl">✕</span>
            </div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Brief not found</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This brief doesn't exist or the share link has been revoked.
            </p>
          </div>
        ) : brief ? (
          <BriefOutput brief={brief} />
        ) : null}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400 dark:text-slate-600">
        Powered by WiseHire · thewise.cloud
      </footer>
    </div>
  );
}
