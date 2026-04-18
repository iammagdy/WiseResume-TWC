import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';

export interface SuspensionState {
  isSuspended: boolean;
  suspensionReason: string | null;
  isLoading: boolean;
}

async function checkSuspensionViaMe(token: string): Promise<{ suspended: boolean; reason: string | null }> {
  try {
    const res = await fetch(`/api/fn/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.status === 403) {
      const body = await res.json().catch(() => ({}));
      if (body?.suspended === true) {
        return { suspended: true, reason: body.reason ?? null };
      }
    }
    return { suspended: false, reason: null };
  } catch {
    return { suspended: false, reason: null };
  }
}

export function useSuspensionCheck(): SuspensionState {
  const { user, isAuthenticated, supabaseReady, getKindeToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['suspension', user?.id],
    queryFn: async (): Promise<{ is_suspended: boolean; suspension_reason: string | null }> => {
      // Primary: check me endpoint for 403 (aligned with suspension contract)
      try {
        const token = await getKindeToken();
        if (token) {
          const meResult = await checkSuspensionViaMe(token);
          if (meResult.suspended) {
            return { is_suspended: true, suspension_reason: meResult.reason };
          }
        }
      } catch {
        // Fallthrough to profile polling
      }

      // Fallback: direct profiles table check
      const { data, error } = await supabase
        .from('profiles')
        .select('is_suspended, suspension_reason')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) {
        console.warn('[useSuspensionCheck] Error:', error.message);
        return { is_suspended: false, suspension_reason: null };
      }
      return {
        is_suspended: data?.is_suspended ?? false,
        suspension_reason: data?.suspension_reason ?? null,
      };
    },
    enabled: !!user && isAuthenticated && supabaseReady,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    isSuspended: data?.is_suspended ?? false,
    suspensionReason: data?.suspension_reason ?? null,
    isLoading,
  };
}
