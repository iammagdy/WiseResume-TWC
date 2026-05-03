import { useState, useCallback, useRef } from 'react';
import { getSupabaseToken } from '@/lib/supabaseAuth';
import { toast } from 'sonner';
import { useAIAction } from '@/hooks/useAIAction';
import { useAIHealthStore } from '@/store/aiHealthStore';
import { useAIEnhancingStore } from '@/store/aiEnhancingStore';
import { sanitizeAIContent } from '@/lib/ai/sanitizeContent';
import { checkAIFallback } from '@/lib/aiFallbackToast';
import { redactResumeForAI } from '@/lib/piiRedact';
import { useSettingsStore } from '@/store/settingsStore';
import { parseAIErrorResponse, parseAIErrorBody, aiErrorToastMessage, AIError } from '@/lib/aiErrorParser';
import { apiFnUrl } from '@/lib/apiFnUrl';
import {
  resumeSectionAiFnName,
  resumeSectionAiHeader,
} from '@/integrations/supabase/resumeSectionAiFlag';


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

/**
 * Validate the shape of `improved` returned by the edge function before we
 * hand it to the section-level apply callback. The intent is to refuse
 * payloads that would silently corrupt the resume — e.g. a non-string for
 * `summary`, or `null`/`undefined` for any section. Throwing here turns
 * shape mismatches into a structured AIError(`enhancement_failed`) so the
 * caller can keep the dialog open and prompt the user to retry instead of
 * writing junk into the store and blanking the editor.
 *
 * Special case: project clarifying-questions responses arrive as
 * `{ type: 'questions', questions: [...] }` — those are not an "improved"
 * payload at all and bypass this check by returning early in the caller.
 */
function validateImprovedShape(
  section: SectionType,
  improved: unknown,
): { ok: true } | { ok: false; reason: string } {
  if (improved === null || improved === undefined) {
    return { ok: false, reason: 'AI returned an empty result' };
  }
  if (section === 'summary') {
    if (typeof improved !== 'string') {
      return { ok: false, reason: 'AI returned a non-text summary' };
    }
    return { ok: true };
  }
  if (section === 'experience' || section === 'education' || section === 'projects') {
    // Accept either an object (single-entry update) or an array (full
    // section rewrite). Arrays of strings (e.g. achievement bullets only)
    // are also acceptable.
    if (typeof improved === 'string') return { ok: true };
    if (Array.isArray(improved)) return { ok: true };
    if (typeof improved === 'object') return { ok: true };
    return { ok: false, reason: 'AI returned an unexpected shape' };
  }
  if (section === 'skills') {
    if (!Array.isArray(improved)) {
      return { ok: false, reason: 'AI returned a non-array for skills' };
    }
    return { ok: true };
  }
  // Other sections accept any non-null payload.
  return { ok: true };
}

export function useAIEnhance({ section, onApply }: UseAIEnhanceOptions) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [result, setResult] = useState<EnhanceResult | null>(null);
  const [currentAction, setCurrentAction] = useState<ActionType | null>(null);
  const { execute: executeAI } = useAIAction({ operation: 'enhance' });
  const slowToastShown = useRef(false);
  const redactPiiBeforeAI = useSettingsStore(s => s.redactPiiBeforeAI);
  // Ref-based in-flight guard prevents a second POST while the first is pending.
  // Using a ref (not state) avoids stale-closure issues in the useCallback deps.
  const inFlightRef = useRef(false);

  const enhance = useCallback(async (
    action: ActionType,
    currentContent: unknown,
    resumeContext: unknown,
    jobDescription?: string
  ) => {
    if (inFlightRef.current) return null;
    inFlightRef.current = true;
    setIsEnhancing(true);
    setCurrentAction(action);
    setResult(null);
    slowToastShown.current = false;
    useAIEnhancingStore.getState().increment();

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
          fetch(apiFnUrl(resumeSectionAiFnName('enhance-section')), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...resumeSectionAiHeader('enhance-section'),
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
        checkAIFallback(respData);
        respData.improved = sanitizeAIContent(respData.improved);

        // Project clarifying-questions response is a control message, not
        // an "improved" payload — let the caller short-circuit before we
        // shape-check.
        if (respData && typeof respData === 'object' && respData.type === 'questions') {
          return respData;
        }

        const shape = validateImprovedShape(section, respData.improved);
        if (!shape.ok) {
          throw new AIError({
            code: 'enhancement_failed',
            status: 200,
            message: shape.reason,
          });
        }

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
      inFlightRef.current = false;
      setIsEnhancing(false);
      setCurrentAction(null);
      useAIEnhancingStore.getState().decrement();
    }
  }, [section, redactPiiBeforeAI]);

  /**
   * Apply the AI result to the resume. When `override` is supplied (e.g. the
   * user edited the dialog text before pressing Apply), it is forwarded to
   * the section's `onApply` callback as the authoritative content. The
   * original AI payload is only used as a fallback when no override is
   * provided.
   */
  const apply = useCallback((override?: unknown) => {
    if (!onApply) return;
    const content = override !== undefined ? override : result?.improved;
    if (content === undefined || content === null) return;
    onApply(content);
    toast.success('Changes applied!');
    setResult(null);
  }, [result, onApply]);

  const discard = useCallback(() => {
    setResult(null);
    toast.info('Changes discarded');
  }, []);

  /**
   * Internal-cleanup reset: clear the AI result without firing the
   * "Changes discarded" toast. Use this whenever code (not the user)
   * is closing/clearing the suggestion — for example, after an
   * auto-apply branch, after a successful Apply, or when programmatically
   * dismissing the dialog. Only `discard()` should fire the toast, and
   * only when the user explicitly clicks Discard.
   */
  const reset = useCallback(() => {
    setResult(null);
  }, []);

  return {
    enhance,
    isEnhancing,
    currentAction,
    result,
    apply,
    discard,
    reset,
  };
}