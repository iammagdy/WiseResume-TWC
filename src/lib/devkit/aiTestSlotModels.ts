/**
 * Shared frontend helper for the per-slot AI test-model selection.
 *
 * The 9 AI key slots (3× OpenRouter, 3× Groq, 3× DeepSeek) each have a
 * model that the DevKit "Send test request" button hits. The selection
 * lives in `app_settings.ai_test_slot_models` (a JSONB map keyed by
 * `${provider}:${slot}`) and is exposed by the `inspect-ai-keys` edge
 * function. Until now only the AI Keys panel inside DevKit knew how to
 * read that map — every other admin view was showing the old hardcoded
 * defaults, which is misleading.
 *
 * Use {@link fetchAITestSlotModels} to load the canonical map plus the
 * provider defaults in one call, and {@link getAITestSlotModel} to ask
 * "what model does `openrouter:1` test against right now?" without
 * caring whether the slot has a saved override or is falling back to
 * the provider default.
 */
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { devKitAuthHeaders } from './devKitAuth';
import { unwrapAdminResponse } from './edgeResponse';

export type AITestProvider = 'openrouter' | 'groq' | 'deepseek' | 'nvidia';
export type AITestSlot = 1 | 2 | 3;

export const AI_TEST_PROVIDERS: readonly AITestProvider[] = ['openrouter', 'groq', 'deepseek', 'nvidia'] as const;
export const AI_TEST_SLOTS: readonly AITestSlot[] = [1, 2, 3] as const;
export const AI_KEY_SLOT_MAP = {
  openrouter: [1, 2, 3],
  groq: [1, 2, 3],
  nvidia: [1, 2, 3],
  deepseek: [1],
} as const satisfies Record<AITestProvider, readonly AITestSlot[]>;

/**
 * A curated LLM model entry for use in DevKit dropdowns.
 * `tier` indicates whether the model costs API credits ('paid') or has
 * a free-to-use tier ('free'). `deprecated` models are shown with a
 * strike-through label and should not be used for new configurations.
 * `knownCompatible` is true for models verified to work with /chat/completions.
 * Live-catalog-only models (not in the curated list) do not have this flag.
 */
export interface CuratedLLMModel {
  label: string;
  value: string;
  tier: 'free' | 'paid';
  deprecated?: boolean;
  /** Set to true for models that are verified compatible with /chat/completions. Absent on live-catalog-only entries. */
  knownCompatible?: boolean;
}

/**
 * DeepSeek LLM models available in the DevKit model selector.
 * DeepSeek requires an API key for all models; all are marked 'paid'.
 *
 * Last verified: 2026-05-11
 * Source: https://api-docs.deepseek.com
 * Note: `deepseek-chat` and `deepseek-reasoner` are legacy aliases for
 *       deepseek-v4-flash (non-thinking and thinking mode respectively).
 *       Both are scheduled for removal on 2026-07-24.
 */
export const DEEPSEEK_LLM_MODELS: ReadonlyArray<CuratedLLMModel> = [
  { label: 'DeepSeek Chat',                     value: 'deepseek-chat',                      tier: 'paid', knownCompatible: true },
  { label: 'DeepSeek Reasoner',                 value: 'deepseek-reasoner',                  tier: 'paid', knownCompatible: true },
];

/**
 * NVIDIA NIM LLM models available in the DevKit model selector. All NIM models are paid.
 */
export const NVIDIA_LLM_MODELS: ReadonlyArray<CuratedLLMModel> = [
  { label: 'Llama 3.3 70B Instruct',            value: 'meta/llama-3.3-70b-instruct',                 tier: 'paid', knownCompatible: true },
  { label: 'Llama 3.1 Nemotron 70B Instruct',   value: 'nvidia/llama-3.1-nemotron-70b-instruct',      tier: 'paid', knownCompatible: true },
  { label: 'Nemotron 4 340B Instruct',          value: 'nvidia/nemotron-4-340b-instruct',             tier: 'paid', knownCompatible: true },
  { label: 'Llama 3.1 8B Instruct',             value: 'meta/llama-3.1-8b-instruct',                  tier: 'paid', knownCompatible: true },
  { label: 'Llama 3.1 70B Instruct',            value: 'meta/llama-3.1-70b-instruct',                 tier: 'paid', knownCompatible: true },
  { label: 'Mixtral 8x7B Instruct',             value: 'mistralai/mixtral-8x7b-instruct-v0.1',        tier: 'paid', knownCompatible: true },
];

