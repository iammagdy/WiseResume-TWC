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
  return (aiProvider === 'gemini' && geminiKeyValidated) || (aiProvider === 'ollama' && ollamaKeyValidated);
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
    };
  }

  const rawCredits = meData?.ai_credits ?? null;

  let data: Partial<AICredits> | null = null;

  if (!user) {
    data = null;
  } else if (!rawCredits) {
    data = {
      daily_usage: 0,
      daily_limit: 5,
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
  };
}

export function useAICreditsMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const incrementUsage = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { aiProvider, geminiKeyValidated, ollamaKeyValidated } = useSettingsStore.getState();
      if (aiProvider === 'gemini' && geminiKeyValidated) return;
      if (aiProvider === 'ollama' && ollamaKeyValidated) return;

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
    const { aiProvider, geminiKeyValidated, ollamaKeyValidated } = useSettingsStore.getState();
    if (aiProvider === 'gemini' && geminiKeyValidated) return true;
    if (aiProvider === 'ollama' && ollamaKeyValidated) return true;

    // Read from the cached 'me' query for the credits check
    const cached = queryClient.getQueryData<{ ai_credits: { daily_usage: number; daily_limit: number; usage_date: string } | null } | null>(['me', user.id]);
    const data = cached?.ai_credits ?? null;

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
