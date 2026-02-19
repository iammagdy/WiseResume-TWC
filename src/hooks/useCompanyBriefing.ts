import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAIAction } from './useAIAction';
import { toast } from 'sonner';
import type { CompanyBriefing } from '@/types/companyBriefing';

interface GenerateParams {
  jobDescription: string;
  resumeData?: {
    summary?: string;
    experience?: Array<{ position?: string; company?: string }>;
    skills?: Array<{ name?: string; skill?: string } | string>;
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

    const result = await execute(async () => {
      const { data, error: fnError } = await supabase.functions.invoke('company-briefing', {
        body: {
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
    setIsLoading(false);
    return result;
  }, [execute]);

  const reset = useCallback(() => {
    setBriefing(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { generate, briefing, isLoading, error, reset };
}
