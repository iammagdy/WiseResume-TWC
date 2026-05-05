/**
 * Canonical AI model slug constants for WiseResume edge functions.
 *
 * These are the only place where model slugs should be written as string
 * literals. When a model is deprecated or you want to switch providers,
 * update the constant here and every function that imports it picks up
 * the change without a per-file code deploy.
 *
 * HOW TO UPDATE A MODEL
 * ─────────────────────
 * 1. Change the relevant constant below (or add a new one).
 * 2. Run `supabase functions deploy` (or deploy all functions) to push
 *    the new bundle to production.
 * 3. Optionally update `app_settings` rows in the DB for runtime-only
 *    overrides that don't require a deploy at all.
 *
 * RUNTIME OVERRIDES
 * ─────────────────
 * The `wiseresume_ai_engine` row in `app_settings` can change the active
 * sub-provider at runtime. Individual model slugs are compile-time defaults;
 * for per-request model overrides use the DevKit admin panel which reads from
 * `app_settings` on every call.
 */

// ── WiseResume Managed Sub-provider Models ────────────────────────────────────

/** Default OpenRouter model (primary managed sub-provider). */
export const WISERESUME_OPENROUTER_MODEL = 'google/gemma-4-31b-it:free';

/** OpenRouter 2 pinned model (premium reasoning path). */
export const WISERESUME_OPENROUTER2_MODEL = 'openai/gpt-oss-120b:free';

/** Groq managed model (fast structured-output path). */
export const WISERESUME_GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * Heuristic groq slug used when the routing layer hasn't yet been updated
 * to emit `providerUsed` suffixes. Kept for backward-compat with older
 * edge function deployments.
 */
export const LEGACY_GROQ_MODEL = 'qwen/qwen3-32b';

/**
 * Legacy OpenRouter 2 slug kept only for display heuristics in ai-test
 * when the actual providerUsed suffix is unavailable.
 */
export const LEGACY_OPENROUTER2_MODEL = 'openrouter/elephant-alpha';

// ── BYOK Provider Default Models ─────────────────────────────────────────────
// Used as fallbacks when a user has configured a BYOK provider but has not
// explicitly chosen a model. These are safe, widely-available defaults.

export const BYOK_DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-20241022',
  groq: LEGACY_GROQ_MODEL,
  mistral: 'mistral-small-latest',
  xai: 'grok-2-mini',
  cohere: 'command-r',
  gemini: 'gemini-2.5-flash',
  openrouter: '',
  ollama: '',
};

// ── DevKit AI-Test Slot Model Allow-Lists ────────────────────────────────────
// Curated per-provider model choices the admin can pick for each AI key slot
// in the DevKit "Send test request" panel. Frontend dropdown options and
// backend body validation are driven from the same source so they cannot
// drift. Anything outside the list is rejected and the request falls back to
// AI_TEST_DEFAULT_MODELS for that provider.
//
// The list has two layers:
//   1. AI_TEST_MODEL_ALLOWLIST — hardcoded "seed" defaults that ship with
//      the function. Always available, never empty, used as a hard fallback.
//   2. app_settings.ai_test_model_allowlist — dynamic catalog refreshed from
//      each provider's `/models` endpoint by the `refresh-ai-test-models`
//      scheduled function. Includes per-model hints (tier / deprecated).
//      `loadAITestModelCatalog()` reads this row and merges it with the seed
//      so admins always see at least the seed values, plus whatever fresh
//      models came back from the latest refresh.
//
// Validation paths (`isAllowedAITestModelDynamic`) accept a model when it
// appears in EITHER layer, so an admin's previously-saved selection keeps
// working until they choose a different one even after a refresh removes
// the slug upstream.

import type {
  CuratedAllowlist,
  CuratedModel,
  CuratedProviderEntry,
} from './aiTestModelCatalog.ts';
import { mergeWithSeed, toIdList } from './aiTestModelCatalog.ts';

export type AITestProvider = 'openrouter' | 'groq' | 'deepseek';

/** Backward-compatible default per provider — matches the previous hardcoded
 *  ai-test values so behaviour is unchanged when no model is selected. */
export const AI_TEST_DEFAULT_MODELS: Record<AITestProvider, string> = {
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  groq: 'llama-3.3-70b-versatile',
  deepseek: 'deepseek-v4-flash',
};

