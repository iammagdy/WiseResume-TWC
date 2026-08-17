import { useMutation } from '@tanstack/react-query';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { useAIAction } from '@/hooks/useAIAction';
import { extractTextFromPDF } from '@/lib/pdf/textExtractor';
import { toast } from 'sonner';

export interface MaskResult {
  label: string;
  filename: string;
  maskedText: string;
  redactedFields: string[];
  reviewRequired: true;
}

export function useMaskCVs() {
  const { execute: executeAI } = useAIAction({ operation: 'wisehire_mask_cvs' });

  return useMutation({
    mutationFn: async (files: File[]): Promise<MaskResult[]> => {
      const result = await executeAI(async () => {
        const candidates = await Promise.all(files.map(async (file) => {
          if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} is larger than the 5 MB limit.`);
          const extraction = await extractTextFromPDF(file);
          const resumeText = extraction.text.trim().slice(0, 6000);
          if (extraction.needsOCR || resumeText.length < 80) {
            throw new Error(`${file.name} does not contain enough readable text. Use a text-based PDF.`);
          }
          return { resume_text: resumeText };
        }));

        const { data, error } = await appwriteFunctions.invoke<{
          sessionId: string;
          results: MaskResult[];
          rateLimited?: boolean;
          error?: string;
        }>('wisehire-mask-cvs', { body: { candidates } });

        if (error) {
          const status = (error as { status?: number }).status;
          if (status === 429) throw Object.assign(new Error('Daily CV masking limit reached. Try again tomorrow.'), { code: 'rate_limited' });
          throw Object.assign(
            new Error((error as { message?: string }).message ?? 'CV masking failed'),
            { status: status ?? 500, code: (error as { code?: string }).code },
          );
        }
        if (!data) throw new Error('CV masking returned no result.');
        return data.results;
      }, { silent: true });

      if (!result) throw Object.assign(new Error('AI masking was not started.'), { code: 'cancelled' });
      return result;
    },
    onError: (err: Error & { code?: string }) => {
      if (err.code === 'cancelled') return;
      if (err.code === 'rate_limited') {
        toast.error('Daily CV masking limit reached. Try again tomorrow.');
        return;
      }
      toast.error(err.message ?? 'CV masking failed. Please try again.');
    },
  });
}
