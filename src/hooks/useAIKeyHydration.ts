/**
 * Hydrates BYOK state from the server on app load.
 *
 * Fetches manage-api-keys to get the user's saved keys + byok_enabled status,
 * and populates useSettingsStore with the results so the UI (badge, settings
 * sheet) reflects the current server-side state without any separate query.
 *
 * Must be called once from AppInterior (after auth is confirmed).
 */
import { useEffect, useCallback } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useSettingsStore, ByokKeyHint } from '@/store/settingsStore';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';

interface ManageApiKeysResponse {
  keys: ByokKeyHint[];
  byok_enabled: boolean;
  byok_provider: string | null;
}

async function fetchKeysFromServer(): Promise<ManageApiKeysResponse> {
  const { data, error } = await edgeFunctions.functions.invoke('manage-api-keys', {
    method: 'GET',
  });
  if (error) throw new Error((error as { message?: string }).message ?? 'Failed to fetch BYOK settings');
  return data as ManageApiKeysResponse;
}

export function useAIKeyHydration() {
  const { user, isAuthenticated } = useAuth();
  const { setByokEnabled, setByokProvider, setByokKeyHints } = useSettingsStore();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['ai-key-hydration', user?.id],
    queryFn: fetchKeysFromServer,
    enabled: !!user && isAuthenticated,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    throwOnError: false,
  });

  useEffect(() => {
    if (!data) return;
    setByokEnabled(data.byok_enabled);
    setByokProvider(data.byok_provider);
    setByokKeyHints(data.keys);
  }, [data, setByokEnabled, setByokProvider, setByokKeyHints]);

  /**
   * Refetch key list from server and await fresh data before returning.
   * Use this after key mutations (add/delete/toggle) so callers can rely
   * on updated store state immediately after the await resolves.
   */
  const refetch = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: ['ai-key-hydration', user?.id] });
  }, [queryClient, user?.id]);

  return { refetch };
}
