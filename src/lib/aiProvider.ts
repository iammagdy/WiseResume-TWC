/**
 * AI Provider Utilities
 * Helper functions to get AI provider configuration for frontend service layer
 */

import { useSettingsStore, AIProvider } from '@/store/settingsStore';

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
  wiseresume: 'WiseResume AI',
};

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
 * Wraps an async AI call so the Gemini free-tier counter is incremented exactly
 * once on success. Prefer this helper over calling `trackGeminiUsage()` manually
 * — it eliminates the "forgot the increment after adding a new edge function"
 * class of bugs and ensures we never double-count on retries inside `fn`.
 *
 * Usage:
 *   const data = await withGeminiUsage(() => callMyEdgeFunction(...));
 *
 * The counter is only bumped when `fn` resolves; thrown errors do not count.
 */
export async function withGeminiUsage<T>(fn: () => Promise<T>): Promise<T> {
  const result = await fn();
  trackGeminiUsage();
  return result;
}

/**
 * Gets provider info for display purposes
 */
export function getAIProviderInfo(): {
  name: string;
  isCustomKey: boolean;
  tier: 'default' | 'free' | 'paid';
} {
  const store = useSettingsStore.getState();
  const { aiProvider } = store;
  
  if (aiProvider === 'wiseresume') {
    return { name: 'WiseResume AI', isCustomKey: false, tier: 'default' };
  }
  
  if (aiProvider === 'ollama') {
    return {
      name: store.ollamaKeyValidated ? 'Ollama' : 'Ollama (Not Configured)',
      isCustomKey: true,
      tier: store.ollamaKeyValidated ? 'paid' : 'free',
    };
  }

  if (aiProvider === 'openrouter') {
    return {
      name: store.openrouterKeyValidated ? 'OpenRouter' : 'OpenRouter (Not Configured)',
      isCustomKey: true,
      tier: store.openrouterKeyValidated ? 'paid' : 'free',
    };
  }
  
  if (aiProvider === 'gemini') {
    if (!store.geminiKeyValidated) {
      return { name: 'Gemini (Not Configured)', isCustomKey: true, tier: 'free' };
    }
    return {
      name: `Gemini (${store.geminiKeyTier === 'paid' ? 'Paid' : 'Free'})`,
      isCustomKey: true,
      tier: store.geminiKeyTier === 'paid' ? 'paid' : 'free',
    };
  }

  // Generic handler for new BYOK providers
  const validatedMap: Partial<Record<AIProvider, boolean>> = {
    openai: store.openaiKeyValidated,
    anthropic: store.anthropicKeyValidated,
    groq: store.groqKeyValidated,
    mistral: store.mistralKeyValidated,
    xai: store.xaiKeyValidated,
    cohere: store.cohereKeyValidated,
  };
  const isValidated = validatedMap[aiProvider] ?? false;
  const displayName = PROVIDER_DISPLAY_NAMES[aiProvider] || aiProvider;

  return {
    name: isValidated ? displayName : `${displayName} (Not Configured)`,
    isCustomKey: true,
    tier: isValidated ? 'paid' : 'free',
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
    throw new Error('Invalid API key. Please check your AI settings.');
  }

  throw new Error(errorData.error || defaultMessage);
}