/**
 * Hard-coded seed allow-list. Used as the always-available fallback when
 * the dynamic catalog row is missing, the upstream fetch failed, or the
 * persisted JSON is malformed. This is the SAME list the DevKit shipped
 * with before the dynamic refresh existed.
 */
export const AI_TEST_MODEL_ALLOWLIST: Record<AITestProvider, readonly string[]> = {
  // Confirmed live on OpenRouter as of 2026-06-06 (fetched from /api/v1/models).
  // Free models only — sorted alphabetically by slug. The dynamic refresh
  // (`refresh-test-models`) will extend this list nightly; these seeds ensure
  // the dropdown is never empty even before the first refresh runs.
  openrouter: [
    'google/gemma-3-12b-it:free',
    'google/gemma-3-27b-it:free',
    'google/gemma-3-4b-it:free',
    'google/gemma-4-26b-a4b-it:free',
    'google/gemma-4-31b-it:free',
    'meta-llama/llama-3.2-3b-instruct:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'nousresearch/hermes-3-llama-3.1-405b:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'openai/gpt-oss-120b:free',
    'openai/gpt-oss-20b:free',
    'qwen/qwen3-coder:free',
    'qwen/qwen3-next-80b-a3b-instruct:free',
  ],
  // Confirmed live on Groq as of 2026-06-06. All Groq chat models are free-tier.
  groq: [
    'compound-beta',
    'compound-beta-mini',
    'gemma2-9b-it',
    'llama-3.1-8b-instant',
    'llama-3.3-70b-specdec',
    'llama-3.3-70b-versatile',
    'qwen-qwq-32b',
  ],
  deepseek: [
    'deepseek-v4-flash',
    'deepseek-chat',
    'deepseek-reasoner',
  ],
};

/** Canonical app_settings row key for the persisted dynamic catalog. */
export const AI_TEST_MODEL_ALLOWLIST_KEY = 'ai_test_model_allowlist';

export function isAITestProvider(value: unknown): value is AITestProvider {
  return value === 'openrouter' || value === 'groq' || value === 'deepseek';
}

/**
 * Cheap synchronous seed-only check — kept for callers that genuinely
 * cannot await (none today). Prefer `isAllowedAITestModelDynamic` so an
 * admin's saved choice from a freshly-refreshed model still validates.
 */
export function isAllowedAITestModel(provider: string, model: string): boolean {
  if (!isAITestProvider(provider)) return false;
  return AI_TEST_MODEL_ALLOWLIST[provider].includes(model);
}

/**
 * Validate a model against the dynamic catalog merged with the seed list.
 * Use this in any code path that already has the catalog loaded for the
 * request so a model freshly added upstream is accepted on the first call.
 */
export function isAllowedAITestModelDynamic(
  provider: string,
  model: string,
  catalog: AITestModelCatalog,
): boolean {
  if (!isAITestProvider(provider)) return false;
  return catalog.allowlist[provider].includes(model);
}

/** Resolve the model to use for an ai-test call: validated requested model →
 *  AI_TEST_DEFAULT_MODELS[provider]. Caller is responsible for layering in
 *  any persisted per-slot choice before calling this. */
export function resolveAITestModel(provider: AITestProvider, requested: string | undefined | null): string {
  const trimmed = typeof requested === 'string' ? requested.trim() : '';
  if (trimmed && isAllowedAITestModel(provider, trimmed)) return trimmed;
  return AI_TEST_DEFAULT_MODELS[provider];
}

// ── Dynamic catalog loader ──────────────────────────────────────────────────

export interface AITestModelCatalog {
  /** Plain id-only allow-list per provider, used for cheap validation. */
  allowlist: Record<AITestProvider, string[]>;
  /** Detailed per-model entries (tier / deprecated / hint) per provider. */
  detailed: Record<AITestProvider, CuratedModel[]>;
  /** ISO timestamp of the last successful refresh, or null if never run. */
  lastRefreshedAt: string | null;
  /** Fetch metadata per provider (so the UI can surface stale-fetch warnings). */
  providerMeta: Record<AITestProvider, { fetchedAt: string | null; fetchOk: boolean; fetchError?: string }>;
}

/**
 * Minimal Postgrest-shaped client surface so we can accept either the
 * supabase-js service client or any test stub that mimics it.
 */
interface AppSettingsClient {
  from(table: 'app_settings'): {
    select(cols: string): {
      eq(col: string, val: string): {
        maybeSingle(): Promise<{ data: { value: unknown } | null; error: unknown }>;
      };
    };
  };
}

