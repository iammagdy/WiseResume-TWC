import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';
import { trackGeminiUsage } from '@/lib/aiProvider';
import { useAIAction } from '@/hooks/useAIAction';
import { useAIHealthStore } from '@/store/aiHealthStore';
import { sanitizeAIContent } from '@/lib/ai/sanitizeContent';
import { checkAIFallback } from '@/lib/aiFallbackToast';

export type SectionType = 'summary' | 'experience' | 'education' | 'skills' | 'contact' | 'awards' | 'projects' | 'publications' | 'volunteering' | 'certifications' | 'languages';
export type ActionType = 'generate' | 'improve' | 'ats_improve' | 'ats_optimize' | 'shorten' | 'expand' | 'add_metrics' | 'generate_bullets';

interface EnhanceResult {
  improved: unknown;
  changes: string[];
  suggestions?: string[];
}

interface UseAIEnhanceOptions {
  section: SectionType;
  onApply?: (content: unknown) => void;
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('timed out') || msg.includes('abort') || msg.includes('timeout') || msg.includes('408');
}

export function useAIEnhance({ section, onApply }: UseAIEnhanceOptions) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [result, setResult] = useState<EnhanceResult | null>(null);
  const [currentAction, setCurrentAction] = useState<ActionType | null>(null);
  const { execute: executeAI } = useAIAction({ operation: 'enhance' });
  const slowToastShown = useRef(false);

  const enhance = useCallback(async (
    action: ActionType,
    currentContent: unknown,
    resumeContext: unknown,
    jobDescription?: string
  ) => {
    setIsEnhancing(true);
    setCurrentAction(action);
    setResult(null);
    slowToastShown.current = false;

    // Show "taking longer than usual" after 20s
    const slowTimer = setTimeout(() => {
      if (!slowToastShown.current) {
        slowToastShown.current = true;
        toast.info('This is taking longer than usual. Hang tight…');
      }
    }, 20_000);

    try {
      const data = await executeAI(async () => {
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
        clearTimeout(slowTimer);
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
        checkAIFallback(data);
        data.improved = sanitizeAIContent(data.improved);
        return data;
      });

      if (!data) {
        clearTimeout(slowTimer);
        setIsEnhancing(false);
        setCurrentAction(null);
        return null;
      }

      setResult(data);
      return data;

    } catch (error) {
      clearTimeout(slowTimer);
      console.error('AI enhancement error:', error);
      const errMsg = error instanceof Error ? error.message : '';
      const is401 = errMsg.includes('401') || errMsg.toLowerCase().includes('unauthorized') || errMsg.toLowerCase().includes('jwt expired');
      if (!navigator.onLine) {
        toast.warning("You're offline — AI features need an internet connection. Your resume content is safe.");
      } else if (is401) {
        toast.error('Session expired — please sign in again to use AI features.');
      } else if (isTimeoutError(error)) {
        toast.warning('The request timed out. Please try again.');
      } else {
        toast.error('Failed to enhance content. Please try again.');
      }
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