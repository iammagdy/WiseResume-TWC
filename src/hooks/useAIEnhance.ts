import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';
import { trackGeminiUsage } from '@/lib/aiProvider';
import { useAICreditsMutations } from '@/hooks/useAICredits';
import { useAIHealthStore } from '@/store/aiHealthStore';

export type SectionType = 'summary' | 'experience' | 'education' | 'skills' | 'contact' | 'awards' | 'projects' | 'publications' | 'volunteering' | 'certifications' | 'languages';
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
  const { incrementUsage, checkCredits } = useAICreditsMutations();

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
      // Check AI credits before proceeding
      const hasCredits = await checkCredits();
      if (!hasCredits) {
        setIsEnhancing(false);
        setCurrentAction(null);
        return null;
      }

      const _start = Date.now();
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
      const _latency = Date.now() - _start;

      if (error) {
        useAIHealthStore.getState().recordFailure(0);
        throw error;
      }

      if (data.error) {
        if (data.error === 'rate_limit') {
          toast.error('Too many requests. Please wait a moment and try again.');
        } else if (data.error === 'payment_required') {
          toast.error('AI credits exhausted. Please check your account.');
        } else if (data.error === 'invalid_key') {
          toast.error('Invalid Gemini API key. Please check your AI settings.');
        } else {
          toast.error(data.message || 'Failed to enhance content');
        }
        return null;
      }

      useAIHealthStore.getState().recordSuccess(_latency);
      trackGeminiUsage();
      incrementUsage.mutate();
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
