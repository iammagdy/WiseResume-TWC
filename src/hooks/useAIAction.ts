import { useCallback } from 'react';
import { toast } from 'sonner';
import { useAICreditsMutations } from './useAICredits';
import { getAICost } from '@/lib/aiCostEstimates';

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

  return 'AI is temporarily unavailable — please try again in a moment.';
}

/**
 * Universal wrapper for all AI actions.
 * Handles: check credits → execute action → deduct credits → show feedback toast.
 *
 * Usage:
 *   const { execute } = useAIAction({ operation: 'tailor' });
 *   const result = await execute(async () => { ... });
 */
export function useAIAction({ operation }: UseAIActionOptions) {
  const { incrementUsage, checkCredits } = useAICreditsMutations();
  const cost = getAICost(operation);

  const execute = useCallback(
    async <T>(action: () => Promise<T>): Promise<T | null> => {
      // 1. Check credits
      const hasCredits = await checkCredits();
      if (!hasCredits) return null;

      // 2. Execute
      let result: T;
      try {
        result = await action();
      } catch (err: unknown) {
        toast.error(parseErrorMessage(err));
        return null;
      }

      // 3. Deduct — await each call sequentially to avoid race conditions
      const deductionErrors: unknown[] = [];
      for (let i = 0; i < cost; i++) {
        try {
          await incrementUsage.mutateAsync();
        } catch (deductErr) {
          deductionErrors.push(deductErr);
        }
      }

      // 4. Feedback toast — only show after all deductions are confirmed
      if (deductionErrors.length > 0) {
        toast.error(`Credit deduction failed for ${deductionErrors.length} of ${cost} credit${cost > 1 ? 's' : ''}. Please check your account.`);
      } else {
        toast.success(`${cost} credit${cost > 1 ? 's' : ''} used`, {
          description: `AI ${operation} completed`,
          duration: 2500,
          icon: '⚡',
        });
      }

      return result;
    },
    [checkCredits, incrementUsage, cost, operation],
  );

  return { execute, cost };
}
