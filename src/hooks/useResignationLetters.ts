import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ResignationLetterRecord {
  id: string;
  user_id: string;
  title: string | null;
  recipient_name: string | null;
  company: string | null;
  position: string | null;
  last_working_day: string | null;
  notice_period: string | null;
  reason: string | null;
  tone: string | null;
  template_style: string | null;
  additions: string[];
  content: string;
  checklist_progress: string[];
  created_at: string | null;
  updated_at: string | null;
}

export function useResignationLetters() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['resignation-letters', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resignation_letters')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ResignationLetterRecord[];
    },
    enabled: !!user,
  });
}

export function useResignationLetter(id: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['resignation-letters', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resignation_letters')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ResignationLetterRecord | null;
    },
    enabled: !!user && !!id,
  });
}

export function useResignationLetterMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const saveLetter = useMutation({
    mutationFn: async (input: {
      title?: string;
      recipient_name?: string;
      company?: string;
      position?: string;
      last_working_day?: string;
      notice_period?: string;
      reason?: string;
      tone?: string;
      template_style?: string;
      additions?: string[];
      content: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('resignation_letters')
        .insert({
          user_id: user.id,
          title: input.title || null,
          recipient_name: input.recipient_name || null,
          company: input.company || null,
          position: input.position || null,
          last_working_day: input.last_working_day || null,
          notice_period: input.notice_period || '2_weeks',
          reason: input.reason || null,
          tone: input.tone || 'professional',
          template_style: input.template_style || 'standard',
          additions: input.additions || [],
          content: input.content,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ResignationLetterRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resignation-letters'] });
      toast.success('Resignation letter saved!');
    },
    onError: () => toast.error('Failed to save resignation letter'),
  });

  const updateLetter = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ResignationLetterRecord> & { id: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('resignation_letters')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ResignationLetterRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resignation-letters'] });
    },
    onError: () => toast.error('Failed to update resignation letter'),
  });

  const deleteLetter = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('resignation_letters')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resignation-letters'] });
      toast.success('Resignation letter deleted');
    },
    onError: () => toast.error('Failed to delete resignation letter'),
  });

  return { saveLetter, updateLetter, deleteLetter };
}
