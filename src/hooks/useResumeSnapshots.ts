import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface ResumeSnapshot {
  id: string;
  user_id: string;
  resume_id: string | null;
  name: string;
  resume_json: Json;
  ats_score: number | null;
  created_at: string;
}

export function useResumeSnapshots(resumeId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['resume-snapshots', resumeId, user?.id],
    queryFn: async () => {
      const query = supabase
        .from('resume_snapshots')
        .select('*')
        .order('created_at', { ascending: false });

      if (resumeId) {
        query.eq('resume_id', resumeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ResumeSnapshot[];
    },
    enabled: !!user,
  });
}

export function useSaveResumeSnapshot() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      resume_id?: string;
      name: string;
      resume_json: Json;
      ats_score?: number;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('resume_snapshots')
        .insert({
          user_id: user.id,
          resume_id: input.resume_id || null,
          name: input.name,
          resume_json: input.resume_json,
          ats_score: input.ats_score || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ResumeSnapshot;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['resume-snapshots', variables.resume_id] });
      toast.success('Snapshot saved!');
    },
    onError: () => toast.error('Failed to save snapshot'),
  });
}

export function useDeleteResumeSnapshot() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('resume_snapshots')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resume-snapshots'] });
      toast.success('Snapshot deleted');
    },
    onError: () => toast.error('Failed to delete snapshot'),
  });
}
