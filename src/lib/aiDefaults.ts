/**
 * Stub — historical defaults for BYOK provider/model selection.
 * The flat 6-key pool decides everything server-side now.
 */
export const DEFAULT_AI_PROVIDER = 'wiseresume' as const;
export const DEFAULT_AI_MODEL = '' as const;
export const BYOK_DEFAULT_MODELS: Record<string, string> = {};

export const OPENROUTER_DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
export const OPENROUTER_AUTO_SENTINEL = '__auto__';

export function isAllowedOpenRouterModel(_model: unknown): boolean {
  return true;
}
