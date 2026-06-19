import { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';

export type AccountType = 'job_seeker' | 'hr';

const ACCOUNT_TYPE_TIMEOUT_MS = 4_000;

/**
 * Derives the user's account type from the secure profile query.
 * Uses useProfile which safely reads account_type from the database.
 * account_type is READ-ONLY for normal users, only admin DevKit can modify it.
 */
export function useAccountType() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading, isError: profileError } = useProfile(user?.id);
  const [timedOut, setTimedOut] = useState(false);

  // Reset the timeout flag whenever the query becomes active again
  useEffect(() => {
    if (!profileLoading) {
      setTimedOut(false);
      return;
    }
    setTimedOut(false);
    const timer = setTimeout(() => setTimedOut(true), ACCOUNT_TYPE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [profileLoading]);

  const rawAccountType = profile?.accountType as AccountType | undefined;

  // Handle different states explicitly
  let resolvedAccountType: AccountType | null;
  
  if (timedOut) {
    // After timeout, fall back to job_seeker so the dashboard is never blocked
    resolvedAccountType = 'job_seeker';
  } else if (profileLoading) {
    // Still loading
    resolvedAccountType = null;
  } else if (profileError) {
    // Error loading profile
    resolvedAccountType = 'job_seeker';
  } else {
    // Use the actual value, treating missing/null as job_seeker
    resolvedAccountType = rawAccountType ?? 'job_seeker';
  }

  return {
    accountType: resolvedAccountType,
    isHR: resolvedAccountType === 'hr',
    isJobSeeker: resolvedAccountType === 'job_seeker' || resolvedAccountType === null,
    isLoading: profileLoading,
    isError: profileError,
    timedOut,
  };
}
