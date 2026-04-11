import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { getToken } from '@/lib/supabaseBridge';
import { useAuth } from './useAuth';
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

export function useAICredits() {
  const { user } = useAuth();
  const isBYOK = useIsBYOK();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || isBYOK) return;

    const token = getToken();
    if (token) {
      supabase.realtime.setAuth(token);
    }

    const channel = supabase
      .channel(`ai-credits-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_credits',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ai-credits'], refetchType: 'all' });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isBYOK, queryClient]);

  const query = useQuery({
    queryKey: ['ai-credits', user?.id, isBYOK],
    queryFn: async () => {
      if (!user) return null;

      if (isBYOK) {
        return {
          daily_usage: 0,
          daily_limit: Infinity,
          usage_date: new Date().toISOString().split('T')[0],
          total_usage: 0,
        } as Partial<AICredits>;
      }

      const { data, error } = await supabase
        .from('ai_credits')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return {
          daily_usage: 0,
          daily_limit: 5,
          usage_date: new Date().toISOString().split('T')[0],
          total_usage: 0,
        } as Partial<AICredits>;
      }

      if (data.daily_limit === UNLIMITED_SENTINEL) {
        return {
          ...data,
          daily_limit: Infinity,
        } as unknown as AICredits;
      }

      const today = new Date().toISOString().split('T')[0];
      if (data.usage_date !== today) {
        return {
          ...data,
          daily_usage: 0,
          usage_date: today,
        } as AICredits;
      }

      return data as unknown as AICredits;
    },
    enabled: !!user,
    refetchInterval: isBYOK ? false : 10 * 1000,
    refetchIntervalInBackground: false,
  });

  return query;
}

export function useAICreditsMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isBYOK = useIsBYOK();

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
      queryClient.invalidateQueries({ queryKey: ['ai-credits'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['ai-usage-breakdown'], refetchType: 'all' });
    },
  });

  const checkCredits = async (): Promise<boolean> => {
    if (!user) return true;
    const { aiProvider, geminiKeyValidated, ollamaKeyValidated } = useSettingsStore.getState();
    if (aiProvider === 'gemini' && geminiKeyValidated) return true;
    if (aiProvider === 'ollama' && ollamaKeyValidated) return true;

    const { data } = await supabase
      .from('ai_credits')
      .select('daily_usage, daily_limit, usage_date')
      .eq('user_id', user.id)
      .maybeSingle();

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
