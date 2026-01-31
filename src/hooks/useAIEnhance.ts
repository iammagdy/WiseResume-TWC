import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SectionType = 'summary' | 'experience' | 'education' | 'skills' | 'contact';
export type ActionType = 'generate' | 'improve' | 'ats_optimize' | 'shorten' | 'expand' | 'add_metrics' | 'generate_bullets';

interface EnhanceResult {
  improved: unknown;
  changes: string[];
  suggestions?: string[];
}

interface UseAIEnhanceOptions {
  section: SectionType;
  onApply?: (content: unknown) => void;
}

export function useAIEnhance({ section, onApply }: UseAIEnhanceOptions) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [result, setResult] = useState<EnhanceResult | null>(null);
  const [currentAction, setCurrentAction] = useState<ActionType | null>(null);

  const enhance = useCallback(async (
    action: ActionType,
    currentContent: unknown,
    resumeContext: unknown,
    jobDescription?: string
  ) => {
    setIsEnhancing(true);
    setCurrentAction(action);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('enhance-section', {
        body: {
          section,
          action,
          currentContent,
          context: {
            resume: resumeContext,
            jobDescription,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        if (data.error === 'rate_limit') {
          toast.error('Too many requests. Please wait a moment and try again.');
        } else if (data.error === 'payment_required') {
          toast.error('AI credits exhausted. Please check your account.');
        } else {
          toast.error(data.message || 'Failed to enhance content');
        }
        return null;
      }

      setResult(data);
      return data;

    } catch (error) {
      console.error('AI enhancement error:', error);
      toast.error('Failed to enhance content. Please try again.');
      return null;
    } finally {
      setIsEnhancing(false);
      setCurrentAction(null);
    }
  }, [section]);

  const apply = useCallback(() => {
    if (result?.improved && onApply) {
      onApply(result.improved);
      toast.success('Changes applied!');
      setResult(null);
    }
  }, [result, onApply]);

  const discard = useCallback(() => {
    setResult(null);
    toast.info('Changes discarded');
  }, []);

  return {
    enhance,
    isEnhancing,
    currentAction,
    result,
    apply,
    discard,
  };
}