const PROVIDERS: readonly AITestProvider[] = ['openrouter', 'groq', 'deepseek'] as const;

/**
 * Load the persisted dynamic catalog and merge it with the hardcoded seed.
 *
 * Read-once: if the DB read fails or the row is missing, the function
 * returns a catalog backed entirely by the seed list with `lastRefreshedAt:
 * null` and `fetchOk: false` for every provider. Callers can therefore
 * never blow up because the scheduled job hasn't run yet.
 */
export async function loadAITestModelCatalog(
  db: AppSettingsClient,
): Promise<AITestModelCatalog> {
  let raw: unknown = null;
  try {
    const { data, error } = await db
      .from('app_settings')
      .select('value')
      .eq('key', AI_TEST_MODEL_ALLOWLIST_KEY)
      .maybeSingle();
    if (!error && data && typeof data === 'object') {
      raw = (data as { value?: unknown }).value;
    }
  } catch {
    raw = null;
  }
  return buildCatalogFromPersisted(raw);
}

/**
 * Pure helper that turns a persisted JSONB blob into the runtime catalog
 * shape. Exposed so the refresh function can reuse the same merging logic
 * and tests can verify it without a live DB.
 */
export function buildCatalogFromPersisted(raw: unknown): AITestModelCatalog {
  const persisted = parsePersistedAllowlist(raw);
  const detailed = {} as Record<AITestProvider, CuratedModel[]>;
  const allowlist = {} as Record<AITestProvider, string[]>;
  const providerMeta = {} as AITestModelCatalog['providerMeta'];

  for (const p of PROVIDERS) {
    const entry = persisted?.providers?.[p] ?? null;
    const fresh = Array.isArray(entry?.models) ? entry!.models : [];
    detailed[p] = mergeWithSeed(fresh, AI_TEST_MODEL_ALLOWLIST[p]);
    allowlist[p] = toIdList(detailed[p]);
    providerMeta[p] = {
      fetchedAt: entry?.fetchedAt ?? null,
      fetchOk: entry?.fetchOk ?? false,
      fetchError: entry?.fetchError,
    };
  }

  return {
    allowlist,
    detailed,
    lastRefreshedAt: persisted?.lastRefreshedAt ?? null,
    providerMeta,
  };
}

function parsePersistedAllowlist(raw: unknown): Partial<CuratedAllowlist> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as { lastRefreshedAt?: unknown; providers?: unknown };
  const lastRefreshedAt = typeof r.lastRefreshedAt === 'string' ? r.lastRefreshedAt : undefined;
  if (!r.providers || typeof r.providers !== 'object' || Array.isArray(r.providers)) {
    return lastRefreshedAt ? { lastRefreshedAt } : null;
  }
  const providers = {} as Record<AITestProvider, CuratedProviderEntry>;
  for (const p of PROVIDERS) {
    const e = (r.providers as Record<string, unknown>)[p];
    if (!e || typeof e !== 'object' || Array.isArray(e)) continue;
    const ent = e as {
      fetchedAt?: unknown;
      fetchOk?: unknown;
      fetchError?: unknown;
      models?: unknown;
    };
    const models: CuratedModel[] = [];
    if (Array.isArray(ent.models)) {
      for (const m of ent.models) {
        if (!m || typeof m !== 'object' || Array.isArray(m)) continue;
        const mm = m as { id?: unknown; tier?: unknown; deprecated?: unknown; hint?: unknown };
        const id = typeof mm.id === 'string' ? mm.id.trim() : '';
        if (!id) continue;
        const tier = mm.tier === 'free' || mm.tier === 'paid' || mm.tier === 'unknown' ? mm.tier : undefined;
        models.push({
          id,
          ...(tier ? { tier } : {}),
          ...(mm.deprecated === true ? { deprecated: true } : {}),
          ...(typeof mm.hint === 'string' && mm.hint ? { hint: mm.hint } : {}),
        });
      }
    }
    providers[p] = {
      fetchedAt: typeof ent.fetchedAt === 'string' ? ent.fetchedAt : '',
      fetchOk: ent.fetchOk === true,
      ...(typeof ent.fetchError === 'string' ? { fetchError: ent.fetchError } : {}),
      models,
    };
  }
  return { lastRefreshedAt, providers };
}
