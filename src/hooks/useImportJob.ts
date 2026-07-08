import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useJobMutations } from './useJobs';
import { appwriteFunctions } from '@/lib/appwrite-functions';

export interface ParsedJobImport {
  title: string;
  company: string;
  location: string;
  salary_range: string | null;
  job_type: string;
  description: string;
  requirements: string;
  skills: string[];
}

export interface ImportJobResult {
  id: string;
  job: ParsedJobImport;
}

export function useImportJob() {
  const { user } = useAuth();
  const { createJob } = useJobMutations();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (url: string) => {
      if (!user?.id) {
        throw new Error('Sign in to import job postings.');
      }

      const result = await appwriteFunctions.invoke<{
        ok: boolean;
        jobId: string | null;
        job: ParsedJobImport;
        persisted?: boolean;
        fallbackRequired?: boolean;
        reason?: string | null;
        error?: string;
      }>('job-import', {
        body: { url, userId: user.id },
      });

      if (result.error || !result.data?.ok) {
        throw new Error(result.data?.error || result.error?.message || 'Import failed');
      }

      const { job, jobId, persisted, fallbackRequired } = result.data;

      // Only skip fallback if persisted is explicitly true AND jobId exists
      if (persisted && jobId) {
        await queryClient.invalidateQueries({ queryKey: ['jobs', user.id] });
        await queryClient.invalidateQueries({ queryKey: ['saved-job-postings', user.id] });
        return { id: jobId, job };
      }

      // If fallback is required (or server failed to save), do the client-side write
      if (fallbackRequired || !jobId) {
        const saved = await createJob.mutateAsync({
          title: job.title,
          company: job.company,
          description: job.description,
          requirements: job.requirements,
          location: job.location,
          salary_range: job.salary_range ?? undefined,
          job_type: job.job_type,
          source_url: url,
          is_saved: true,
        });
        return { id: saved.id, job };
      }

      throw new Error('Import failed: invalid server state');
    },
  });
}
