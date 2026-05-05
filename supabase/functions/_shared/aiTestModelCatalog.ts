/**
 * Pure curation logic for the DevKit AI-test "Send test request" model
 * dropdown allow-list.
 *
 * The functions in this file are deliberately side-effect-free so they can
 * be unit-tested without touching the network or `app_settings`. The
 * scheduled `refresh-ai-test-models` edge function handles I/O — fetching
 * each provider's `/models` endpoint, calling these curators on the raw
 * response, and persisting the merged result to
 * `app_settings.ai_test_model_allowlist`.
 *
 * RATIONALE
 * ─────────
 * Until now the allow-list was a hand-maintained constant in
 * `modelDefaults.ts`. Providers add and deprecate models continuously, so
 * the constant goes stale and admins eventually pick a slug that no longer
 * exists upstream — the smoke test then fails with an opaque 404. This
 * module rebuilds the curated list from each provider's authoritative
 * `/models` endpoint and flags any seed entries that have disappeared so
 * admins see a "Deprecated upstream" hint instead of a silent failure.
 */

export type AITestProvider = 'openrouter' | 'groq' | 'deepseek';

export interface CuratedModel {
  /** Model slug as it must be sent to the upstream API. */
  id: string;
  /** Pricing tier inferred from the upstream response. */
  tier?: 'free' | 'paid' | 'unknown';
  /** True if a previously-curated slug is no longer present upstream. */
  deprecated?: boolean;
  /** Short human-readable hint shown next to the slug in the dropdown. */
  hint?: string;
}

export interface CuratedProviderEntry {
  fetchedAt: string;
  fetchOk: boolean;
  fetchError?: string;
  models: CuratedModel[];
}

export interface CuratedAllowlist {
  lastRefreshedAt: string;
  providers: Record<AITestProvider, CuratedProviderEntry>;
}

/**
 * Per-provider cap on the number of models exposed in the DevKit dropdown.
 * OpenRouter exposes 200+ models (including 30+ free ones), so its cap is
 * raised to 50 so the free-model tier is meaningfully surfaced. Groq and
 * DeepSeek have small catalogs; their caps are kept at 15 each.
 */
export const PER_PROVIDER_CAP = 15; // legacy export — kept for backward compat

export const PER_PROVIDER_CAPS: Record<AITestProvider, number> = {
  openrouter: 50,
  groq: 15,
  deepseek: 15,
};

// ─────────────────────────────────────────────────────────────────────────────
// OpenRouter
// ─────────────────────────────────────────────────────────────────────────────

interface OpenRouterModelRaw {
  id?: unknown;
  pricing?: { prompt?: unknown; completion?: unknown } | null;
}

/**
 * Model families that are NOT text-chat completions on OpenRouter.
 * The DevKit test-request flow only sends chat completions, so audio,
 * image, OCR, embedding, and router-meta endpoints are excluded.
 */
const OPENROUTER_NON_CHAT_RE =
  /lyria|whisper|tts(?:\b|-)|embed|clip(?:\b|-)|ocr|rerank|guard|diffusion|openrouter\/(free|owl)/i;

/**
 * Curate the OpenRouter `/api/v1/models` payload.
 *
 * Heuristics:
 *   - Non-chat model families (audio, image, OCR, router meta) are skipped.
 *   - Models with the `:free` suffix or zero prompt+completion price are
 *     marked as `tier: 'free'` and given a "Free tier" hint.
 *   - Free models sort first (so the dropdown leads with the safer
 *     no-cost choices), then paid models alphabetically.
 *   - Capped at PER_PROVIDER_CAPS.openrouter (50).
 */
export function curateOpenRouter(payload: unknown): CuratedModel[] {
  const data = extractDataArray(payload);
  if (!data) return [];

  const cap = PER_PROVIDER_CAPS.openrouter;
  const candidates: Array<CuratedModel & { _sort: number }> = [];
  for (const raw of data as OpenRouterModelRaw[]) {
    const id = typeof raw?.id === 'string' ? raw.id.trim() : '';
    if (!id) continue;
    if (OPENROUTER_NON_CHAT_RE.test(id)) continue;
    const promptPrice = Number(raw?.pricing?.prompt ?? '0');
    const completionPrice = Number(raw?.pricing?.completion ?? '0');
    const isFreeBySuffix = id.endsWith(':free');
    const isFreeByPrice = Number.isFinite(promptPrice) && promptPrice === 0
                       && Number.isFinite(completionPrice) && completionPrice === 0;
    const tier: CuratedModel['tier'] = isFreeBySuffix || isFreeByPrice ? 'free' : 'paid';
    const sortRank = isFreeBySuffix ? 0 : (tier === 'free' ? 1 : 2);
    candidates.push({
      id,
      tier,
      hint: tier === 'free' ? 'Free tier' : undefined,
      _sort: sortRank,
    });
  }
  candidates.sort((a, b) => a._sort - b._sort || a.id.localeCompare(b.id));
  return candidates.slice(0, cap).map(({ _sort: _, ...m }) => m);
}

