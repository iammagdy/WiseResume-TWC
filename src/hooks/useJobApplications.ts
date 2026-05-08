import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type ApplicationStatus = 'saved' | 'applied' | 'screening' | 'interviewing' | 'offer' | 'rejected';

export interface JobApplication {
  id: string;
  user_id: string;
  job_title: string;
  company: string;
  status: ApplicationStatus;
  applied_at: string;
  created_at: string;
}

export function parseJobApplication(doc: any): JobApplication {
  return {
    id: doc.$id,
    user_id: doc.user_id,
    job_title: doc.job_title,
    company: doc.company,
    status: doc.status as ApplicationStatus,
    applied_at: doc.applied_at || doc.$createdAt,
    created_at: doc.$createdAt
  };
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
      return response.documents.map(parseJobApplication);
    },
    enabled: !!user,
  });
}

export function useJobApplicationMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createApplication = useMutation({
    mutationFn: async (input: any) => {
      if (!user) throw new Error('Not authenticated');
      const doc = await databases.createDocument(DATABASE_ID, 'job_applications', ID.unique(), {
        user_id: user.id,
        ...input,
        status: input.status || 'applied'
      });
      return parseJobApplication(doc);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      toast.success('Application tracked!');
    },
  });

  return { createApplication };
}
