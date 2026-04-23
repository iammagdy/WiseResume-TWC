import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import { getUserId } from '@/lib/supabaseBridge';

export type AccountType = 'job_seeker' | 'hr';

const ACCOUNT_TYPE_TIMEOUT_MS = 4_000;

export function useAccountType() {
  const { isAuthenticated, supabaseReady } = useAuth();
  const userId = getUserId();
  const [timedOut, setTimedOut] = useState(false);

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

  // Reset the timeout flag whenever the query becomes active again
  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    setTimedOut(false);
    const timer = setTimeout(() => setTimedOut(true), ACCOUNT_TYPE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // After timeout, fall back to job_seeker so the dashboard is never blocked
  const resolvedAccountType: AccountType | null = timedOut
    ? 'job_seeker'
    : (data ?? null);

  return {
    accountType: resolvedAccountType,
    isHR: resolvedAccountType === 'hr',
    isJobSeeker: resolvedAccountType === 'job_seeker' || resolvedAccountType === null,
    isLoading,
    isError,
    timedOut,
  };
}
