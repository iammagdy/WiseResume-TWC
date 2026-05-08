import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';

export interface PortfolioHistoryRecord {
  id: string;
  user_id: string;
  portfolio_data: Record<string, unknown>;
  created_at: string;
}

function docToRecord(doc: Record<string, unknown>): PortfolioHistoryRecord {
  const raw = doc.portfolio_data;
  return {
    id: doc.$id as string,
    user_id: doc.user_id as string,
    portfolio_data: typeof raw === 'string'
      ? (JSON.parse(raw) as Record<string, unknown>)
      : (raw as Record<string, unknown>),
    created_at: doc.$createdAt as string,
  };
}

export function usePortfolioHistory(userId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: history = [], isLoading: loading } = useQuery({
    queryKey: ['portfolio-history', userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.portfolio_history, [
        Query.equal('user_id', userId),
        Query.orderDesc('$createdAt'),
        Query.limit(50),
      ]);
      return res.documents.map(d => docToRecord(d as unknown as Record<string, unknown>));
    },
    enabled: !!userId,
  });

  const saveSnapshotMutation = useMutation({
    mutationFn: async (portfolioData: Record<string, unknown>) => {
      if (!userId) throw new Error('No user ID');

      // Dedup: skip the insert when the payload is byte-identical to the most
      // recent snapshot so repeated saves don't pollute history.
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.portfolio_history, [
        Query.equal('user_id', userId),
        Query.orderDesc('$createdAt'),
        Query.limit(1),
      ]);
      const latest = res.documents[0] as unknown as Record<string, unknown> | undefined;
      if (latest) {
        const latestData = typeof latest.portfolio_data === 'string'
          ? JSON.parse(latest.portfolio_data as string)
          : latest.portfolio_data;
        if (JSON.stringify(latestData) === JSON.stringify(portfolioData)) return null;
      }

      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.portfolio_history,
        ID.unique(),
        {
          user_id: userId,
          portfolio_data: JSON.stringify(portfolioData),
        },
      );
      return docToRecord(doc as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-history', userId] });
    },
  });

  const deleteSnapshotMutation = useMutation({
    mutationFn: async (id: string) => {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.portfolio_history, id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-history', userId] });
    },
  });

  return {
    history,
    loading,
    saveSnapshot: saveSnapshotMutation.mutateAsync,
    isSaving: saveSnapshotMutation.isPending,
    deleteSnapshot: deleteSnapshotMutation.mutateAsync,
  };
}