/**
 * OpenRouter LLM models available in the DevKit model selector.
 */
export const OPENROUTER_LLM_MODELS: ReadonlyArray<CuratedLLMModel> = [
  { label: 'Llama 3.3 70B Instruct (Free)',     value: 'meta-llama/llama-3.3-70b-instruct:free',     tier: 'free', knownCompatible: true },
  { label: 'Gemma 2 9B IT (Free)',              value: 'google/gemma-2-9b-it:free',                  tier: 'free', knownCompatible: true },
  { label: 'Llama 3 8B Instruct (Free)',        value: 'meta-llama/llama-3-8b-instruct:free',        tier: 'free', knownCompatible: true },
  { label: 'Qwen 2.5 7B Instruct (Free)',       value: 'qwen/qwen-2.5-7b-instruct:free',             tier: 'free', knownCompatible: true },
  { label: 'Mistral 7B Instruct (Free)',        value: 'mistralai/mistral-7b-instruct:free',         tier: 'free', knownCompatible: true },
  { label: 'Phi 3 Medium 128k Instruct (Free)', value: 'microsoft/phi-3-medium-128k-instruct:free',  tier: 'free', knownCompatible: true },
  { label: 'OpenChat 7B (Free)',                value: 'openchat/openchat-7b:free',                  tier: 'free', knownCompatible: true },
];

/**
 * Groq LLM models available in the DevKit model selector.
 */
export const GROQ_LLM_MODELS: ReadonlyArray<CuratedLLMModel> = [
  { label: 'Llama 3.3 70B Versatile',           value: 'llama-3.3-70b-versatile',                     tier: 'paid', knownCompatible: true },
  { label: 'Llama 3.1 8B Instant',              value: 'llama-3.1-8b-instant',                        tier: 'paid', knownCompatible: true },
  { label: 'Mixtral 8x7B 32768',                value: 'mixtral-8x7b-32768',                          tier: 'paid', knownCompatible: true },
  { label: 'Gemma 2 9B IT',                     value: 'gemma2-9b-it',                                tier: 'paid', knownCompatible: true },
  { label: 'Llama 3.2 1B Preview',              value: 'llama-3.2-1b-preview',                        tier: 'paid', knownCompatible: true },
  { label: 'Llama 3.2 3B Preview',              value: 'llama-3.2-3b-preview',                        tier: 'paid', knownCompatible: true },
];

/** Providers that use a curated dropdown (rather than a free-text input) in the DevKit AI Keys panel. */
export const DROPDOWN_PROVIDERS = new Set<AITestProvider>(['nvidia', 'openrouter', 'groq', 'deepseek']);

/** Returns the curated model list for a given provider. */
export function getCuratedModels(provider: AITestProvider): ReadonlyArray<CuratedLLMModel> {
  if (provider === 'nvidia') return NVIDIA_LLM_MODELS;
  if (provider === 'openrouter') return OPENROUTER_LLM_MODELS;
  if (provider === 'groq') return GROQ_LLM_MODELS;
  return DEEPSEEK_LLM_MODELS;
}

export const FALLBACK_AI_TEST_DEFAULT_MODELS: Record<AITestProvider, string> = {
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  groq: 'llama-3.3-70b-versatile',
  deepseek: 'deepseek-chat',
  nvidia: 'meta/llama-3.3-70b-instruct',
};

export function aiTestSlotKey(provider: AITestProvider, slot: AITestSlot): string {
  return `${provider}:${slot}`;
}

export function providerDisplayName(provider: AITestProvider): string {
  if (provider === 'openrouter') return 'OpenRouter';
  if (provider === 'groq') return 'Groq';
  if (provider === 'nvidia') return 'NVIDIA NIM';
  return 'DeepSeek';
}

