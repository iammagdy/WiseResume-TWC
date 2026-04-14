import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { CompanyBriefing } from '@/types/companyBriefing';

export interface SavedCompanyBriefing {
  id: string;
  user_id: string;
  company_name: string;
  briefing: CompanyBriefing;
  created_at: string;
}

export function useCompanyBriefingLibrary() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['company-briefings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_briefings')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SavedCompanyBriefing[];
    },
    enabled: !!user,
  });
}

export function useSaveCompanyBriefing() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { company_name: string; briefing: CompanyBriefing }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('company_briefings')
        .insert({
          user_id: user.id,
          company_name: input.company_name,
          briefing: input.briefing as unknown as Record<string, unknown>,
        })
        .select()
        .single();
      if (error) throw error;
      return data as SavedCompanyBriefing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-briefings'] });
      toast.success('Briefing saved!');
    },
    onError: () => toast.error('Failed to save briefing'),
  });
}

export function useDeleteCompanyBriefing() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('company_briefings')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-briefings'] });
      toast.success('Briefing deleted');
    },
    onError: () => toast.error('Failed to delete briefing'),
  });
}
