/**
 * Stub — every user is now on the managed flat-pool engine.
 */
export interface AIProviderInfo {
  provider: 'wiseresume';
  label: string;
  isByok: boolean;
  isManaged: true;
  modelHint: string;
}

export function useAIProviderInfo(): AIProviderInfo {
  return {
    provider: 'wiseresume',
    label: 'WiseResume AI',
    isByok: false,
    isManaged: true,
    modelHint: 'Managed pool (OpenRouter + Groq)',
  };
}
