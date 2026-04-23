import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { apiFetch } from '@/lib/apiFetch';

export interface SuspensionState {
  isSuspended: boolean;
  suspensionReason: string | null;
  isLoading: boolean;
}

export function useSuspensionCheck(): SuspensionState {
  const { user, isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['suspension', user?.id],
    queryFn: async (): Promise<{ is_suspended: boolean; suspension_reason: string | null }> => {
      try {
        await apiFetch('/api/data/me');
        // apiFetch throws ApiFetchError on non-2xx; reaching here means not suspended
        return { is_suspended: false, suspension_reason: null };
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 403) {
          const body = (err as { body?: unknown }).body;
          if (body && typeof body === 'object' && 'suspended' in body && (body as { suspended: unknown }).suspended === true) {
            return {
              is_suspended: true,
              suspension_reason: (body as { reason?: string }).reason ?? null,
            };
          }
        }
        // Any other error (401, 503, network) → assume not suspended, not a crisis
        return { is_suspended: false, suspension_reason: null };
      }
    },
    enabled: !!user && isAuthenticated,
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
