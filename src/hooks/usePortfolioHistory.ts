import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';

export interface PortfolioHistoryRecord {
  id: string;
  user_id: string;
  portfolio_data: Record<string, unknown>;
  created_at: string;
}

export function usePortfolioHistory(userId: string | undefined) {
  const queryClient = useQueryClient();

  // Fetch history list
  const { data: history = [], isLoading: loading } = useQuery({
    queryKey: ['portfolio-history', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('portfolio_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching portfolio history:', error);
        throw error;
      }
      return data as PortfolioHistoryRecord[];
    },
    enabled: !!userId,
  });

  // Save history snapshot
  const saveSnapshotMutation = useMutation({
    mutationFn: async (portfolioData: Record<string, unknown>) => {
      if (!userId) throw new Error('No user ID');

      // Dedup: skip the insert when the payload is byte-identical to the most
      // recent snapshot.  Repeated saves with no real change would otherwise
      // pollute the history list with duplicate entries the user can't tell
      // apart, push older meaningful snapshots off any retention window, and
      // waste storage on the JSONB column.  Comparison is done over the full
      // serialized payload so a key-order shuffle is treated as a no-op.
      const { data: latestRows } = await supabase
        .from('portfolio_history')
        .select('portfolio_data')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      const latest = latestRows?.[0]?.portfolio_data as Record<string, unknown> | undefined;
      if (latest && JSON.stringify(latest) === JSON.stringify(portfolioData)) {
        return null;
      }

      const { data, error } = await supabase
        .from('portfolio_history')
        .insert({
          user_id: userId,
          portfolio_data: portfolioData
        })
        .select()
        .single();

      if (error) throw error;
      return data as PortfolioHistoryRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-history', userId] });
    }
  });

  // Delete history snapshot (optional utility)
  const deleteSnapshotMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('portfolio_history')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-history', userId] });
    }
  });

  return {
    history,
    loading,
    saveSnapshot: saveSnapshotMutation.mutateAsync,
    isSaving: saveSnapshotMutation.isPending,
    deleteSnapshot: deleteSnapshotMutation.mutateAsync
  };
}
