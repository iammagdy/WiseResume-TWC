import { useState, useEffect } from 'react';
import { useMe } from '@/hooks/useMe';

export type AccountType = 'job_seeker' | 'hr';

const ACCOUNT_TYPE_TIMEOUT_MS = 4_000;

/**
 * Derives the user's account type from the shared `useMe` query.
 * The profile field returned by /api/data/me already contains `account_type`,
 * so no additional Supabase call is needed.
 */
export function useAccountType() {
  const { data, isLoading, isError } = useMe();
  const [timedOut, setTimedOut] = useState(false);

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

  const rawAccountType = data?.profile?.account_type as AccountType | undefined;

  // After timeout, fall back to job_seeker so the dashboard is never blocked
  const resolvedAccountType: AccountType | null = timedOut
    ? 'job_seeker'
    : (rawAccountType ?? null);

  return {
    accountType: resolvedAccountType,
    isHR: resolvedAccountType === 'hr',
    isJobSeeker: resolvedAccountType === 'job_seeker' || resolvedAccountType === null,
    isLoading,
    isError,
    timedOut,
  };
}
