import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';
import { useMe } from './useMe';
import { toast } from 'sonner';
import { useSettingsStore } from '@/store/settingsStore';

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
      total_usage: 0,
    };
    return {
      data: byokData,
      isLoading: false,
      error: null,
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
      defaultLimit = 30;
    } else {
      defaultLimit = 5;
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

export function useAICreditsMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const incrementUsage = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { aiProvider, geminiKeyValidated, ollamaKeyValidated, openaiKeyValidated, anthropicKeyValidated, groqKeyValidated, mistralKeyValidated, xaiKeyValidated, cohereKeyValidated, openrouterKeyValidated } = useSettingsStore.getState();
      if (aiProvider === 'gemini' && geminiKeyValidated) return;
      if (aiProvider === 'ollama' && ollamaKeyValidated) return;
      if (aiProvider === 'openai' && openaiKeyValidated) return;
      if (aiProvider === 'anthropic' && anthropicKeyValidated) return;
      if (aiProvider === 'groq' && groqKeyValidated) return;
      if (aiProvider === 'mistral' && mistralKeyValidated) return;
      if (aiProvider === 'xai' && xaiKeyValidated) return;
      if (aiProvider === 'cohere' && cohereKeyValidated) return;
      if (aiProvider === 'openrouter' && openrouterKeyValidated) return;

      const { error } = await supabase.rpc('increment_ai_usage', {
        p_user_id: user.id,
      });

      if (error) throw error;
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

    // Use cached 'me' data, but fetch fresh if the cache is cold to avoid
    // bypassing credit checks before the initial query hydrates.
    type MeCacheShape = { ai_credits: { daily_usage: number; daily_limit: number; usage_date: string } | null } | null;
    let cached = queryClient.getQueryData<MeCacheShape>(['me', user.id]);
    if (cached === undefined) {
      try {
        cached = await queryClient.fetchQuery<MeCacheShape>({
          queryKey: ['me', user.id],
          queryFn: async () => {
            const { edgeFunctions } = await import('@/integrations/supabase/edgeFunctions');
            const { data, error } = await edgeFunctions.functions.invoke('me', { body: {} });
            if (error) throw new Error(error.message ?? 'Failed to fetch credits');
            return data as MeCacheShape;
          },
          staleTime: 5 * 1000,
        });
      } catch {
        return true;
      }
    }

    const data = (cached as { ai_credits?: { daily_usage: number; daily_limit: number; usage_date: string } | null } | null)?.ai_credits ?? null;

    if (!data) return true;

    if (data.daily_limit === UNLIMITED_SENTINEL) return true;

    const today = new Date().toISOString().split('T')[0];
    if (data.usage_date !== today) return true;

    if ((data.daily_usage || 0) >= (data.daily_limit || 5)) {
      toast.error('Daily AI credit limit reached. Try again tomorrow or upgrade your plan!');
      return false;
    }

    const remaining = (data.daily_limit || 5) - (data.daily_usage || 0);
    if (remaining <= 2) {
      toast.warning(`Only ${remaining} AI credit${remaining === 1 ? '' : 's'} remaining today`);
    }

    return true;
  };

  return { incrementUsage, checkCredits };
}
