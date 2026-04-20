/**
 * Hydrates AI provider settings from server on login.
 * Ensures the UI reflects saved provider config even after page reload.
 */
import { useEffect, useRef } from 'react';
import { useSettingsStore, AIProvider } from '@/store/settingsStore';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import { useAIHealthStore } from '@/store/aiHealthStore';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALL_AI_PROVIDERS: AIProvider[] = [
  'wiseresume', 'openai', 'anthropic', 'gemini', 'groq', 'mistral', 'xai', 'cohere', 'openrouter', 'ollama',
];

function isValidAIProvider(p: string): p is AIProvider {
  return ALL_AI_PROVIDERS.includes(p as AIProvider);
}

export function useAIKeyHydration() {
  const hydrated = useRef(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !UUID_REGEX.test(user.id)) return;
    if (hydrated.current) return;

    const hydrate = async () => {
      const userId = user.id;

      try {
        const store = useSettingsStore.getState();
        // Reset all provider validation states before hydrating
        store.setGeminiKeyValidated(false);
        store.setGeminiKeyTier('unknown');
        store.setOllamaKeyValidated(false);
        store.setOllamaBaseUrl('');
        store.setOllamaModel('');
        store.setOpenrouterKeyValidated(false);
        store.setOpenrouterModel('');
        store.setOpenaiKeyValidated(false);
        store.setAnthropicKeyValidated(false);
        store.setGroqKeyValidated(false);
        store.setMistralKeyValidated(false);
        store.setXaiKeyValidated(false);
        store.setCohereKeyValidated(false);
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
            if (key.provider === 'openrouter') {
              store.setOpenrouterModel(key.model || '');
              store.setOpenrouterKeyValidated(true);
            }
            if (key.provider === 'openai') {
              if (key.model) store.setOpenaiModel(key.model);
              store.setOpenaiKeyValidated(true);
            }
            if (key.provider === 'anthropic') {
              if (key.model) store.setAnthropicModel(key.model);
              store.setAnthropicKeyValidated(true);
            }
            if (key.provider === 'groq') {
              if (key.model) store.setGroqModel(key.model);
              store.setGroqKeyValidated(true);
            }
            if (key.provider === 'mistral') {
              if (key.model) store.setMistralModel(key.model);
              store.setMistralKeyValidated(true);
            }
            if (key.provider === 'xai') {
              if (key.model) store.setXaiModel(key.model);
              store.setXaiKeyValidated(true);
            }
            if (key.provider === 'cohere') {
              if (key.model) store.setCohereModel(key.model);
              store.setCohereKeyValidated(true);
            }
          }
        }

        // Hydrate AI provider preference + WiseResume sub-provider
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('ai_provider, wiseresume_sub_provider')
          .eq('user_id', userId)
          .maybeSingle();

        if (prefs?.ai_provider && isValidAIProvider(prefs.ai_provider)) {
          store.setAIProvider(prefs.ai_provider);
        }

        if (prefs?.wiseresume_sub_provider) {
          const sub = prefs.wiseresume_sub_provider as string;
          if (sub === 'openrouter' || sub === 'openrouter2' || sub === 'groq' || sub === 'auto') {
            store.setWiseresumeSubProvider(sub);
          }
        }

        // Seed "last used" provider from most recent AI usage log
        try {
          const { data: recentLog } = await supabase
            .from('ai_usage_logs')
            .select('metadata')
            .neq('action_type', 'score')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (recentLog?.metadata) {
            const lastProvider = (recentLog.metadata as any)?.provider;
            if (lastProvider && lastProvider !== 'deterministic') {
              useAIHealthStore.getState().recordProvider(lastProvider);
            }
          }
        } catch {
          // Non-critical
        }

        hydrated.current = true;
      } catch (err) {
        console.warn('[useAIKeyHydration] Failed to hydrate keys:', err);
      }
    };

    hydrate();
  }, [isAuthenticated, user?.id]);
}