export interface AITestSlotMap {
  /** Per-slot active (resolved) model, keyed by `${provider}:${slot}`.
   *  Always populated for every configured slot — falls back to the
   *  provider default when no override is saved. */
  slotModels: Record<string, string>;
  /** Raw saved overrides from `app_settings.ai_test_slot_models`. A key
   *  is present here only when the admin explicitly chose a model for
   *  that slot. Use this — not `slotModels` — to tell "saved override"
   *  apart from "fell back to default" when the two values coincide. */
  savedOverrides: Record<string, string>;
  /** Per-provider default model returned by the server. */
  defaults: Record<AITestProvider, string>;
}

interface InspectAIKeysResponse {
  keys?: Array<{
    provider?: string;
    slot?: number;
    model?: string;
  }>;
  defaultModels?: Partial<Record<AITestProvider, string>>;
  slotModels?: Record<string, unknown>;
  modelCatalogRefreshedAt?: string | null;
}

/**
 * Detailed per-model entry returned by `inspect-ai-keys.modelOptionsDetailed`.
 * Mirrors `CuratedModel` in `supabase/functions/_shared/aiTestModelCatalog.ts`.
 * Only `id` is required — everything else is hint metadata that the UI
 * surfaces as a badge next to the model name in the dropdown.
 */
export interface AITestModelOption {
  id: string;
  tier?: 'free' | 'paid' | 'unknown';
  deprecated?: boolean;
  hint?: string;
}

function isProvider(value: unknown): value is AITestProvider {
  return value === 'openrouter' || value === 'groq' || value === 'deepseek' || value === 'nvidia';
}

function isSlot(value: unknown): value is AITestSlot {
  return value === 1 || value === 2 || value === 3;
}

/**
 * Fetch the per-slot active model map and the provider defaults from
 * `inspect-ai-keys`. Both Mission Control and the AI Routing panel read
 * from this so they cannot drift from what the AI Keys panel shows.
 *
 * The returned `slotModels` map already has the saved-or-default value
 * resolved server-side (the edge function falls back to
 * `AI_TEST_DEFAULT_MODELS` whenever the saved value is missing or no
 * longer in the allow-list). Callers normally don't need to do further
 * fallback themselves, but {@link getAITestSlotModel} layers the
 * provider default on as a final safety net for slots the server omits.
 */
export async function fetchAITestSlotModels(): Promise<AITestSlotMap> {
  const tuple = await appwriteFunctions.invoke('inspect-ai-keys', {
    headers: devKitAuthHeaders(),
  });
  const result = unwrapAdminResponse<InspectAIKeysResponse>(tuple, 'inspect-ai-keys');

  const slotModels: Record<string, string> = {};
  for (const k of result.keys ?? []) {
    if (!k) continue;
    const model = typeof k.model === 'string' ? k.model.trim() : '';
    if (!model) continue;
    if (!isProvider(k.provider) || !isSlot(k.slot)) continue;
    slotModels[aiTestSlotKey(k.provider, k.slot)] = model;
  }

  const defaults: Record<AITestProvider, string> = { ...FALLBACK_AI_TEST_DEFAULT_MODELS };
  if (result.defaultModels) {
    for (const provider of AI_TEST_PROVIDERS) {
      const v = result.defaultModels[provider];
      if (typeof v === 'string' && v.trim()) defaults[provider] = v.trim();
    }
  }

  // Raw saved-override map: keys present only when the admin explicitly
  // saved a model for that slot. Older deployments of inspect-ai-keys
  // don't return this field — in that case `savedOverrides` stays empty,
  // and `isAITestSlotUsingDefault` conservatively reports every slot as
  // "default" (rather than mislabelling resolved values as overrides).
  const savedOverrides: Record<string, string> = {};
  if (result.slotModels && typeof result.slotModels === 'object' && !Array.isArray(result.slotModels)) {
    for (const [k, v] of Object.entries(result.slotModels)) {
      if (typeof v === 'string' && v.trim()) savedOverrides[k] = v.trim();
    }
  }

  return { slotModels, savedOverrides, defaults };
}

/**
 * Resolve the active test model for a single slot. Returns the saved
 * value if present, otherwise the provider default from the same map.
 */
