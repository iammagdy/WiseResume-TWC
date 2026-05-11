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

/**
 * A curated LLM model entry for use in DevKit dropdowns.
 * `tier` indicates whether the model costs API credits ('paid') or has
 * a free-to-use tier ('free'). `deprecated` models are shown with a
 * strike-through label and should not be used for new configurations.
 */
export interface CuratedLLMModel {
  label: string;
  value: string;
  tier: 'free' | 'paid';
  deprecated?: boolean;
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
  { label: 'DeepSeek V4 Flash',                 value: 'deepseek-v4-flash',                  tier: 'paid' },
  { label: 'DeepSeek V4 Pro',                   value: 'deepseek-v4-pro',                    tier: 'paid' },
  { label: 'DeepSeek Chat (V3 alias)',           value: 'deepseek-chat',                      tier: 'paid', deprecated: true },
  { label: 'DeepSeek Reasoner (R1 alias)',       value: 'deepseek-reasoner',                  tier: 'paid', deprecated: true },
];

/**
 * NVIDIA NIM LLM models available in the DevKit model selector. All NIM models are paid.
 *
 * Last verified: 2026-05-11
 * Source: https://integrate.api.nvidia.com/v1/models
 */
export const NVIDIA_LLM_MODELS: ReadonlyArray<CuratedLLMModel> = [
  { label: 'Llama 4 Maverick 17B',              value: 'meta/llama-4-maverick-17b-128e-instruct',      tier: 'paid' },
  { label: 'Llama 4 Scout 17B',                 value: 'meta/llama-4-scout-17b-16e-instruct',          tier: 'paid' },
  { label: 'Nemotron Ultra 253B',               value: 'nvidia/llama-3.1-nemotron-ultra-253b-v1',      tier: 'paid' },
  { label: 'Mistral Medium 3 Instruct',         value: 'mistral-medium-3-instruct',                    tier: 'paid' },
  { label: 'Mistral Large 3 675B Instruct',     value: 'mistral-large-3-675b-instruct-2512',           tier: 'paid' },
  { label: 'Mistral Nemotron',                  value: 'mistral-nemotron',                             tier: 'paid' },
  { label: 'Gemma 3n E4B IT',                   value: 'gemma-3n-e4b-it',                             tier: 'paid' },
  { label: 'Gemma 3n E2B IT',                   value: 'gemma-3n-e2b-it',                             tier: 'paid' },
];

/**
 * OpenRouter LLM models available in the DevKit model selector.
 * Models whose ID contains `:free` are zero-cost on OpenRouter's free tier.
 * All others are billed per token.
 *
 * Last verified: 2026-05-11
 * Source: https://openrouter.ai/models · https://openrouter.ai/collections/free-models
 */
