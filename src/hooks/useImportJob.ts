import { useMutation } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useJobMutations } from './useJobs';
import { appwriteFunctions } from '@/lib/appwrite-functions';

interface ParsedJob {
  title: string;
  company: string;
  location: string;
  salary_range: string | null;
  job_type: string;
  description: string;
  requirements: string;
  skills: string[];
}

export function useImportJob() {
  const { user } = useAuth();
  const { createJob } = useJobMutations();

  return useMutation({
    mutationFn: async (url: string) => {
      const result = await appwriteFunctions.invoke<{ ok: boolean; job: ParsedJob; error?: string }>('job-import', {
        body: { url, userId: user?.$id },
      });

      if (result.error || !result.data?.ok) {
        throw new Error(result.data?.error || result.error?.message || 'Import failed');
      }

      const { job } = result.data;

      return createJob.mutateAsync({
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
    },
  });
}
