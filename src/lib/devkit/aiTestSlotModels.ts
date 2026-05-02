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
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { devKitAuthHeaders } from './devKitAuth';
import { unwrapAdminResponse } from './edgeResponse';

export type AITestProvider = 'openrouter' | 'groq' | 'deepseek';
export type AITestSlot = 1 | 2 | 3;

export const AI_TEST_PROVIDERS: readonly AITestProvider[] = ['openrouter', 'groq', 'deepseek'] as const;
export const AI_TEST_SLOTS: readonly AITestSlot[] = [1, 2, 3] as const;

/**
 * Last-resort fallbacks if `inspect-ai-keys` doesn't return a defaults map.
 * Mirrors `AI_TEST_DEFAULT_MODELS` in
 * `supabase/functions/_shared/modelDefaults.ts`. The server response is
 * authoritative; this exists only so the UI never renders blanks if the
 * function is briefly unavailable.
 */
export const FALLBACK_AI_TEST_DEFAULT_MODELS: Record<AITestProvider, string> = {
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  groq: 'llama-3.3-70b-versatile',
  deepseek: 'deepseek-v4-flash',
};

export function aiTestSlotKey(provider: AITestProvider, slot: AITestSlot): string {
  return `${provider}:${slot}`;
}

export function providerDisplayName(provider: AITestProvider): string {
  if (provider === 'openrouter') return 'OpenRouter';
  if (provider === 'groq') return 'Groq';
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
  return value === 'openrouter' || value === 'groq' || value === 'deepseek';
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
  const tuple = await edgeFunctions.functions.invoke('inspect-ai-keys', {
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
