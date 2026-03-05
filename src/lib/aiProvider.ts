/**
 * AI Provider Utilities
 * Helper functions to get AI provider configuration for frontend service layer
 */

import { useSettingsStore } from '@/store/settingsStore';


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
  const { aiProvider, geminiKeyTier, geminiKeyValidated, ollamaKeyValidated } = useSettingsStore.getState();
  
  if (aiProvider === 'wiseresume') {
    return { name: 'WiseResume AI', isCustomKey: false, tier: 'default' };
  }
  
  if (aiProvider === 'ollama') {
    return {
      name: ollamaKeyValidated ? 'Ollama' : 'Ollama (Not Configured)',
      isCustomKey: true,
      tier: ollamaKeyValidated ? 'paid' : 'free',
    };
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

/**
 * Standard AI Error Handler
 * Parses error responses and throws descriptive errors for common status codes
 */
export async function handleAIError(response: Response, defaultMessage: string): Promise<never> {
  let errorData: any;
  try {
    errorData = await response.json();
  } catch (e) {
    errorData = { error: 'Request failed' };
  }

  if (response.status === 429) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
  if (response.status === 402) {
    throw new Error('AI credits exhausted. Please add more credits.');
  }
  if (response.status === 401 && errorData.error?.includes('Invalid')) {
    throw new Error('Invalid Gemini API key. Please check your AI settings.');
  }

  throw new Error(errorData.error || defaultMessage);
}
