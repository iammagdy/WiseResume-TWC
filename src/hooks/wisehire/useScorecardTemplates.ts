import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import { getUserId } from '@/lib/supabaseBridge';
import { toast } from 'sonner';

export interface ScorecardTemplate {
  id: string;
  title: string;
  description: string | null;
  questions: string[];
  created_at: string;
  updated_at: string;
}

export function useScorecardTemplates() {
  const { isAuthenticated, supabaseReady } = useAuth();
  const userId = getUserId();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['wisehire-scorecard-templates', userId],
    queryFn: async (): Promise<ScorecardTemplate[]> => {
      const { data, error } = await supabase
        .from('wisehire_scorecard_templates')
        .select('id, title, description, questions, created_at, updated_at')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ScorecardTemplate[];
    },
    enabled: isAuthenticated && supabaseReady && !!userId,
    staleTime: 60_000,
  });

  const createTemplate = useMutation({
    mutationFn: async (input: { title: string; description?: string; questions: string[] }) => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('wisehire_scorecard_templates')
        .insert({ owner_id: userId, ...input })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wisehire-scorecard-templates', userId] });
      toast.success('Template saved.');
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to save template'),
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScorecardTemplate> & { id: string }) => {
      const { error } = await supabase
        .from('wisehire_scorecard_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('owner_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wisehire-scorecard-templates', userId] });
      toast.success('Template updated.');
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to update template'),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('wisehire_scorecard_templates')
        .delete()
        .eq('id', id)
        .eq('owner_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wisehire-scorecard-templates', userId] });
      toast.success('Template deleted.');
    },
    onError: () => toast.error('Failed to delete template'),
  });

  return { ...query, createTemplate, updateTemplate, deleteTemplate };
}