export const OPENROUTER_LLM_MODELS: ReadonlyArray<CuratedLLMModel> = [
  { label: 'Meta LLaMA 4 Maverick',               value: 'meta-llama/llama-4-maverick:free',             tier: 'free' },
  { label: 'Meta LLaMA 4 Scout',                  value: 'meta-llama/llama-4-scout:free',                tier: 'free' },
  { label: 'Meta LLaMA 3.3 70B Instruct',         value: 'meta-llama/llama-3.3-70b-instruct:free',       tier: 'free' },
  { label: 'Meta LLaMA 3.1 8B Instruct',          value: 'meta-llama/llama-3.1-8b-instruct:free',        tier: 'free' },
  { label: 'Qwen3 235B A22B',                     value: 'qwen/qwen3-235b-a22b:free',                    tier: 'free' },
  { label: 'Qwen QwQ 32B',                        value: 'qwen/qwq-32b:free',                            tier: 'free' },
  { label: 'Google Gemini 2.0 Flash Exp',         value: 'google/gemini-2.0-flash-exp:free',             tier: 'free' },
  { label: 'Google Gemma 3 27B IT',               value: 'google/gemma-3-27b-it:free',                   tier: 'free' },
  { label: 'DeepSeek R1',                         value: 'deepseek/deepseek-r1:free',                    tier: 'free' },
  { label: 'DeepSeek V3',                         value: 'deepseek/deepseek-chat:free',                  tier: 'free' },
  { label: 'Mistral 7B Instruct',                 value: 'mistralai/mistral-7b-instruct:free',           tier: 'free',  deprecated: true },
  { label: 'Anthropic Claude Opus 4',             value: 'anthropic/claude-opus-4',                      tier: 'paid' },
  { label: 'Anthropic Claude 3.5 Sonnet',         value: 'anthropic/claude-3.5-sonnet',                  tier: 'paid' },
  { label: 'Anthropic Claude 3.5 Haiku',          value: 'anthropic/claude-3.5-haiku',                   tier: 'paid' },
  { label: 'Meta LLaMA 3.3 70B Instruct',         value: 'meta-llama/llama-3.3-70b-instruct',            tier: 'paid' },
  { label: 'Meta LLaMA 3.1 70B Instruct',         value: 'meta-llama/llama-3.1-70b-instruct',            tier: 'paid', deprecated: true },
  { label: 'OpenAI GPT-4o Mini',                  value: 'openai/gpt-4o-mini',                           tier: 'paid' },
  { label: 'OpenAI GPT-4o',                       value: 'openai/gpt-4o',                                tier: 'paid' },
  { label: 'Google Gemini 2.0 Flash',             value: 'google/gemini-2.0-flash-001',                  tier: 'paid' },
];

/**
 * Groq LLM models available in the DevKit model selector.
 * Groq requires an API key for all models; all are marked 'paid' even though
 * Groq offers a generous free-tier rate limit — the key distinction is that
 * they are not zero-cost like OpenRouter's `:free` models.
 *
 * Last verified: 2026-05-11
 * Source: https://console.groq.com/docs/models · https://console.groq.com/docs/deprecations
 */
export const GROQ_LLM_MODELS: ReadonlyArray<CuratedLLMModel> = [
  { label: 'LLaMA 4 Maverick 17B',               value: 'meta-llama/llama-4-maverick-17b-128e-instruct', tier: 'paid' },
  { label: 'LLaMA 4 Scout 17B',                  value: 'meta-llama/llama-4-scout-17b-16e-instruct',    tier: 'paid' },
  { label: 'LLaMA 3.3 70B Versatile',            value: 'llama-3.3-70b-versatile',                      tier: 'paid' },
  { label: 'LLaMA 3.1 8B Instant',               value: 'llama-3.1-8b-instant',                         tier: 'paid' },
  { label: 'Qwen QwQ 32B',                       value: 'qwen-qwq-32b',                                 tier: 'paid' },
  { label: 'Qwen3 32B',                          value: 'qwen/qwen3-32b',                               tier: 'paid' },
  { label: 'Gemma 2 9B IT',                      value: 'gemma2-9b-it',                                 tier: 'paid' },
  { label: 'DeepSeek R1 Distill LLaMA 70B',      value: 'deepseek-r1-distill-llama-70b',                tier: 'paid', deprecated: true },
  { label: 'LLaMA 3.2 90B Vision Preview',       value: 'llama-3.2-90b-vision-preview',                 tier: 'paid', deprecated: true },
  { label: 'LLaMA 3.1 70B Versatile',            value: 'llama-3.1-70b-versatile',                      tier: 'paid', deprecated: true },
  { label: 'Mixtral 8×7B 32K',                   value: 'mixtral-8x7b-32768',                           tier: 'paid', deprecated: true },
];

/** Providers that use a curated dropdown (rather than a free-text input) in the DevKit AI Keys panel. */
export const DROPDOWN_PROVIDERS = new Set<AITestProvider>(['nvidia', 'openrouter', 'groq']);

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
  deepseek: 'deepseek-v4-flash',
  nvidia: 'mistral-medium-3-instruct',
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
