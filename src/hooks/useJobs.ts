import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Job {
  id: string;
  user_id: string;
  title: string;
  company: string;
  company_logo: string | null;
  description: string;
  requirements: string;
  location: string;
  salary_range: string | null;
  job_type: string;
  posted_date: string;
  source_url: string | null;
  is_saved: boolean;
  created_at: string;
  updated_at: string;
}

export function useJobs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['jobs', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Job[];
    },
    enabled: !!user,
  });
}

export function useJob(id: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['jobs', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Job | null;
    },
    enabled: !!user && !!id,
  });
}

export function useJobMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createJob = useMutation({
    mutationFn: async (input: {
      title: string;
      company: string;
      company_logo?: string;
      description?: string;
      requirements?: string;
      location?: string;
      salary_range?: string;
      job_type?: string;
      source_url?: string;
      is_saved?: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          title: input.title,
          company: input.company,
          company_logo: input.company_logo || null,
          description: input.description || '',
          requirements: input.requirements || '',
          location: input.location || '',
          salary_range: input.salary_range || null,
          job_type: input.job_type || 'full-time',
          source_url: input.source_url || null,
          is_saved: input.is_saved ?? true,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job saved!');
    },
    onError: () => toast.error('Failed to save job'),
  });

  const updateJob = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Job> & { id: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('jobs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: () => toast.error('Failed to update job'),
  });

  const deleteJob = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('jobs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job removed');
    },
    onError: () => toast.error('Failed to delete job'),
  });

  return { createJob, updateJob, deleteJob };
}
