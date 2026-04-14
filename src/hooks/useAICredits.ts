import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useMe } from './useMe';
import { useSettingsStore } from '@/store/settingsStore';
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

/** Sentinel value in daily_limit meaning unlimited (Premium plan). */
const UNLIMITED_SENTINEL = -1;

function useIsBYOK(): boolean {
  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const geminiKeyValidated = useSettingsStore((s) => s.geminiKeyValidated);
  const ollamaKeyValidated = useSettingsStore((s) => s.ollamaKeyValidated);
  const openaiKeyValidated = useSettingsStore((s) => s.openaiKeyValidated);
  const anthropicKeyValidated = useSettingsStore((s) => s.anthropicKeyValidated);
  const groqKeyValidated = useSettingsStore((s) => s.groqKeyValidated);
  const mistralKeyValidated = useSettingsStore((s) => s.mistralKeyValidated);
  const xaiKeyValidated = useSettingsStore((s) => s.xaiKeyValidated);
  const cohereKeyValidated = useSettingsStore((s) => s.cohereKeyValidated);
  const openrouterKeyValidated = useSettingsStore((s) => s.openrouterKeyValidated);
  return (
    (aiProvider === 'gemini' && geminiKeyValidated) ||
    (aiProvider === 'ollama' && ollamaKeyValidated) ||
    (aiProvider === 'openai' && openaiKeyValidated) ||
    (aiProvider === 'anthropic' && anthropicKeyValidated) ||
    (aiProvider === 'groq' && groqKeyValidated) ||
    (aiProvider === 'mistral' && mistralKeyValidated) ||
    (aiProvider === 'xai' && xaiKeyValidated) ||
    (aiProvider === 'cohere' && cohereKeyValidated) ||
    (aiProvider === 'openrouter' && openrouterKeyValidated)
  );
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

  let data: Partial<AICredits> | null = null;

  if (!user) {
    data = null;
  } else if (!rawCredits) {
    // No ai_credits row — derive the correct limit from the effective plan
    const effectivePlan = meData?.subscription?.effective_plan ?? 'free';
    let defaultLimit: number;
    if (effectivePlan === 'premium') {
      defaultLimit = Infinity; // Unlimited
    } else if (effectivePlan === 'pro') {
      defaultLimit = PLAN_CREDIT_LIMITS.pro;
    } else {
      defaultLimit = PLAN_CREDIT_LIMITS.free;
    }
    data = {
      daily_usage: 0,
      daily_limit: defaultLimit,
      usage_date: new Date().toISOString().split('T')[0],
      total_usage: 0,
    };
  } else if (rawCredits.daily_limit === UNLIMITED_SENTINEL) {
    data = {
      ...rawCredits,
      daily_limit: Infinity,
    } as unknown as AICredits;
  } else {
    const today = new Date().toISOString().split('T')[0];
    if (rawCredits.usage_date !== today) {
      data = {
        ...rawCredits,
        daily_usage: 0,
        usage_date: today,
      } as AICredits;
    } else {
      data = rawCredits as unknown as AICredits;
    }
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
    const { aiProvider, geminiKeyValidated, ollamaKeyValidated, openaiKeyValidated, anthropicKeyValidated, groqKeyValidated, mistralKeyValidated, xaiKeyValidated, cohereKeyValidated, openrouterKeyValidated } = useSettingsStore.getState();
    if (aiProvider === 'gemini' && geminiKeyValidated) return true;
    if (aiProvider === 'ollama' && ollamaKeyValidated) return true;
    if (aiProvider === 'openai' && openaiKeyValidated) return true;
    if (aiProvider === 'anthropic' && anthropicKeyValidated) return true;
    if (aiProvider === 'groq' && groqKeyValidated) return true;
    if (aiProvider === 'mistral' && mistralKeyValidated) return true;
    if (aiProvider === 'xai' && xaiKeyValidated) return true;
    if (aiProvider === 'cohere' && cohereKeyValidated) return true;
    if (aiProvider === 'openrouter' && openrouterKeyValidated) return true;

    // Use cached 'me' data for a fast optimistic check (server will enforce the hard limit)
    type MeCacheShape = { ai_credits: { daily_usage: number; daily_limit: number; usage_date: string } | null } | null;
    const cached = queryClient.getQueryData<MeCacheShape>(['me', user.id]);

    const data = (cached as { ai_credits?: { daily_usage: number; daily_limit: number; usage_date: string } | null } | null)?.ai_credits ?? null;

    if (!data) return true;

    if (data.daily_limit === UNLIMITED_SENTINEL) return true;

    const today = new Date().toISOString().split('T')[0];
    if (data.usage_date !== today) return true;

    if ((data.daily_usage || 0) >= (data.daily_limit || PLAN_CREDIT_LIMITS.free)) {
      return false;
    }

    return true;
  };

  return { incrementUsage, checkCredits };
}
