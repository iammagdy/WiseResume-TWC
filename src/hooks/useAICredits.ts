import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useMe } from './useMe';
import { PLAN_CREDIT_LIMITS } from '@/lib/planConfig';

export interface AICredits {
  id: string;
  user_id: string;
  daily_usage: number;
  daily_limit: number;
  usage_date: string;
  total_usage: number;
  updated_at: string;
}

// BYOK was removed in the flat-pool migration. The managed 6-key pool is the
// only AI engine, and the server enforces all plan/credit limits, so the
// client must never report itself as "bring your own key" to bypass them.
function useIsBYOK(): boolean {
  return false;
}

/**
 * Returns the current user's AI credits data.
 *
 * Reads credits from the shared `useMe` query which calls the `me` edge
 * function. This avoids the silent-failure bug where an expired bridge token
 * causes `auth.uid()` to return null in direct DB queries, making credits
 * appear incorrect or empty.
 *
 * Realtime invalidation and 10-second polling are handled inside `useMe`.
 */
export function useAICredits() {
  const { user } = useAuth();
  const isBYOK = useIsBYOK();
  const { data: meData, isLoading, error, refetch } = useMe();

  // Compute trial info from meData — available for all users regardless of BYOK
  const trialPlan = meData?.subscription?.trial_plan ?? null;
  const trialExpiresAt = meData?.subscription?.trial_expires_at ?? null;

  // Dirty state guard: if trial_plan is set but trial_expires_at is null,
  // treat as indeterminate (not active) and warn during development only.
  if (trialPlan && !trialExpiresAt && import.meta.env.DEV) {
    console.warn(
      '[useAICredits] Dirty trial state detected: trial_plan is set but trial_expires_at is null. Defaulting to isActiveTrial=false.',
    );
  }

  const isActiveTrial =
    !!trialPlan &&
    !!trialExpiresAt &&
    new Date(trialExpiresAt) > new Date();
  const trialDaysLeft = isActiveTrial && trialExpiresAt
    ? Math.max(0, Math.ceil((new Date(trialExpiresAt).getTime() - Date.now()) / 86_400_000))
    : 0;

  if (isBYOK) {
    const byokData: Partial<AICredits> = {
      daily_usage: 0,
      daily_limit: Infinity,
      usage_date: new Date().toISOString().split('T')[0],
      total_usage: meData?.ai_credits?.total_usage ?? 0,
    };
    return {
      data: byokData,
      isLoading,
      error,
      refetch,
      isBYOK: true as const,
      isActiveTrial: false,
      trialPlan: null as string | null,
      trialDaysLeft: 0,
    };
  }

  const rawCredits = meData?.ai_credits ?? null;
  const effectivePlan = (meData?.subscription?.effective_plan ?? 'free') as keyof typeof PLAN_CREDIT_LIMITS;
  // The server derives the hard limit from the effective plan. Mirror that
  // contract in the client so a legacy/stale ai_credits.daily_limit cannot
  // keep a paid user on the old Free display cap.
  const effectiveLimit = effectivePlan === 'premium'
    ? Infinity
    : PLAN_CREDIT_LIMITS[effectivePlan] ?? PLAN_CREDIT_LIMITS.free;

  let data: Partial<AICredits> | null = null;

  if (!user) {
    data = null;
  } else if (!rawCredits) {
    data = {
      daily_usage: 0,
      daily_limit: effectiveLimit,
      usage_date: new Date().toISOString().split('T')[0],
      total_usage: 0,
    };
  } else {
    const today = new Date().toISOString().split('T')[0];
    data = {
      ...rawCredits,
      daily_limit: effectiveLimit,
      ...(rawCredits.usage_date !== today
        ? { daily_usage: 0, usage_date: today }
        : {}),
    } as AICredits;
  }

  return {
    data,
    isLoading,
    error,
    refetch,
    isBYOK: false as const,
    isActiveTrial,
    trialPlan,
    trialDaysLeft,
  };
}

/**
 * Provides a no-op `incrementUsage` mutation that only invalidates the credits
 * cache. Credit deduction is now handled atomically server-side inside each
 * edge function — the client must NOT call `increment_ai_usage` directly.
 *
 * `checkCredits` is kept for legacy callers but should be phased out; the
 * authoritative credit check now lives in the edge function itself.
 */
export function useAICreditsMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // No-op mutation: just invalidates cache so the UI refreshes after an AI call.
  const incrementUsage = useMutation({
    mutationFn: async () => {
      // Credit deduction is handled server-side. Nothing to do here.
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['ai-usage-breakdown'], refetchType: 'all' });
    },
  });

  const checkCredits = async (): Promise<boolean> => {
    if (!user) return true;

    // Use cached 'me' data for a fast optimistic check (server will enforce the hard limit)
    type MeCacheShape = {
      ai_credits: { daily_usage: number; daily_limit: number; usage_date: string } | null;
      subscription?: { effective_plan?: string | null } | null;
    } | null;

    const cachedShape = queryClient.getQueryData<MeCacheShape>(['me', user.id]);
    const data = cachedShape?.ai_credits ?? null;
    const cachedPlan = (cachedShape?.subscription?.effective_plan ?? 'free') as keyof typeof PLAN_CREDIT_LIMITS;
    const effectiveLimit = cachedPlan === 'premium'
      ? Infinity
      : PLAN_CREDIT_LIMITS[cachedPlan] ?? PLAN_CREDIT_LIMITS.free;

    if (!data || !Number.isFinite(effectiveLimit)) return true;

    const today = new Date().toISOString().split('T')[0];
    if (data.usage_date !== today) return true;

    if ((data.daily_usage || 0) >= effectiveLimit) {
      return false;
    }

    return true;
  };

  return { incrementUsage, checkCredits };
}
