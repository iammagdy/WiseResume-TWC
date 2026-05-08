import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type ApplicationStatus = 'saved' | 'applied' | 'screening' | 'interviewing' | 'offer' | 'rejected';

export interface JobApplication {
  $id: string;
  user_id: string;
  job_title: string;
  company: string;
  status: ApplicationStatus;
  applied_at: string;
  $createdAt: string;
}

export function useJobApplications(statusFilter?: ApplicationStatus) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['job-applications', user?.id, statusFilter],
    queryFn: async () => {
      if (!user) return [];
      const queries = [Query.equal('user_id', user.id), Query.orderDesc('$createdAt')];
      if (statusFilter) queries.push(Query.equal('status', statusFilter));
      const response = await databases.listDocuments(DATABASE_ID, 'job_applications', queries);
      return response.documents;
    },
    enabled: !!user,
  });
}

export function useJobApplication(id: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['job-application', id],
    queryFn: async () => {
      if (!user || !id) return null;
      return await databases.getDocument(DATABASE_ID, 'job_applications', id);
    },
    enabled: !!user && !!id,
  });
}

export function useJobApplicationMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createApplication = useMutation({
    mutationFn: async (input: any) => {
      if (!user) throw new Error('Not authenticated');
      return await databases.createDocument(DATABASE_ID, 'job_applications', ID.unique(), {
        user_id: user.id,
        ...input,
        status: input.status || 'applied'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      toast.success('Application tracked!');
    },
  });

  const updateApplication = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      return await databases.updateDocument(DATABASE_ID, 'job_applications', id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      toast.success('Application updated');
    }
  });

  const deleteApplication = useMutation({
    mutationFn: async (id: string) => {
      await databases.deleteDocument(DATABASE_ID, 'job_applications', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      toast.success('Application deleted');
    }
  });

  return { createApplication, updateApplication, deleteApplication };
}