export function getAITestSlotModel(
  map: AITestSlotMap,
  provider: AITestProvider,
  slot: AITestSlot,
): string {
  return map.slotModels[aiTestSlotKey(provider, slot)] ?? map.defaults[provider];
}

/**
 * Returns true if the slot has no explicit override saved in
 * `app_settings.ai_test_slot_models` (i.e. it's falling back to the
 * provider default). Based on `savedOverrides`, not on a value
 * comparison, so a deliberate override that happens to equal the
 * provider default is still correctly classified as "custom".
 */
export function isAITestSlotUsingDefault(
  map: AITestSlotMap,
  provider: AITestProvider,
  slot: AITestSlot,
): boolean {
  return !(aiTestSlotKey(provider, slot) in map.savedOverrides);
}

export interface LiveProviderModels {
  openrouter: CuratedLLMModel[];
  groq: CuratedLLMModel[];
  nvidia: CuratedLLMModel[];
  deepseek: CuratedLLMModel[];
  cachedAt: string | null;
}

/**
 * Fetch the live model catalog from each AI provider via the admin-devkit-data
 * `list-provider-models` action. Results are cached server-side for 6 hours.
 * On any error the returned arrays are empty — callers should fall back to
 * {@link getCuratedModels} for that provider.
 */
export async function fetchLiveProviderModels(forceRefresh = false): Promise<LiveProviderModels> {
  const empty: LiveProviderModels = { openrouter: [], groq: [], nvidia: [], deepseek: [], cachedAt: null };
  try {
    const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
      headers: devKitAuthHeaders(),
      body: { action: 'list-provider-models', force_refresh: forceRefresh },
    });
    const result = unwrapAdminResponse<LiveProviderModels>(tuple, 'admin-devkit-data');
    return {
      openrouter: Array.isArray(result.openrouter) ? result.openrouter : [],
      groq:       Array.isArray(result.groq)       ? result.groq       : [],
      nvidia:     Array.isArray(result.nvidia)      ? result.nvidia     : [],
      deepseek:   Array.isArray(result.deepseek)    ? result.deepseek   : [],
      cachedAt:   typeof result.cachedAt === 'string' ? result.cachedAt : null,
    };
  } catch {
    return empty;
  }
}

/** Returns the live model list for a provider if non-empty, otherwise falls back to the curated static list.
 *
 * Strategy: curated safe models always come first and are never removed.
 * Live catalog models are appended after curated, deduped by value, and labeled "Live / unverified".
 * This ensures known-compatible models remain accessible even if the live catalog changes.
 */
export function resolveModelsForProvider(
  provider: AITestProvider,
  live: LiveProviderModels,
  currentValue?: string,
): CuratedLLMModel[] {
  // Always start from the curated safe list.
  const curated = [...getCuratedModels(provider)];
  const curatedIds = new Set(curated.map(m => m.value));

  // Append live catalog entries that are not already in the curated list.
  const rawList = live?.[provider];
  if (Array.isArray(rawList) && rawList.length > 0) {
    for (const item of rawList) {
      if (!item || typeof item !== 'object') continue;
      const value = typeof item.value === 'string' ? item.value.trim() : '';
      if (!value || curatedIds.has(value)) continue; // skip dupes of curated entries

      const rawLabel = typeof item.label === 'string' ? item.label.trim() : value;
      const tier = item.tier === 'free' ? 'free' : 'paid';
      const deprecated = Boolean(item.deprecated);

      curatedIds.add(value);
      curated.push({
        label: `${rawLabel} (Live / unverified)`,
        value,
        tier,
        deprecated,
        // knownCompatible intentionally absent — live-only models are not pre-verified
      });
    }
  }

  // Preserve the currently saved value even if it isn't in the curated or live list.
  if (currentValue && currentValue.trim()) {
    const val = currentValue.trim();
    const exists = curated.some(m => m.value === val);
    if (!exists) {
      curated.push({
        label: `${val} (Saved but unavailable)`,
        value: val,
        tier: 'paid',
        deprecated: true,
      });
    }
  }

  return curated;
}
