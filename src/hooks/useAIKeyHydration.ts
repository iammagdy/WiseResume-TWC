/**
 * Hydrates AI provider settings from server on login.
 * Ensures the UI reflects saved Ollama/Gemini config even after page reload.
 */
import { useEffect, useRef } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { supabase } from '@/integrations/supabase/client';

export function useAIKeyHydration() {
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;

    const hydrate = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      try {
        const { data, error } = await edgeFunctions.functions.invoke('manage-api-keys', {
          body: { action: 'get' },
        });

        if (error || !data?.keys) return;

        const store = useSettingsStore.getState();
        const keys = data.keys as Array<{
          provider: string;
          key_tier: string;
          base_url: string | null;
          model: string | null;
        }>;

        for (const key of keys) {
          if (key.provider === 'ollama') {
            store.setOllamaBaseUrl(key.base_url || '');
            store.setOllamaModel(key.model || '');
            store.setOllamaKeyValidated(true);
            store.setAIProvider('ollama');
          }

          if (key.provider === 'gemini') {
            store.setGeminiKeyTier(key.key_tier as any);
            store.setGeminiKeyValidated(true);
            store.setAIProvider('gemini');
          }
        }

        hydrated.current = true;
      } catch (err) {
        console.warn('[useAIKeyHydration] Failed to hydrate keys:', err);
      }
    };

    hydrate();
  }, []);
}
