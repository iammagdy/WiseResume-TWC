import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import { getUserId } from '@/lib/supabaseBridge';

export type AccountType = 'job_seeker' | 'hr';

export function useAccountType() {
  const { isAuthenticated, supabaseReady } = useAuth();
  const userId = getUserId();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['account-type', userId],
    queryFn: async (): Promise<AccountType> => {
      if (!userId) return 'job_seeker';
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('account_type')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return (profile?.account_type as AccountType) ?? 'job_seeker';
    },
    enabled: isAuthenticated && supabaseReady && !!userId,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
  });

  return {
    accountType: data ?? null,
    isHR: data === 'hr',
    isJobSeeker: data === 'job_seeker' || data === undefined,
    isLoading,
    isError,
  };
}
