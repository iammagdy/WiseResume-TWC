/**
 * Hydrates AI provider settings from server on login.
 * Ensures the UI reflects saved Ollama/Gemini config even after page reload.
 */
import { useEffect, useRef } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { getClerkSupabaseToken } from '@/lib/clerkSupabase';
import { supabase } from '@/integrations/supabase/safeClient';

export function useAIKeyHydration() {
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;

    const hydrate = async () => {
      const token = await getClerkSupabaseToken();
      if (!token) return;

      try {
        // Hydrate keys from manage-api-keys
        const { data, error } = await edgeFunctions.functions.invoke('manage-api-keys', {
          body: { action: 'get' },
        });

        const store = useSettingsStore.getState();

        if (!error && data?.keys) {
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
            }

            if (key.provider === 'gemini') {
              store.setGeminiKeyTier(key.key_tier as any);
              store.setGeminiKeyValidated(true);
              if (key.model) {
                store.setGeminiModel(key.model);
              }
            }
          }
        }

        // Hydrate the user's actual provider preference from user_preferences
        // Decode the JWT to get the user ID (sub claim)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload?.sub;
        if (!userId) return;
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('ai_provider')
          .eq('user_id', userId)
          .maybeSingle();

        // Only override local state if DB has a non-null value
        // This ensures the DB is the source of truth once synced
        if (prefs?.ai_provider && prefs.ai_provider !== 'wiseresume') {
          store.setAIProvider(prefs.ai_provider as any);
        } else if (prefs?.ai_provider === 'wiseresume') {
          // DB explicitly says wiseresume — only override if local isn't already set to something else
          // (prevents overwriting a selection that failed to sync)
          const currentLocal = store.aiProvider;
          if (currentLocal === 'wiseresume') {
            store.setAIProvider('wiseresume');
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
