import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type ApplicationStatus = 'saved' | 'applied' | 'screening' | 'interviewing' | 'offer' | 'rejected';

export interface JobApplication {
  id: string;
  user_id: string;
  resume_id: string | null;
  cover_letter_id: string | null;
  job_id: string | null;
  job_title: string;
  company: string;
  status: ApplicationStatus;
  applied_at: string;
  notes: string | null;
  url: string | null;
  deadline: string | null;
  remind_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useJobApplications(statusFilter?: ApplicationStatus) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['job-applications', user?.id, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('job_applications')
        .select('*')
        .order('applied_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as JobApplication[];
    },
    enabled: !!user,
  });
}

export function usePendingReminders() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-reminders', user?.id],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('job_applications')
        .select('id')
        .or(`remind_at.lte.${now},status.eq.saved`);
      if (error) throw error;
      return (data || []).length;
    },
    enabled: !!user,
    refetchInterval: 60000,
  });
}

export function useJobApplication(id: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['job-application', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as unknown as JobApplication;
    },
    enabled: !!user && !!id,
  });
}

export function useJobApplicationMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createApplication = useMutation({
    mutationFn: async (input: {
      job_title: string;
      company: string;
      status?: ApplicationStatus;
      resume_id?: string;
      cover_letter_id?: string;
      notes?: string;
      url?: string;
      deadline?: string;
      remind_at?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('job_applications')
        .insert({
          user_id: user.id,
          job_title: input.job_title,
          company: input.company,
          status: input.status || 'applied',
          resume_id: input.resume_id || null,
          cover_letter_id: input.cover_letter_id || null,
          notes: input.notes || null,
          url: input.url || null,
          deadline: input.deadline || null,
          remind_at: input.remind_at || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as JobApplication;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      toast.success('Application tracked!');
    },
    onError: () => toast.error('Failed to save application'),
  });

  const updateApplication = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<JobApplication> & { id: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('job_applications')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as JobApplication;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
    },
    onError: () => toast.error('Failed to update application'),
  });

  const deleteApplication = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('job_applications')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      toast.success('Application removed');
    },
    onError: () => toast.error('Failed to delete application'),
  });

  return { createApplication, updateApplication, deleteApplication };
}
