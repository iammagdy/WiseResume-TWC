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
