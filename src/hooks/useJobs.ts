import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
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

function docToJob(doc: Record<string, unknown>): Job {
  return {
    id: doc.$id as string,
    user_id: doc.user_id as string,
    title: (doc.title as string) ?? '',
    company: (doc.company as string) ?? '',
    company_logo: (doc.company_logo as string | null) ?? null,
    description: (doc.description as string) ?? '',
    requirements: (doc.requirements as string) ?? '',
    location: (doc.location as string) ?? '',
    salary_range: (doc.salary_range as string | null) ?? null,
    job_type: (doc.job_type as string) ?? 'full-time',
    posted_date: (doc.posted_date as string) ?? doc.$createdAt as string,
    source_url: (doc.source_url as string | null) ?? null,
    is_saved: Boolean(doc.is_saved),
    created_at: doc.$createdAt as string,
    updated_at: doc.$updatedAt as string,
  };
}

export function useJobs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['jobs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.jobs, [
        Query.equal('user_id', user.id),
        Query.orderDesc('$createdAt'),
        Query.limit(200),
      ]);
      return res.documents.map(d => docToJob(d as unknown as Record<string, unknown>));
    },
    enabled: !!user,
  });
}

export function useJob(id: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['jobs', id],
    queryFn: async () => {
      if (!id) return null;
      const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.jobs, id);
      return docToJob(doc as unknown as Record<string, unknown>);
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
      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.jobs,
        ID.unique(),
        {
          user_id: user.id,
          title: input.title,
          company: input.company,
          company_logo: input.company_logo ?? null,
          description: input.description ?? '',
          requirements: input.requirements ?? '',
          location: input.location ?? '',
          salary_range: input.salary_range ?? null,
          job_type: input.job_type ?? 'full-time',
          posted_date: new Date().toISOString(),
          source_url: input.source_url ?? null,
          is_saved: input.is_saved ?? true,
        },
      );
      return docToJob(doc as unknown as Record<string, unknown>);
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
      const payload: Record<string, unknown> = {};
      const allowed: (keyof Job)[] = [
        'title', 'company', 'company_logo', 'description', 'requirements',
        'location', 'salary_range', 'job_type', 'source_url', 'is_saved',
      ];
      for (const key of allowed) {
        if (key in updates) payload[key] = updates[key] ?? null;
      }
      const doc = await databases.updateDocument(DATABASE_ID, COLLECTIONS.jobs, id, payload);
      return docToJob(doc as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: () => toast.error('Failed to update job'),
  });

  const deleteJob = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.jobs, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job removed');
    },
    onError: () => toast.error('Failed to delete job'),
  });

  return { createJob, updateJob, deleteJob };
}
