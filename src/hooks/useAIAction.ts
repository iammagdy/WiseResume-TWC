import { useCallback } from 'react';
import { toast } from 'sonner';
import { Zap } from 'lucide-react';
import { useAICreditsMutations } from './useAICredits';
import { getAICost } from '@/lib/aiCostEstimates';

interface UseAIActionOptions {
  /** The operation type key from AI_COST_MAP (e.g. 'enhance', 'tailor') */
  operation: string;
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
      } catch (err: any) {
        const raw = err?.message || '';
        let message = 'AI is temporarily unavailable — please try again in a moment.';
        if (raw.includes('401') || raw.toLowerCase().includes('unauthorized') || raw.toLowerCase().includes('jwt expired')) {
          message = 'Session expired — please sign in again to use AI features.';
        } else if (raw === 'rate_limit' || raw.includes('rate limit') || raw.includes('429')) {
          message = 'Too many requests — please wait a moment and try again.';
        } else if (raw === 'payment_required' || raw.includes('402')) {
          message = 'AI credits exhausted. Please check your account.';
        } else if (raw === 'invalid_key') {
          message = 'Invalid API key — please check your AI settings.';
        } else if (!navigator.onLine) {
          message = "You're offline — AI features need an internet connection.";
        }
        toast.error(message);
        return null;
      }

      // 3. Deduct (fire-and-forget for each credit unit)
      for (let i = 0; i < cost; i++) {
        incrementUsage.mutate();
      }

      // 4. Feedback toast
      toast.success(`${cost} credit${cost > 1 ? 's' : ''} used`, {
        description: `AI ${operation} completed`,
        duration: 2500,
        icon: '⚡',
      });

      return result;
    },
    [checkCredits, incrementUsage, cost, operation],
  );

  return { execute, cost };
}
