/**
 * Hydrates BYOK state from the server on app load.
 *
 * BYOK is currently disabled (useIsBYOK always returns false).
 * This hook is kept as a no-op so call sites don't need to change.
 * When BYOK is re-enabled, swap the queryFn to use the Appwrite `edgeFunctions`
 * from `@/lib/edgeFunctions` (already migrated to Appwrite JWT auth).
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

export function useAIKeyHydration() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const refetch = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: ['ai-key-hydration', user?.id] });
  }, [queryClient, user?.id]);

  return { refetch };
}
