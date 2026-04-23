/**
 * Stub. The flat 6-key pool client (`_shared/aiClient.ts`) doesn't use any
 * of these constants — the BYOK / OpenRouter-curated / OpenAI-compatible
 * routing they described is gone. The exports remain as harmless empties
 * so the few remaining importers (notably `_shared/creditUtils.ts`) keep
 * compiling.
 */

export const BYOK_PROVIDER_ALLOWLIST: ReadonlySet<string> = new Set<string>();
export const OPENAI_COMPAT_BASE_URLS: Readonly<Record<string, string>> = {};
export const OPENROUTER_CURATED_MODELS: readonly string[] = [];
export const OPENROUTER_AUTO_SENTINEL = '__none__';

export function isAllowedOpenRouterModel(_model: string | null | undefined): boolean {
  return false;
}

export const NON_OPENAI_COMPAT_BYOK_PROVIDERS: readonly string[] = [];
