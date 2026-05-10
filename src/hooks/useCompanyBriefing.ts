import { useState, useCallback } from 'react';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { useAIAction } from './useAIAction';
import type { CompanyBriefing } from '@/types/companyBriefing';

interface GenerateParams {
  companyName?: string;
  jobDescription?: string;
  resumeData?: {
    summary?: string;
    experience?: Array<{ position?: string; company?: string; startDate?: string; endDate?: string }>;
    skills?: Array<{ name?: string; skill?: string } | string>;
    education?: Array<{ degree?: string; institution?: string; school?: string }>;
  };
}

export function useCompanyBriefing() {
  const [briefing, setBriefing] = useState<CompanyBriefing | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { execute } = useAIAction({ operation: 'company_briefing' });

  const generate = useCallback(async (params: GenerateParams) => {
    setIsLoading(true);
    setError(null);
    setBriefing(null);

    try {
      const result = await execute(async () => {
        const { data, error: fnError } = await appwriteFunctions.invoke('company-briefing', {
          body: {
            companyName: params.companyName,
            jobDescription: params.jobDescription,
            resumeData: params.resumeData,
          },
        });

        if (fnError) throw new Error(fnError.message || 'Failed to generate briefing');
        if (data?.error) throw new Error(data.error);
        if (!data?.briefing) throw new Error('No briefing returned');

        return data.briefing as CompanyBriefing;
      });

      if (result) {
        setBriefing(result);
      } else {
        setError('Could not generate briefing');
      }
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not generate briefing';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [execute]);

  const reset = useCallback(() => {
    setBriefing(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { generate, briefing, isLoading, error, reset };
}
