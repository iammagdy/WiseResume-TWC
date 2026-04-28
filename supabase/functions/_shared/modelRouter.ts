/**
 * Model router — canonical feature routing helper.
 *
 * Resolves which AI provider and model to use for a given feature name by
 * querying `ai_routing_config`. Applies weighted A/B splits when configured.
 *
 * Usage:
 *   const route = await resolveFeatureRoute('tailor-resume');
 *   // route.provider = 'groq', route.model = 'llama-3.3-70b-versatile'
 *   // Pass featureName to callAI / callAIWithRetry — aiClient calls this internally.
 *
 * Legacy callers (30+ edge functions) that still call selectProviderForTool()
 * get a no-op stub. Migrate them to pass featureName directly to callAI instead.
 */

import { getServiceClient } from './dbClient.ts';

export interface RouteSelection {
  provider: 'auto' | 'openrouter' | 'groq' | 'deepseek';
  model: string;
}

/**
 * Resolve the provider and model for a named AI feature.
 * Returns `{ provider: 'auto', model: '' }` on any lookup failure so callers
 * fall back to random pool selection.
 *
 * This is the same logic used inside `aiClient.callAI` / `callAIWithRetry` when
 * `featureName` is provided — exposed here so other code can inspect routing
 * decisions without making an AI call.
 */
export async function resolveFeatureRoute(featureName: string): Promise<RouteSelection> {
  try {
    const db = getServiceClient();
    const { data } = await db
      .from('ai_routing_config')
      .select('provider, model, ab_secondary_provider, ab_secondary_model, ab_split_pct')
      .eq('feature_name', featureName)
      .maybeSingle();

    if (!data || !data.provider || data.provider === 'auto') {
      return { provider: 'auto', model: '' };
    }

    // A/B split: route ab_split_pct% of traffic to secondary provider
    if (data.ab_secondary_provider && (data.ab_split_pct ?? 0) > 0) {
      if (Math.random() * 100 < data.ab_split_pct) {
        return {
          provider: data.ab_secondary_provider as RouteSelection['provider'],
          model: (data.ab_secondary_model ?? '') || '',
        };
      }
    }

    return {
      provider: data.provider as RouteSelection['provider'],
      model: (data.model ?? '') || '',
    };
  } catch {
    return { provider: 'auto', model: '' };
  }
}

/**
 * Legacy no-op helper kept for backward compatibility.
 * New code should pass `featureName` to `callAI` / `callAIWithRetry` directly
 * so routing config is applied at call time with retries and fallbacks intact.
 *
 * @deprecated Use `featureName` on `AICallOptions` instead.
 */
const LEGACY_ROUTE: RouteSelection = { provider: 'auto', model: '' };
export function selectProviderForTool(_toolName: string): RouteSelection {
  return LEGACY_ROUTE;
}
