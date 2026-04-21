import { useState, useCallback, useRef } from 'react';
import { getSupabaseToken } from '@/lib/supabaseAuth';
import { toast } from 'sonner';
import { trackGeminiUsage } from '@/lib/aiProvider';
import { useAIAction } from '@/hooks/useAIAction';
import { useAIHealthStore } from '@/store/aiHealthStore';
import { sanitizeAIContent } from '@/lib/ai/sanitizeContent';
import { checkAIFallback } from '@/lib/aiFallbackToast';
import { redactResumeForAI } from '@/lib/piiRedact';
import { useSettingsStore } from '@/store/settingsStore';
import { parseAIErrorResponse, parseAIErrorBody, aiErrorToastMessage, AIError } from '@/lib/aiErrorParser';
import { apiFnUrl } from '@/lib/apiFnUrl';


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
  const redactPiiBeforeAI = useSettingsStore(s => s.redactPiiBeforeAI);

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

    // Show an immediate "AI is working" loading toast
    const loadingToastId = toast.loading('AI is thinking…', { duration: Infinity });

    // Show "taking longer than usual" after 20s
    const slowTimer = setTimeout(() => {
      if (!slowToastShown.current) {
        slowToastShown.current = true;
        toast.dismiss(loadingToastId);
        toast.info('This is taking longer than usual. Hang tight…', { duration: Infinity, id: 'ai-slow-warning' });
      }
    }, 20_000);

    try {
      const data = await executeAI(async () => {
        const _start = Date.now();

        const redactedResume = redactResumeForAI(
          resumeContext as import('@/types/resume').ResumeData,
          redactPiiBeforeAI,
        );

        const body = JSON.stringify({
          section,
          action,
          currentContent,
          context: {
            resume: redactedResume,
            jobDescription,
          },
        });

        const doFetch = async (authToken: string | null) =>
          fetch(apiFnUrl(`enhance-section`), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
            },
            body,
          });

        let token = await getSupabaseToken();
        if (!token) {
          // Surface as a structured AIError so useAIAction maps it to the
          // canonical "Session expired" toast (same as a real 401 response).
          throw new AIError({
            code: 'unauthorized',
            status: 401,
            message: 'No active Supabase session',
          });
        }

        let res = await doFetch(token);

        // On 401: refresh the bridge token once and retry before surfacing an error.
        if (res.status === 401) {
          const { refreshTokenIfNeeded } = await import('@/lib/supabaseBridge');
          const refreshed = await refreshTokenIfNeeded();
          if (refreshed) {
            token = await getSupabaseToken();
            res = await doFetch(token);
          }
        }

        clearTimeout(slowTimer);
        const _latency = Date.now() - _start;

        if (!res.ok) {
          useAIHealthStore.getState().recordFailure(0);
          const info = await parseAIErrorResponse(res);
          throw new AIError(info);
        }

        const respData = await res.json();

        if (respData.error) {
          throw new AIError(parseAIErrorBody(respData, 200));
        }

        useAIHealthStore.getState().recordSuccess(_latency);
        trackGeminiUsage();
        checkAIFallback(respData);
        respData.improved = sanitizeAIContent(respData.improved);
        return respData;
      });

      toast.dismiss(loadingToastId);
      toast.dismiss('ai-slow-warning');

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
      toast.dismiss(loadingToastId);
      toast.dismiss('ai-slow-warning');
      console.error('AI enhancement error:', error);
      if (!navigator.onLine) {
        toast.warning(aiErrorToastMessage({ code: 'offline', message: '', status: 0 }));
      } else if (error instanceof AIError) {
        const msg = aiErrorToastMessage({ code: error.code, message: error.message, status: error.status });
        if (error.code === 'timeout' || error.code === 'offline') {
          toast.warning(msg);
        } else {
          toast.error(msg);
        }
      } else if (isTimeoutError(error)) {
        toast.warning(aiErrorToastMessage({ code: 'timeout', message: '', status: 0 }));
      } else {
        toast.error(aiErrorToastMessage({ code: 'internal', message: '', status: 0 }));
      }
      return null;
    } finally {
      setIsEnhancing(false);
      setCurrentAction(null);
    }
  }, [section, redactPiiBeforeAI]);

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