import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, Query } from '@/lib/appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Models } from 'appwrite';

export interface CandidateBrief {
  id: string;
  owner_id: string;
  candidate_id: string;
  role_id: string | null;
  match_score: number | null;
  strengths: string[] | null;
  concerns: string[] | null;
  interview_questions: string[] | null;
  employment_notes: string | null;
  ai_model_used: string | null;
  is_byok: boolean;
  share_token: string | null;
  share_token_active: boolean;
  created_at: string;
  candidate?: { name: string; email: string } | null;
  role?: { title: string } | null;
}

async function fetchRelated(
  docs: Models.Document[],
): Promise<{ candidateMap: Record<string, { name: string; email: string | null }>; roleMap: Record<string, { title: string }> }> {
  const candidateIds = [...new Set(docs.map((b) => b.candidate_id as string).filter(Boolean))];
  const roleIds = [...new Set(docs.map((b) => b.role_id as string).filter(Boolean))];

  const [candidates, roles] = await Promise.all([
    Promise.all(candidateIds.map((id) =>
      databases.getDocument(DATABASE_ID, COLLECTIONS.wisehire_candidates, id).catch(() => null),
    )),
    Promise.all(roleIds.map((id) =>
      databases.getDocument(DATABASE_ID, COLLECTIONS.wisehire_roles, id).catch(() => null),
    )),
  ]);

  const candidateMap: Record<string, { name: string; email: string | null }> = {};
  for (const c of candidates) {
    if (c) candidateMap[c.$id] = { name: c.name as string, email: (c.email as string | null) ?? null };
  }

  const roleMap: Record<string, { title: string }> = {};
  for (const r of roles) {
    if (r) roleMap[r.$id] = { title: r.title as string };
  }

  return { candidateMap, roleMap };
}

function mergeDoc(doc: Models.Document, candidateMap: Record<string, { name: string; email: string | null }>, roleMap: Record<string, { title: string }>): CandidateBrief {
  return {
    ...doc,
    id: doc.$id,
    candidate: doc.candidate_id ? (candidateMap[doc.candidate_id as string] ?? null) : null,
    role: doc.role_id ? (roleMap[doc.role_id as string] ?? null) : null,
  } as unknown as CandidateBrief;
}

export function useBriefs() {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['wisehire-briefs', userId],
    queryFn: async (): Promise<CandidateBrief[]> => {
      if (!userId) return [];
      const briefsRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.wisehire_candidate_briefs, [
        Query.equal('owner_id', userId),
        Query.orderDesc('created_at'),
        Query.limit(5000),
      ]);
      if (briefsRes.total === 0) return [];
      const { candidateMap, roleMap } = await fetchRelated(briefsRes.documents);
      return briefsRes.documents.map((d) => mergeDoc(d, candidateMap, roleMap));
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 60 * 1000,
  });

  const revokeShareToken = useMutation({
    mutationFn: async (briefId: string) => {
      const newToken = crypto.randomUUID();
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.wisehire_candidate_briefs, briefId, {
        share_token: newToken,
        share_token_active: true,
      });
      return newToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wisehire-briefs', userId] });
      toast.success('Share link regenerated. The old link is now invalid.');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke share link');
    },
  });

  return { ...query, revokeShareToken };
}

export function useBrief(briefId: string | undefined) {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['wisehire-brief', briefId],
    queryFn: async (): Promise<CandidateBrief | null> => {
      if (!userId || !briefId) return null;
      try {
        const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.wisehire_candidate_briefs, briefId);
        const { candidateMap, roleMap } = await fetchRelated([doc]);
        return mergeDoc(doc, candidateMap, roleMap);
      } catch (err) {
        console.warn('[useBrief] fetch error:', err);
        return null;
      }
    },
    enabled: isAuthenticated && !!userId && !!briefId,
    staleTime: 2 * 60 * 1000,
  });
}
