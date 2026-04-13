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

import { EDGE_FUNCTIONS_URL as CLOUD_URL, EDGE_FUNCTIONS_ANON_KEY as CLOUD_KEY } from '@/lib/supabaseConstants';

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
          fetch(`${CLOUD_URL}/functions/v1/enhance-section`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
              'apikey': CLOUD_KEY,
            },
            body,
          });

        let token = await getSupabaseToken();
        if (!token) throw new Error('401 Unauthorized – no session');

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
          const status = res.status;
          const errBody = await res.json().catch(() => ({} as Record<string, unknown>));
          const errCode = typeof errBody.error === 'string' ? errBody.error : '';
          const errMsg = typeof errBody.message === 'string' ? errBody.message : '';

          if (status === 401 || status === 403) {
            throw new Error('401 Unauthorized – no session');
          } else if (status === 429 || errCode === 'rate_limit') {
            throw new Error('rate_limit');
          } else if (status === 402 || errCode === 'payment_required') {
            throw new Error('payment_required');
          } else if (errCode === 'invalid_key') {
            throw new Error(errMsg || 'invalid_key');
          } else if (errCode === 'quota_exceeded') {
            throw new Error(errMsg || 'quota_exceeded');
          } else if (errCode === 'enhancement_failed') {
            throw new Error('enhancement_failed');
          } else {
            throw new Error(errMsg || 'server_error');
          }
        }

        const respData = await res.json();

        if (respData.error) {
          if (respData.error === 'rate_limit') {
            throw new Error('rate_limit');
          } else if (respData.error === 'payment_required') {
            throw new Error('payment_required');
          } else if (respData.error === 'invalid_key') {
            throw new Error('invalid_key');
          } else {
            throw new Error('server_error');
          }
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
      const errMsg = error instanceof Error ? error.message : '';
      const is401 = errMsg.includes('401') || errMsg.toLowerCase().includes('unauthorized') || errMsg.toLowerCase().includes('jwt expired');
      if (!navigator.onLine) {
        toast.warning("You're offline — AI features need an internet connection. Your resume content is safe.");
      } else if (is401) {
        toast.error('Session expired — please sign in again to use AI features.');
      } else if (isTimeoutError(error)) {
        toast.warning('The AI request timed out. Please try again.');
      } else if (errMsg === 'rate_limit') {
        toast.error('Too many requests — please wait a moment and try again.');
      } else if (errMsg === 'payment_required') {
        toast.error('AI credits exhausted. Please check your account.');
      } else if (/not configured|please contact support/i.test(errMsg)) {
        toast.error('WiseResume AI is not configured — go to Settings → AI Provider to add your API key.');
      } else if (/quota.*exceed|daily.*quota/i.test(errMsg)) {
        toast.error('AI daily quota exceeded. Try again tomorrow or add your own API key in Settings.');
      } else if (/invalid.?key/i.test(errMsg) || errMsg === 'invalid_key') {
        toast.error('Invalid API key — please check your AI settings.');
      } else if (errMsg === 'enhancement_failed' || /enhancement.?failed|failed to enhance/i.test(errMsg)) {
        toast.error('Failed to enhance content — please try again.');
      } else {
        toast.error('AI is temporarily unavailable — please try again in a moment.');
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