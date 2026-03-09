/**
 * Hydrates AI provider settings from server on login.
 * Ensures the UI reflects saved Ollama/Gemini config even after page reload.
 */
import { useEffect, useRef } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useAIKeyHydration() {
  const hydrated = useRef(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !UUID_REGEX.test(user.id)) return;
    if (hydrated.current) return;

    const hydrate = async () => {
      const userId = user.id;

      try {
        // Reset AI state to defaults before hydrating from server
        const store = useSettingsStore.getState();
        store.setGeminiKeyValidated(false);
        store.setGeminiKeyTier('unknown');
        store.setOllamaKeyValidated(false);
        store.setOllamaBaseUrl('');
        store.setOllamaModel('');
        store.setAIProvider('wiseresume');

        // Hydrate keys from manage-api-keys
        const { data, error } = await edgeFunctions.functions.invoke('manage-api-keys', {
          body: { action: 'get' },
        });


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
              store.setGeminiKeyTier(key.key_tier as 'free' | 'paid' | 'unknown');
              store.setGeminiKeyValidated(true);
              if (key.model) store.setGeminiModel(key.model);
            }
          }
        }

        // Hydrate AI provider preference
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('ai_provider')
          .eq('user_id', userId)
          .maybeSingle();

        if (prefs?.ai_provider && prefs.ai_provider !== 'wiseresume') {
          store.setAIProvider(prefs.ai_provider as 'gemini' | 'ollama' | 'wiseresume');
        } else if (prefs?.ai_provider === 'wiseresume') {
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
  }, [isAuthenticated, user?.id]);
}
