import { useMutation } from '@tanstack/react-query';
import { edgeFunctions } from '@/lib/edgeFunctions';
import { toast } from 'sonner';

export interface MaskResult {
  label: string;
  filename: string;
  maskedText: string;
  redactedFields: string[];
}

export function useMaskCVs() {
  return useMutation({
    mutationFn: async (files: File[]): Promise<MaskResult[]> => {
      const form = new FormData();
      files.forEach((f) => form.append('files', f));

      const { data, error } = await edgeFunctions.invoke<{
        results: MaskResult[];
        requiresApiKey?: boolean;
        rateLimited?: boolean;
        error?: string;
      }>('wisehire-mask-cvs', { body: form });

      if (error) {
        const status = (error as { status?: number }).status;
        if (status === 402) {
          throw Object.assign(new Error('Starter plan requires your own OpenAI or Anthropic API key'), { code: 'requires_api_key' });
        }
        if (status === 429) {
          throw Object.assign(new Error('Daily CV masking limit reached. Try again tomorrow.'), { code: 'rate_limited' });
        }
        throw new Error((error as { message?: string }).message ?? 'CV masking failed');
      }

      return (data as { results: MaskResult[] }).results;
    },
    onError: (err: Error & { code?: string }) => {
      if (err.code === 'requires_api_key') return;
      if (err.code === 'rate_limited') {
        toast.error('Daily CV masking limit reached. Try again tomorrow.');
        return;
      }
      toast.error(err.message ?? 'CV masking failed. Please try again.');
    },
  });
}