// ─────────────────────────────────────────────────────────────────────────────
// Groq
// ─────────────────────────────────────────────────────────────────────────────

interface GroqModelRaw {
  id?: unknown;
  active?: unknown;
}

/**
 * Curate the Groq `/openai/v1/models` payload.
 *
 * Heuristics:
 *   - Skip non-chat model families (whisper, TTS, guard, vision, llava) — the
 *     "Send test request" flow only ever issues a text chat completion.
 *   - Inactive models (`active: false`) are kept but flagged
 *     `deprecated: true` so the admin can see why their saved choice is
 *     misbehaving without removing it from the dropdown entirely.
 *   - Capped at PER_PROVIDER_CAPS.groq (15).
 */
export function curateGroq(payload: unknown): CuratedModel[] {
  const data = extractDataArray(payload);
  if (!data) return [];

  const cap = PER_PROVIDER_CAPS.groq;
  const out: CuratedModel[] = [];
  for (const raw of data as GroqModelRaw[]) {
    const id = typeof raw?.id === 'string' ? raw.id.trim() : '';
    if (!id) continue;
    if (/whisper|tts|guard|vision|llava/i.test(id)) continue;
    const active = raw?.active !== false;
    out.push({
      id,
      tier: 'free',
      hint: active ? 'Free tier' : 'Inactive upstream',
      deprecated: !active,
    });
  }
  out.sort((a, b) => a.id.localeCompare(b.id));
  return out.slice(0, cap);
}

// ─────────────────────────────────────────────────────────────────────────────
// DeepSeek
// ─────────────────────────────────────────────────────────────────────────────

interface DeepSeekModelRaw {
  id?: unknown;
}

/**
 * Curate the DeepSeek `/v1/models` payload.
 *
 * DeepSeek returns minimal metadata (just `id` + `owned_by`), so every
 * model is marked `tier: 'paid'` (DeepSeek bills per token) with no extra
 * hint. Capped at PER_PROVIDER_CAPS.deepseek (15), though DeepSeek
 * usually only exposes 2-3 chat models at a time.
 */
export function curateDeepSeek(payload: unknown): CuratedModel[] {
  const data = extractDataArray(payload);
  if (!data) return [];

  const cap = PER_PROVIDER_CAPS.deepseek;
  const out: CuratedModel[] = [];
  for (const raw of data as DeepSeekModelRaw[]) {
    const id = typeof raw?.id === 'string' ? raw.id.trim() : '';
    if (!id) continue;
    out.push({ id, tier: 'paid' });
  }
  out.sort((a, b) => a.id.localeCompare(b.id));
  return out.slice(0, cap);
}

// ─────────────────────────────────────────────────────────────────────────────
// Merge with seed
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Merge a fresh curated list with the hardcoded seed list, flagging any
 * seed entries that disappeared upstream as `deprecated: true` so admins
 * still see them in the dropdown (with a warning) and can migrate off.
 *
 * The merge is order-preserving: fresh entries come first (in the order
 * the curator returned them), then any seed entries that did not appear
 * in the fresh fetch are appended at the end.
 *
 * If `fresh` is empty (e.g. the upstream fetch failed), every seed entry
 * is returned without the deprecated flag — we cannot prove a model is
 * deprecated when we never got a response, and silently telling admins
 * their entire list is broken would be more confusing than helpful.
 */
export function mergeWithSeed(
  fresh: CuratedModel[],
  seed: readonly string[],
): CuratedModel[] {
  if (fresh.length === 0) {
    return seed.map(id => ({ id }));
  }
  const freshIds = new Set(fresh.map(m => m.id));
  const out = [...fresh];
  for (const id of seed) {
    if (!freshIds.has(id)) {
      out.push({ id, deprecated: true, hint: 'Deprecated upstream' });
    }
  }
  return out;
}

/**
 * Flatten a CuratedModel[] to a string[] for backward-compatible
 * validation paths that only care about the slug.
 */
export function toIdList(models: CuratedModel[]): string[] {
  return models.map(m => m.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function extractDataArray(payload: unknown): unknown[] | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = (payload as { data?: unknown }).data;
  return Array.isArray(data) ? data : null;
}
