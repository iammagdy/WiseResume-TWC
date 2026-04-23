/**
 * Stub model router.
 *
 * The real router used to pick between OpenRouter / OpenRouter2 / Groq /
 * Gemini etc. with per-tool overrides from `app_settings`. The new flat
 * 6-key pool client (`_shared/aiClient.ts`) does its own random
 * provider+key pick on every call, so this module has no work to do.
 *
 * We keep the `selectProviderForTool` export so the 30+ AI edge functions
 * that still call `__ROUTE = selectProviderForTool('foo')` and pass
 * `__ROUTE.model` / `__ROUTE.provider` through to `callAIWithRetry` keep
 * compiling. Both fields are ignored downstream.
 */

export interface RouteSelection {
  /** Always 'auto' — the actual provider is picked inside callAIWithRetry. */
  provider: 'auto';
  /** Empty — actual model is decided inside callAIWithRetry. */
  model: string;
}

const ROUTE: RouteSelection = { provider: 'auto', model: '' };

export function selectProviderForTool(_toolName: string): RouteSelection {
  return ROUTE;
}
