/**
 * Reactive hook for AI provider information
 * Provides real-time updates when the AI provider settings change
 */

import { useSettingsStore, AIProvider, GeminiKeyTier } from '@/store/settingsStore';

export interface AIProviderInfo {
  provider: AIProvider;
  name: string;
  isCustomKey: boolean;
  tier: 'default' | 'free' | 'paid';
  tierLabel: string;
  isValidated: boolean;
}

export function useAIProviderInfo(): AIProviderInfo {
  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const geminiKeyTier = useSettingsStore((s) => s.geminiKeyTier);
  const geminiKeyValidated = useSettingsStore((s) => s.geminiKeyValidated);

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

  // Gemini provider
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
  const tierLabel = geminiKeyTier === 'paid' ? 'Paid' : 'Free';

  return {
    provider: 'gemini',
    name: `Gemini ${tierLabel}`,
    isCustomKey: true,
    tier,
    tierLabel,
    isValidated: true,
  };
}
