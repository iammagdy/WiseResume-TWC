import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface CoverLetterRecord {
  id: string;
  user_id: string;
  job_title: string;
  company: string | null;
  content: string;
  tone: string | null;
  resume_id: string | null;
  created_at: string | null;
}

export function useCoverLetters() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cover-letters', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cover_letters')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CoverLetterRecord[];
    },
    enabled: !!user,
  });
}

export function useCoverLetterMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const saveCoverLetter = useMutation({
    mutationFn: async (input: {
      job_title: string;
      company?: string;
      content: string;
      tone?: string;
      resume_id?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('cover_letters')
        .insert({
          user_id: user.id,
          job_title: input.job_title,
          company: input.company || null,
          content: input.content,
          tone: input.tone || 'professional',
          resume_id: input.resume_id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CoverLetterRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cover-letters'] });
      toast.success('Cover letter saved!');
    },
    onError: () => toast.error('Failed to save cover letter'),
  });

  const deleteCoverLetter = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('cover_letters')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cover-letters'] });
      toast.success('Cover letter deleted');
    },
    onError: () => toast.error('Failed to delete cover letter'),
  });

  return { saveCoverLetter, deleteCoverLetter };
}
