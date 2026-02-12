import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface AICredits {
  id: string;
  user_id: string;
  daily_usage: number;
  daily_limit: number;
  usage_date: string;
  total_usage: number;
  updated_at: string;
}

export function useAICredits() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['ai-credits', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('ai_credits')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // If no record, return defaults
      if (!data) {
        return {
          daily_usage: 0,
          daily_limit: 20,
          usage_date: new Date().toISOString().split('T')[0],
          total_usage: 0,
        } as Partial<AICredits>;
      }

      // Auto-reset if date changed
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
  });

  return query;
}

export function useAICreditsMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const incrementUsage = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0];

      // Try to get existing record
      const { data: existing } = await supabase
        .from('ai_credits')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existing) {
        // Create first record
        const { error } = await supabase
          .from('ai_credits')
          .insert({
            user_id: user.id,
            daily_usage: 1,
            daily_limit: 20,
            usage_date: today,
            total_usage: 1,
          });
        if (error) throw error;
        return { daily_usage: 1, daily_limit: 20 };
      }

      // Reset if new day
      const newDailyUsage = existing.usage_date === today
        ? (existing.daily_usage || 0) + 1
        : 1;

      const { error } = await supabase
        .from('ai_credits')
        .update({
          daily_usage: newDailyUsage,
          usage_date: today,
          total_usage: (existing.total_usage || 0) + 1,
        })
        .eq('user_id', user.id);

      if (error) throw error;
      return { daily_usage: newDailyUsage, daily_limit: existing.daily_limit || 20 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-credits'] });
    },
  });

  const checkCredits = async (): Promise<boolean> => {
    if (!user) return true; // Allow guests

    const { data } = await supabase
      .from('ai_credits')
      .select('daily_usage, daily_limit, usage_date')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!data) return true; // No record = first use

    const today = new Date().toISOString().split('T')[0];
    if (data.usage_date !== today) return true; // New day

    if ((data.daily_usage || 0) >= (data.daily_limit || 20)) {
      toast.error('Daily AI credit limit reached. Try again tomorrow!');
      return false;
    }

    // Warn when close to limit
    const remaining = (data.daily_limit || 20) - (data.daily_usage || 0);
    if (remaining <= 3) {
      toast.warning(`Only ${remaining} AI credits remaining today`);
    }

    return true;
  };

  return { incrementUsage, checkCredits };
}
