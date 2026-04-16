import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { hasAcceptedAIPrivacy } from '@/components/ai/AIPrivacyDisclosure';
import { useAIPrivacyDisclosure } from '@/components/ai/AIPrivacyDisclosureProvider';
import { AIError, aiErrorToastMessage } from '@/lib/aiErrorParser';

interface UseAIActionOptions {
  /** The operation type key from AI_COST_MAP (e.g. 'enhance', 'tailor') */
  operation: string;
}

/**
 * Classify a structured error body (parsed JSON) into a user-friendly string.
 * Returns null if the body does not match any known pattern.
 */
function classifyErrorBody(body: Record<string, unknown>): string | null {
  const code = (body?.code ?? body?.error_code ?? '') as string;
  const msg = (
    typeof body?.error === 'string'
      ? body.error
      : typeof body?.message === 'string'
        ? body.message
        : ''
  ).toLowerCase();
  const status =
    typeof body?.status === 'number' ? body.status : undefined;

  if (
    code === 'insufficient_credits' ||
    msg.includes('credit') ||
    status === 402
  ) {
    return 'You have run out of AI credits. Please upgrade your plan or wait until tomorrow.';
  }
  if (
    code === 'profile_incomplete' ||
    msg.includes('profile incomplete') ||
    msg.includes('complete your profile')
  ) {
    return 'Your profile is incomplete. Please finish setting up your profile before using AI features.';
  }
  if (
    code === 'invalid_api_key' ||
    msg.includes('invalid api key') ||
    msg.includes('invalid_key')
  ) {
    return 'Invalid API key — please check your AI settings and re-enter your API key.';
  }
  if (
    code === 'provider_unavailable' ||
    msg.includes('provider unavailable') ||
    msg.includes('service unavailable')
  ) {
    return 'The AI provider is temporarily unavailable — please try again in a moment.';
  }
  if (
    code === 'unauthorized' ||
    msg.includes('unauthorized') ||
    msg.includes('jwt expired') ||
    status === 401
  ) {
    return 'Session expired — please sign in again to use AI features.';
  }
  if (code === 'rate_limit' || msg.includes('rate limit') || status === 429) {
    return 'Too many requests — please wait a moment and try again.';
  }
  return null;
}

function parseErrorMessage(err: unknown): string {
  if (!navigator.onLine) {
    return "You're offline — AI features need an internet connection.";
  }

  // Handle structured error objects thrown directly (e.g. { status, body, code })
  if (err !== null && typeof err === 'object' && !(err instanceof Error)) {
    const structured = err as Record<string, unknown>;
    // Try classifying the object itself
    const direct = classifyErrorBody(structured);
    if (direct) return direct;
    // If there's a nested body field (e.g. { status: 402, body: { code: 'insufficient_credits' } })
    if (structured.body && typeof structured.body === 'object') {
      const nested = classifyErrorBody(structured.body as Record<string, unknown>);
      if (nested) return nested;
    }
  }

  const raw = err instanceof Error ? err.message : String(err ?? '');

  // Attempt to parse structured JSON error body from edge functions
  try {
    const body = JSON.parse(raw) as Record<string, unknown>;
    const classified = classifyErrorBody(body);
    if (classified) return classified;
  } catch {
    // Not a JSON body; fall through to raw string matching
  }

  // HTTP status codes embedded in error messages
  if (/401|unauthorized|jwt expired/i.test(raw)) {
    return 'Session expired — please sign in again to use AI features.';
  }
  if (/429|rate.?limit/i.test(raw)) {
    return 'Too many requests — please wait a moment and try again.';
  }
  if (/402|payment.?required|credit.*exhaust/i.test(raw)) {
    return 'AI credits exhausted. Please check your account.';
  }
  if (/invalid.?key/i.test(raw)) {
    return 'Invalid API key — please check your AI settings.';
  }
  if (/profile.*incomplete|incomplete.*profile/i.test(raw)) {
    return 'Your profile is incomplete. Please complete your profile to use AI features.';
  }
  if (/not configured|please contact support/i.test(raw)) {
    return 'WiseResume AI is not configured — go to Settings → AI Provider to add your API key.';
  }
  if (/quota.*exceed|daily.*quota/i.test(raw)) {
    return 'AI daily quota exceeded. Try again tomorrow or add your own API key in Settings.';
  }
  if (raw === 'enhancement_failed' || /enhancement.?failed|failed to enhance/i.test(raw)) {
    return 'Failed to enhance content — please try again.';
  }
  // Pass through the server diagnostic string produced by toUserError
  // ("Something went wrong: <ErrorClass>: <msg>") so we can debug real issues
  // from the browser console instead of seeing a generic toast.
  if (/^something went wrong:/i.test(raw)) {
    return raw;
  }
  if (/something went wrong/i.test(raw)) {
    return 'AI request failed — check your AI settings or try again later.';
  }

  return 'AI is temporarily unavailable — please try again in a moment.';
}

/**
 * Universal wrapper for all AI actions.
 * Credits are now deducted atomically server-side inside each edge function.
 * This hook handles: privacy disclosure gate (one-time) → execute action → cache invalidation.
 *
 * Requires <AIPrivacyDisclosureProvider> in the component tree.
 *
 * Usage:
 *   const { execute } = useAIAction({ operation: 'tailor' });
 *   const result = await execute(async () => { ... });
 */
export function useAIAction({ operation }: UseAIActionOptions) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { requestDisclosure } = useAIPrivacyDisclosure();
  const navigate = useNavigate();

  const execute = useCallback(
    async <T>(action: () => Promise<T>): Promise<T | null> => {
      // 0. Privacy disclosure gate (one-time per device, stored in localStorage)
      if (!hasAcceptedAIPrivacy()) {
        const accepted = await requestDisclosure();
        if (!accepted) return null;
      }

      let result: T;
      try {
        result = await action();
      } catch (err: unknown) {
        // Prefer the structured AIError path (Task #10): when callers throw
        // a typed AIError, drive the toast off the structured `code` rather
        // than re-running the legacy regex sniffer. This guarantees a single,
        // consistent mapping from edge-function error codes to user toasts.
        if (err instanceof AIError) {
          const structuredMsg = aiErrorToastMessage({
            code: err.code,
            message: err.message,
            status: err.status,
          });
          if (err.code === 'not_configured' || err.code === 'invalid_key') {
            toast.error(structuredMsg, {
              duration: 8000,
              action: { label: 'Open Settings', onClick: () => navigate('/settings') },
            });
          } else {
            toast.error(structuredMsg);
          }
          return null;
        }

        const msg = parseErrorMessage(err);
        const rawMsg = err instanceof Error ? err.message : String(err ?? '');
        const isNotConfigured = /not configured|please contact support/i.test(rawMsg);
        if (isNotConfigured) {
          toast.error(msg, {
            duration: 8000,
            action: {
              label: 'Open Settings',
              onClick: () => navigate('/settings'),
            },
          });
        } else {
          toast.error(msg);
        }
        return null;
      }

      // Invalidate credits cache so the UI reflects the server-side deduction
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['me'], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: ['ai-usage-breakdown'], refetchType: 'all' });
      }

      return result;
    },
    [queryClient, user, operation, requestDisclosure, navigate],
  );

  return { execute };
}
