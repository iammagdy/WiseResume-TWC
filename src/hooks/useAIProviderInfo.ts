/**
 * Reactive hook for AI provider information
 * Provides real-time updates when the AI provider settings change
 */

import { useSettingsStore, AIProvider } from '@/store/settingsStore';

export interface AIProviderInfo {
  provider: AIProvider;
  name: string;
  isCustomKey: boolean;
  tier: 'default' | 'free' | 'paid';
  tierLabel: string;
  isValidated: boolean;
}

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Claude (Anthropic)',
  gemini: 'Google Gemini',
  groq: 'Groq',
  mistral: 'Mistral AI',
  xai: 'xAI (Grok)',
  cohere: 'Cohere',
  openrouter: 'OpenRouter',
  ollama: 'Ollama',
};

export function useAIProviderInfo(): AIProviderInfo {
  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const geminiKeyTier = useSettingsStore((s) => s.geminiKeyTier);
  const geminiKeyValidated = useSettingsStore((s) => s.geminiKeyValidated);
  const geminiModel = useSettingsStore((s) => s.geminiModel);
  const ollamaKeyValidated = useSettingsStore((s) => s.ollamaKeyValidated);
  const ollamaModel = useSettingsStore((s) => s.ollamaModel);
  const openrouterKeyValidated = useSettingsStore((s) => s.openrouterKeyValidated);
  const openrouterModel = useSettingsStore((s) => s.openrouterModel);
  const openaiKeyValidated = useSettingsStore((s) => s.openaiKeyValidated);
  const openaiModel = useSettingsStore((s) => s.openaiModel);
  const anthropicKeyValidated = useSettingsStore((s) => s.anthropicKeyValidated);
  const anthropicModel = useSettingsStore((s) => s.anthropicModel);
  const groqKeyValidated = useSettingsStore((s) => s.groqKeyValidated);
  const groqModel = useSettingsStore((s) => s.groqModel);
  const mistralKeyValidated = useSettingsStore((s) => s.mistralKeyValidated);
  const mistralModel = useSettingsStore((s) => s.mistralModel);
  const xaiKeyValidated = useSettingsStore((s) => s.xaiKeyValidated);
  const xaiModel = useSettingsStore((s) => s.xaiModel);
  const cohereKeyValidated = useSettingsStore((s) => s.cohereKeyValidated);
  const cohereModel = useSettingsStore((s) => s.cohereModel);

  if (aiProvider === 'wiseresume') {
    return {
      provider: 'wiseresume',
      name: 'WiseResume AI',
      isCustomKey: false,
      tier: 'default',
      tierLabel: '',
      isValidated: true,
    };
  }

  const displayName = PROVIDER_DISPLAY_NAMES[aiProvider] || aiProvider;

  if (aiProvider === 'ollama') {
    const modelSuffix = ollamaKeyValidated && ollamaModel ? ` · ${ollamaModel}` : '';
    return {
      provider: 'ollama',
      name: `Ollama${modelSuffix}`,
      isCustomKey: true,
      tier: ollamaKeyValidated ? 'paid' : 'free',
      tierLabel: ollamaKeyValidated ? 'Connected' : 'Not Configured',
      isValidated: ollamaKeyValidated,
    };
  }

  if (aiProvider === 'openrouter') {
    const modelSuffix = openrouterKeyValidated && openrouterModel ? ` · ${openrouterModel}` : '';
    return {
      provider: 'openrouter',
      name: `OpenRouter${modelSuffix}`,
      isCustomKey: true,
      tier: openrouterKeyValidated ? 'paid' : 'free',
      tierLabel: openrouterKeyValidated ? 'Connected' : 'Not Configured',
      isValidated: openrouterKeyValidated,
    };
  }

  if (aiProvider === 'gemini') {
    if (!geminiKeyValidated) {
      return {
        provider: 'gemini',
        name: 'Gemini',
        isCustomKey: true,
        tier: 'free',
        tierLabel: 'Not Configured',
        isValidated: false,
      };
    }
    const tier: 'free' | 'paid' = geminiKeyTier === 'paid' ? 'paid' : 'free';
    const tierLabel = geminiKeyTier === 'paid' ? 'Paid' : geminiKeyTier === 'unknown' ? '' : 'Free';
    const modelSuffix = geminiModel ? ` · ${geminiModel}` : '';
    return {
      provider: 'gemini',
      name: `Gemini${modelSuffix}`,
      isCustomKey: true,
      tier,
      tierLabel,
      isValidated: true,
    };
  }

  // Generic handler for new BYOK providers
  const providerValidated: Record<string, boolean> = {
    openai: openaiKeyValidated,
    anthropic: anthropicKeyValidated,
    groq: groqKeyValidated,
    mistral: mistralKeyValidated,
    xai: xaiKeyValidated,
    cohere: cohereKeyValidated,
  };
  const providerModels: Record<string, string> = {
    openai: openaiModel,
    anthropic: anthropicModel,
    groq: groqModel,
    mistral: mistralModel,
    xai: xaiModel,
    cohere: cohereModel,
  };

  const isValidated = providerValidated[aiProvider] ?? false;
  const activeModel = providerModels[aiProvider] ?? '';
  const modelSuffix = isValidated && activeModel ? ` · ${activeModel}` : '';

  return {
    provider: aiProvider,
    name: `${displayName}${modelSuffix}`,
    isCustomKey: true,
    tier: isValidated ? 'paid' : 'free',
    tierLabel: isValidated ? 'Connected' : 'Not Configured',
    isValidated,
  };
}
