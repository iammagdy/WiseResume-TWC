/**
 * AI Provider Utilities
 * Helper functions to get AI provider configuration for frontend service layer
 */

import { useSettingsStore } from '@/store/settingsStore';

/**
 * Gets the user's Gemini API key if they're using the Gemini provider
 * Returns undefined if using Lovable (default) or no key is configured
 */
export function getUserGeminiKey(): string | undefined {
  const { aiProvider, geminiApiKey, geminiKeyValidated } = useSettingsStore.getState();
  
  if (aiProvider === 'gemini' && geminiApiKey && geminiKeyValidated) {
    return geminiApiKey;
  }
  
  return undefined;
}

/**
 * Increments the daily usage counter for Gemini free tier
 * Should be called after a successful AI request when using Gemini
 */
export function trackGeminiUsage(): void {
  const { aiProvider, geminiKeyTier, incrementGeminiDailyUsage } = useSettingsStore.getState();
  
  if (aiProvider === 'gemini' && geminiKeyTier === 'free') {
    incrementGeminiDailyUsage();
  }
}

/**
 * Gets provider info for display purposes
 */
export function getAIProviderInfo(): {
  name: string;
  isCustomKey: boolean;
  tier: 'default' | 'free' | 'paid';
} {
  const { aiProvider, geminiKeyTier, geminiKeyValidated } = useSettingsStore.getState();
  
  if (aiProvider === 'lovable') {
    return { name: 'WiseResume AI', isCustomKey: false, tier: 'default' };
  }
  
  if (!geminiKeyValidated) {
    return { name: 'Gemini (Not Configured)', isCustomKey: true, tier: 'free' };
  }
  
  return {
    name: `Gemini (${geminiKeyTier === 'paid' ? 'Paid' : 'Free'})`,
    isCustomKey: true,
    tier: geminiKeyTier === 'paid' ? 'paid' : 'free',
  };
}
