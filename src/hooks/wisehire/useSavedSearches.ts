import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import { getUserId } from '@/lib/supabaseBridge';
import { toast } from 'sonner';
import type { TalentSearchFilters } from './useTalentPool';

export interface SavedSearch {
  id: string;
  name: string;
  filters: TalentSearchFilters;
  created_at: string;
}

export function useSavedSearches() {
  const { isAuthenticated, supabaseReady } = useAuth();
  const userId = getUserId();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['wisehire-saved-searches', userId],
    queryFn: async (): Promise<SavedSearch[]> => {
      const { data, error } = await supabase
        .from('wisehire_saved_searches')
        .select('id, name, filters, created_at')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SavedSearch[];
    },
    enabled: isAuthenticated && supabaseReady && !!userId,
    staleTime: 60_000,
  });

  const saveSearch = useMutation({
    mutationFn: async ({ name, filters }: { name: string; filters: TalentSearchFilters }) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('wisehire_saved_searches')
        .insert({ owner_id: userId, name, filters });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wisehire-saved-searches', userId] });
      toast.success('Search saved.');
    },
    onError: () => toast.error('Failed to save search.'),
  });

  const deleteSearch = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('wisehire_saved_searches')
        .delete()
        .eq('id', id)
        .eq('owner_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wisehire-saved-searches', userId] });
      toast.success('Search removed.');
    },
    onError: () => toast.error('Failed to remove search.'),
  });

  return { ...query, saveSearch, deleteSearch };
}
