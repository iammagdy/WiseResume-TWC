import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
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
      const { jobs } = await apiFetch<{ jobs: Job[] }>('/api/data/jobs');
      return jobs;
    },
    enabled: !!user,
  });
}

export function useJob(id: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['jobs', id],
    queryFn: async () => {
      const { job } = await apiFetch<{ job: Job | null }>(`/api/data/jobs/${id}`);
      return job;
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
      const { job } = await apiFetch<{ job: Job }>('/api/data/jobs', {
        method: 'POST',
        body: {
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
        },
      });
      return job;
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
      const { job } = await apiFetch<{ job: Job }>(`/api/data/jobs/${id}`, {
        method: 'PATCH',
        body: updates,
      });
      return job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: () => toast.error('Failed to update job'),
  });

  const deleteJob = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      await apiFetch(`/api/data/jobs/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job removed');
    },
    onError: () => toast.error('Failed to delete job'),
  });

  return { createJob, updateJob, deleteJob };
}
