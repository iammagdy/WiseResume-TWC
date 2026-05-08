import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, ID, Query } from '@/lib/appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Models } from 'appwrite';

export interface Scorecard {
  id: string;
  owner_id: string;
  candidate_id: string;
  brief_id: string | null;
  questions: string[];
  ratings: (number | null)[];
  notes: string[];
  overall_score: number | null;
  submitted_at: string | null;
  share_token: string;
  share_token_active: boolean;
  created_at: string;
}

function docToScorecard(doc: Models.Document): Scorecard {
  return { ...doc, id: doc.$id } as unknown as Scorecard;
}

export function useScorecards(candidateId: string) {
  return useQuery({
    queryKey: ['scorecards', candidateId],
    queryFn: async () => {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.wisehire_scorecards, [
        Query.equal('candidate_id', candidateId),
        Query.orderDesc('created_at'),
      ]);
      return res.documents.map(docToScorecard);
    },
    enabled: Boolean(candidateId),
  });
}

export function useScorecard(scorecardId: string | undefined) {
  return useQuery({
    queryKey: ['scorecard', scorecardId],
    queryFn: async () => {
      const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.wisehire_scorecards, scorecardId!);
      return docToScorecard(doc);
    },
    enabled: Boolean(scorecardId),
  });
}

export function usePublicScorecard(shareToken: string | undefined) {
  return useQuery({
    queryKey: ['public-scorecard', shareToken],
    queryFn: async () => {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.wisehire_scorecards, [
        Query.equal('share_token', shareToken!),
        Query.equal('share_token_active', true),
        Query.limit(1),
      ]);
      return res.total > 0 ? docToScorecard(res.documents[0]) : null;
    },
    enabled: Boolean(shareToken),
    retry: false,
  });
}

export function useCreateScorecard() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      candidateId,
      briefId,
      questions,
    }: {
      candidateId: string;
      briefId?: string;
      questions: string[];
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.wisehire_scorecards,
        ID.unique(),
        {
          owner_id: user.id,
          candidate_id: candidateId,
          brief_id: briefId ?? null,
          questions,
          ratings: new Array(questions.length).fill(null),
          notes: new Array(questions.length).fill(''),
          share_token: crypto.randomUUID(),
          share_token_active: true,
        },
      );

      return docToScorecard(doc);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['scorecards', data.candidate_id] });
    },
    onError: () => {
      toast.error('Failed to create scorecard');
    },
  });
}

export function useSaveScorecard() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ratings,
      notes,
      submit = false,
    }: {
      id: string;
      ratings: (number | null)[];
      notes: string[];
      submit?: boolean;
    }) => {
      const filled = ratings.filter((r) => r !== null && r > 0);
      const overall = filled.length
        ? Math.round((filled.reduce((a, b) => a + (b ?? 0), 0) / filled.length) * 10) / 10
        : null;

      const patch: Record<string, unknown> = { ratings, notes, overall_score: overall };
      if (submit) patch.submitted_at = new Date().toISOString();

      const doc = await databases.updateDocument(DATABASE_ID, COLLECTIONS.wisehire_scorecards, id, patch);
      return docToScorecard(doc);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['scorecard', data.id] });
      qc.invalidateQueries({ queryKey: ['scorecards', data.candidate_id] });
      toast.success(data.submitted_at ? 'Scorecard submitted' : 'Draft saved');
    },
    onError: () => {
      toast.error('Failed to save scorecard');
    },
  });
}

export function useRevokeShareToken() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const doc = await databases.updateDocument(DATABASE_ID, COLLECTIONS.wisehire_scorecards, id, {
        share_token: crypto.randomUUID(),
        share_token_active: true,
      });
      return docToScorecard(doc);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['scorecard', data.id] });
      qc.invalidateQueries({ queryKey: ['scorecards', data.candidate_id] });
      toast.success('Share link revoked — a new link has been generated');
    },
    onError: () => {
      toast.error('Failed to revoke share link');
    },
  });
}
