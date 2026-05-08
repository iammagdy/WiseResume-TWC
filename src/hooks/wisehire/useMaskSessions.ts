import { useQuery, useQueryClient } from '@tanstack/react-query';
import { databases, Query } from '@/lib/appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
import { useAuth } from '@/hooks/useAuth';
import type { MaskResult } from './useMaskCVs';

export interface MaskSession {
  id: string;
  owner_id: string;
  created_at: string;
  results: MaskResult[];
}

export function useMaskSessions() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['mask-sessions', userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.wisehire_mask_sessions, [
        Query.equal('owner_id', userId),
        Query.orderDesc('created_at'),
        Query.limit(5),
      ]);
      return res.documents.map((doc) => ({
        id: doc.$id,
        owner_id: doc.owner_id as string,
        created_at: doc.created_at as string,
        results: (doc.results ?? []) as MaskResult[],
      }));
    },
    enabled: !!userId,
  });
}

export function useInvalidateMaskSessions() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return () => qc.invalidateQueries({ queryKey: ['mask-sessions', user?.id] });
}
