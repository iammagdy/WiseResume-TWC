/**
 * Shared AI Client for Edge Functions
 * WiseResume AI: OpenRouter (Gemma 4, free) + Groq (Llama 3.3, free) with auto-fallback.
 * Also supports user BYOK keys: Gemini, Ollama, OpenRouter.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getServiceClient } from './dbClient.ts';
import { validateBaseUrl, assertSameSafeIps, pinnedFetch } from './urlSafety.ts';
import { scrubSecrets, scrubAndCap } from './scrubSecrets.ts';
import { recordFailOpen } from './opsHealth.ts';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface AICallOptions {
  model: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: AITool[];
  toolChoice?: { type: 'function'; function: { name: string } } | 'auto';
  /** @deprecated Pass userId instead; key is fetched from DB */
  userGeminiKey?: string;
  /** User ID to look up their Gemini key from the database */
  userId?: string;
  /** Override default timeout in ms */
  timeout?: number;
  /** Preferred AI provider — if omitted, read from user_preferences table */
  preferredProvider?: string;
  /**
   * WiseResume AI sub-provider:
   *   - 'openrouter'  → primary OpenRouter managed key (free models, ranked)
   *   - 'openrouter2' → secondary OpenRouter managed key, pinned to OPENROUTER2_DEFAULT_MODEL
   *   - 'groq'        → Groq managed key (ranked models)
   *   - 'auto'        → openrouter → openrouter2 → groq (whichever is configured/healthy)
   */
  wiseresumeSubProvider?: 'openrouter' | 'groq' | 'auto' | 'openrouter2';
  /**
   * Task #24: per-request override of the curated OpenRouter slug to use in
   * the WiseResume managed openrouter sub-engine. When provided, the managed
   * loop pins to this single slug instead of the default ranked chain.
   * Must be a member of OPENROUTER_CURATED_MODELS (validated below).
   */
  openrouterCuratedModel?: string;
  /**
   * Task #24: per-request override that, when true, forces the managed
   * openrouter sub-engine to iterate the FULL curated chain (8 slugs)
   * instead of the default 2-model cap, advancing on any skippable error
   * (rate-limit/5xx/404/timeout). Mutually exclusive with
   * openrouterCuratedModel — Auto wins if both are set.
   */
  openrouterAutoFallback?: boolean;
}

export interface AIResponse {
  content: string | null;
  toolCalls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
  /** True if the user's BYOK key failed and the request fell back to the default gateway */
  fallbackUsed?: boolean;
  /** Reason for fallback (e.g. 'quota_exceeded', 'rate_limit', 'invalid_key') */
  fallbackReason?: string;
  /** Which provider actually handled this request */
  providerUsed?: string;
}

export interface AIError {
  type:
    | 'rate_limit'
    | 'provider_busy'
    | 'payment_required'
    | 'invalid_key'
    | 'quota_exceeded'
    // upstream_5xx: managed/BYOK provider returned a 5xx (or transport
    // failure). Surfaced to the client as a distinct toast so the user
    // knows it's an upstream glitch, not their key being wrong, and so
    // the cross-instance breaker can count these without conflating
    // them with auth/payment errors that the user must self-fix.
    | 'upstream_5xx'
    | 'network'
    | 'unknown';
  message: string;
  status: number;
}

// Model mapping for direct Gemini calls
const MODEL_MAPPING: Record<string, string> = {
  'google/gemini-2.5-flash': 'gemini-2.5-flash',
  'google/gemini-2.5-pro': 'gemini-2.5-pro',
  'google/gemini-2.5-flash-lite': 'gemini-2.5-flash-lite',
  'google/gemini-2.0-flash': 'gemini-2.5-flash',
  'google/gemini-2.0-flash-lite': 'gemini-2.5-flash-lite',
  'google/gemini-2.0-pro': 'gemini-2.5-pro',
  'google/gemini-1.5-flash': 'gemini-2.5-flash',
  'google/gemini-1.5-pro': 'gemini-2.5-pro',
};

function mapModelForGemini(model: string): string {
  if (MODEL_MAPPING[model]) {
    const mapped = MODEL_MAPPING[model];
    console.warn(`[AI] mapModelForGemini: deprecated model slug "${model}" substituted with "${mapped}"`);
    return mapped;
  }
  if (model.startsWith('google/')) {
    const stripped = model.replace('google/', '');
    if (MODEL_MAPPING[stripped]) {
      const mapped = MODEL_MAPPING[stripped];
      console.warn(`[AI] mapModelForGemini: deprecated model slug "${stripped}" substituted with "${mapped}"`);
      return mapped;
    }
    return stripped;
  }
  return model;
}

// --- Server-side key retrieval ---

const ENCRYPTION_SECRET = Deno.env.get('API_KEY_ENCRYPTION_SECRET');

/**
 * Derives an AES-GCM-256 decryption key using PBKDF2 with the given salt string.
 * v1 keys use the static salt 'user-api-keys-salt'.
 * v2 keys use per-user salt 'user-api-keys-salt-v2-{userId}'.
 */
async function deriveDecryptionKey(salt: string): Promise<CryptoKey> {
  if (!ENCRYPTION_SECRET) throw new Error('API_KEY_ENCRYPTION_SECRET env var is required');
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_SECRET),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
}

/**
 * Decrypts an encrypted key using the v2 per-user PBKDF2 salt.
 *
 * AI-2: The v1 static-salt fallback was removed once the migration job
 * finished re-encrypting every legacy row under the per-user salt and
 * the `user_api_keys_key_version_v2_only` CHECK constraint was applied
 * (migration `20260507000011`). A future v3 (master-secret rotation)
 * must add its own decrypt path here in lockstep with a new migration
 * job — see `docs/ops/api-key-encryption-rotation.md`.
 */
async function decryptKeyWithSalt(encoded: string, salt: string): Promise<string> {
  const key = await deriveDecryptionKey(salt);
  const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

/**
 * AI-2: thrown when a `user_api_keys` row is found at a non-v2
 * `key_version`. Callers (every BYOK lookup site) propagate this so the
 * user sees a clear "please re-enter your key in AI Settings" surface
 * error instead of silently falling back to managed keys (which would
 * hide the fact that their saved key is in an unreadable format).
 */
export class LegacyKeyVersionError extends Error {
  readonly provider: string;
  readonly keyVersion: number | null;
  constructor(provider: string, keyVersion: number | null) {
    super(
      `BYOK ${provider} key is stored under a deprecated encryption version (v${keyVersion ?? '?'}). Please re-enter your key in AI Settings.`,
    );
    this.name = 'LegacyKeyVersionError';
    this.provider = provider;
    this.keyVersion = keyVersion;
  }
}

const V2_SALT_PREFIX = 'user-api-keys-salt-v2-';

/**
 * Fetches a user's API key from the database (decrypted).
 *
 * AI-2: Only `key_version = 2` (per-user salt) is accepted. A row with
 * any other version throws `LegacyKeyVersionError` rather than silently
 * decrypting under the legacy static salt — that fallback existed before
 * the v1 → v2 backfill and would let a service-role caller flipping
 * `key_version` force a static-salt decrypt. Uses the service role key
 * to bypass RLS.
 */
export async function getUserKeyFromDB(userId: string, provider = 'gemini'): Promise<string | undefined> {
  if (!ENCRYPTION_SECRET) {
    console.warn('[aiClient] API_KEY_ENCRYPTION_SECRET not set — cannot decrypt user BYOK keys. Falling back to global key.');
    return undefined;
  }

  let row: { encrypted_key: string; key_version: number | null } | null = null;
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('user_api_keys')
      .select('encrypted_key, key_version')
      .eq('user_id', userId)
      .eq('provider', provider)
      .maybeSingle();

    if (error || !data?.encrypted_key) return undefined;
    row = data as { encrypted_key: string; key_version: number | null };
  } catch (err) {
    console.warn('[aiClient] Failed to fetch user key from DB:', err);
    return undefined;
  }

  if (row.key_version !== 2) {
    console.warn('[aiClient] Refusing to decrypt non-v2 BYOK key', { userId, provider, keyVersion: row.key_version });
    throw new LegacyKeyVersionError(provider, row.key_version);
  }
  return await decryptKeyWithSalt(row.encrypted_key, `${V2_SALT_PREFIX}${userId}`);
}

/**
 * Fetches a user's API key + base_url from the database (decrypted).
 *
 * AI-2: same v2-only enforcement as `getUserKeyFromDB`.
 */
export async function getUserKeyAndUrlFromDB(userId: string, provider: string): Promise<{ key: string; baseUrl: string | null; model: string | null } | undefined> {
  if (!ENCRYPTION_SECRET) return undefined;

  let row:
    | { encrypted_key: string; base_url: string | null; model: string | null; key_version: number | null }
    | null = null;
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('user_api_keys')
      .select('encrypted_key, base_url, model, key_version')
      .eq('user_id', userId)
      .eq('provider', provider)
      .maybeSingle();

    if (error || !data?.encrypted_key) return undefined;
    row = data as typeof row;
  } catch (err) {
    console.warn('[aiClient] Failed to fetch user key from DB:', err);
    return undefined;
  }

  if (row!.key_version !== 2) {
    console.warn('[aiClient] Refusing to decrypt non-v2 BYOK key', { userId, provider, keyVersion: row!.key_version });
    throw new LegacyKeyVersionError(provider, row!.key_version);
  }
  const key = await decryptKeyWithSalt(row!.encrypted_key, `${V2_SALT_PREFIX}${userId}`);
  return { key, baseUrl: row!.base_url ?? null, model: row!.model ?? null };
}

/**
 * Reads the user's preferred AI provider from user_preferences table.
 * Returns 'gemini', 'ollama', 'wiseresume', or null if not set.
 */
async function getUserPreferredProvider(userId: string): Promise<string | null> {
  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('user_preferences')
      .select('ai_provider')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data?.ai_provider) return null;
    return data.ai_provider;
  } catch (err) {
    console.warn('[aiClient] Failed to fetch user AI provider preference:', err);
    return null;
  }
}

// ============= Postgres-backed Circuit Breaker (Phase 4) =============
//
// Each managed provider step (wiseresume/openrouter, wiseresume/groq, the
// global GEMINI_API_KEY fallback, etc.) is gated by a shared circuit breaker
// stored in the `ai_provider_breaker` table. When a provider records
// BREAKER_THRESHOLD failures inside BREAKER_WINDOW_SECONDS the breaker opens
// for BREAKER_COOLDOWN_SECONDS, and every edge function instance — even cold-
// started ones — sees the open state via the shared row. This stops the
// stampede of retries against an upstream that is provably down.
//
// BYOK provider branches deliberately do NOT participate in the breaker:
// those use per-user keys and a global breaker would mistakenly suppress
// one user's healthy key because of another user's broken key.

const BREAKER_THRESHOLD = parseInt(Deno.env.get('AI_BREAKER_THRESHOLD') ?? '5', 10);
const BREAKER_WINDOW_SECONDS = parseInt(Deno.env.get('AI_BREAKER_WINDOW_SECONDS') ?? '60', 10);
const BREAKER_COOLDOWN_SECONDS = parseInt(Deno.env.get('AI_BREAKER_COOLDOWN_SECONDS') ?? '60', 10);
// Half-open probe TTL: how long a single probing request "holds" the lock
// before it auto-releases. Should be >= the per-attempt timeout so a slow
// probe doesn't get its lock yanked while still in flight.
const BREAKER_PROBE_TTL_SECONDS = parseInt(Deno.env.get('AI_BREAKER_PROBE_TTL_SECONDS') ?? '30', 10);

interface BreakerState {
  provider: string;
  failure_count: number;
  window_started_at: string;
  opened_until: string | null;
  is_open: boolean;
}

/**
 * Returns true if the breaker for `provider` is currently open AND this
 * caller is not allowed through. Implements true half-open semantics via
 * `try_acquire_breaker_pass`: when the cooldown elapses, exactly ONE
 * caller per provider per probe-TTL window is granted a probe slot and
 * sees `false` (allow); every concurrent caller sees `true` (deny) until
 * that probe reports its outcome.
 *
 * Best-effort: any RPC error fails OPEN (returns false / lets traffic
 * through) so a misbehaving breaker table cannot itself cause an outage.
 */
export async function isBreakerOpen(provider: string): Promise<boolean> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.rpc('try_acquire_breaker_pass', {
      p_provider:          provider,
      p_probe_ttl_seconds: BREAKER_PROBE_TTL_SECONDS,
    });
    if (error) {
      // AI-5: emit a structured fail-open signal so on-call can alert when
      // the breaker silently degrades to permissive mode.
      console.warn(`[AI breaker] try_acquire_breaker_pass failed for ${provider} — treating as closed:`, error.message);
      recordFailOpen('breaker_read_fail_open', { feature: provider, reason: scrubAndCap(error.message) });
      return false;
    }
    // 'closed' and 'half_open' both ALLOW. 'open' and 'locked_probe' DENY.
    const status = typeof data === 'string' ? data : String(data ?? 'closed');
    if (status === 'half_open') {
      console.log(`[AI breaker] half-open probe acquired for ${provider}`);
    }
    return status === 'open' || status === 'locked_probe';
  } catch (err) {
    console.warn(`[AI breaker] read failed for ${provider} — treating as closed:`, err instanceof Error ? err.message : err);
    recordFailOpen('breaker_read_fail_open', { feature: provider, reason: scrubAndCap(err instanceof Error ? err.message : String(err)) });
    return false;
  }
}

/**
 * Atomically records ONE outcome (success or failure) for a provider.
 * Returns the post-update breaker state. Best-effort: errors are logged
 * and swallowed so breaker accounting never fails an in-flight AI call.
 */
export async function recordBreakerEvent(provider: string, success: boolean): Promise<BreakerState | null> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.rpc('record_ai_breaker_event', {
      p_provider:         provider,
      p_success:          success,
      p_threshold:        BREAKER_THRESHOLD,
      p_window_seconds:   BREAKER_WINDOW_SECONDS,
      p_cooldown_seconds: BREAKER_COOLDOWN_SECONDS,
    });
    if (error) {
      console.warn(`[AI breaker] record_ai_breaker_event failed for ${provider}:`, error.message);
      return null;
    }
    return data as BreakerState;
  } catch (err) {
    console.warn(`[AI breaker] recordBreakerEvent threw for ${provider}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Returns true for errors that justify counting against the breaker.
 * Auth/payment errors are user-fixable and should NOT trip the breaker —
 * they would never be cured by waiting through a cool-down.
 */
function shouldCountAsBreakerFailure(err: unknown): boolean {
  if (isAIError(err)) {
    if (err.type === 'invalid_key' || err.type === 'payment_required') return false;
    return true;
  }
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  return true;
}

/**
 * Reads the global WiseResume AI engine setting from app_settings table.
 * Returns 'openrouter', 'groq', 'auto', or 'auto' as default.
 * Admin-controlled; users cannot override this.
 */
async function getGlobalAIEngine(): Promise<'openrouter' | 'groq' | 'auto' | 'openrouter2'> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'wiseresume_ai_engine')
      .maybeSingle();
    if (error || !data?.value) return 'auto';
    const val = data.value as string;
    if (val === 'openrouter' || val === 'groq' || val === 'auto' || val === 'openrouter2') return val;
    return 'auto';
  } catch (err) {
    console.warn('[aiClient] Failed to fetch global AI engine setting:', err);
    return 'auto';
  }
}

/**
 * Task #24: read the admin-controlled curated OpenRouter model + Auto
 * fallback flag from app_settings. Mirrors getGlobalAIEngine() — same
 * service-role client, same swallow-errors-and-fall-back pattern. Cached
 * per-process for the cold-start lifetime so it doesn't add a DB round-trip
 * to every AI call.
 */
let _curatedModelCache: { model: string; auto: boolean; ts: number } | null = null;
// Short TTL: admin model/Auto changes need to propagate to managed traffic
// "live" (no reload). 3s keeps the round-trip cost ~negligible while making
// the eventual-consistency window small enough to feel immediate.
const _CURATED_CACHE_TTL_MS = 3_000;
/** Drop the in-process cache so the next call hits the DB. Called from the
 *  admin write path (admin-update-settings) so a fresh model/Auto choice is
 *  visible to subsequent AI calls without waiting for the TTL. */
export function invalidateOpenRouterAdminCache(): void {
  _curatedModelCache = null;
}
async function getOpenRouterAdminSettings(opts?: { bypassCache?: boolean }): Promise<{ model: string; auto: boolean }> {
  const now = Date.now();
  if (!opts?.bypassCache && _curatedModelCache && now - _curatedModelCache.ts < _CURATED_CACHE_TTL_MS) {
    return { model: _curatedModelCache.model, auto: _curatedModelCache.auto };
  }
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['openrouter_curated_model', 'openrouter_auto_fallback']);
    if (error) throw error;
    let model = OPENROUTER_CURATED_MODELS[0];
    let auto = false;
    for (const row of data ?? []) {
      if (row.key === 'openrouter_curated_model' && typeof row.value === 'string' && isAllowedOpenRouterModel(row.value)) {
        model = row.value;
      } else if (row.key === 'openrouter_auto_fallback') {
        auto = row.value === true || row.value === 'true';
      }
    }
    _curatedModelCache = { model, auto, ts: now };
    return { model, auto };
  } catch (err) {
    // AI-5: stale-cache prefer. If we ever read this admin setting
    // successfully since cold-start, the cached value reflects the
    // operator's deliberate choice — silently downgrading to the
    // hardcoded default on a transient DB hiccup would override that
    // choice for every managed AI request until the DB recovered.
    // Only fall back to the curated default when there is genuinely
    // nothing cached (cold start).
    console.warn('[aiClient] Failed to fetch OpenRouter admin settings:', err);
    recordFailOpen('admin_settings_db_error', {
      feature: 'openrouter_curated_model',
      reason: scrubAndCap(err instanceof Error ? err.message : String(err)),
    });
    if (_curatedModelCache) {
      return { model: _curatedModelCache.model, auto: _curatedModelCache.auto };
    }
    return { model: OPENROUTER_CURATED_MODELS[0], auto: false };
  }
}

/**
 * Internal context shared between callAI and the underlying provider paths.
 *
 * Currently used by `parseAIJSONWithRetry` so that the parse-corrective
 * second AI call (issued when the model returns malformed JSON) does NOT
 * pay a separate breaker decision and does NOT record a separate failure
 * event. The owning user-visible action must spend at most ONE breaker
 * acquire and produce at most ONE combined breaker outcome event for the
 * pair of attempts. See AI-3 task and `parseAIJSONWithRetry` below.
 *
 * REFACTOR SHAPE PICKED (AI-3 step 1): option (b) — a non-exported
 * internal entry point (`callAIInternal`) that takes a retry context.
 * Option (a) would have required moving JSON-parse-aware retry into
 * `callAI`, but `callAI` is provider-agnostic and knows nothing about
 * downstream JSON shape. Option (b) keeps the parse-retry logic in
 * `parseAIJSONWithRetry` while letting the second underlying AI call
 * piggy-back on the parent's breaker bookkeeping.
 */
interface InternalCallContext {
  /**
   * When true, every provider path inside callAIInternal skips both
   * `isBreakerOpen()` and `recordBreakerEvent()`. The parent call (the
   * first AI attempt of the user-visible action) already paid those
   * costs; the parse-retry must not double-count.
   */
  suppressBreakerAccounting?: boolean;
}

/**
 * Calls AI API routing through WiseResume AI (OpenRouter/Groq) or user BYOK keys.
 * Priority: BYOK OpenRouter → BYOK Ollama → BYOK Gemini → WiseResume AI (managed) → legacy GEMINI_API_KEY
 */
export async function callAI(options: AICallOptions): Promise<AIResponse> {
  return callAIInternal(options, {});
}

async function callAIInternal(options: AICallOptions, ctx: InternalCallContext): Promise<AIResponse> {
  const { model, messages, temperature = 0.7, maxTokens, tools, toolChoice, userId, timeout = 30_000 } = options;

  const openrouterManagedKey = Deno.env.get('OPENROUTER_API_KEY');
  const openrouter2ManagedKey = Deno.env.get('OPENROUTER2_API_KEY');
  const groqManagedKey = Deno.env.get('GROQ_API_KEY');
  const globalGeminiKey = Deno.env.get('GEMINI_API_KEY');
  // Any managed key counts — including OPENROUTER2_API_KEY (Task #13). Without
  // this, an environment configured with only the secondary OpenRouter
  // account would fail the early guard with "WiseResume AI is not configured"
  // before callWiseresumeAI('openrouter2', ...) ever ran.
  const hasManagedAI = !!(openrouterManagedKey || openrouter2ManagedKey || groqManagedKey);

  let userGeminiData: { key: string; model: string | null } | undefined;
  let userOllamaData: { key: string; baseUrl: string | null; model: string | null } | undefined;
  let userOpenRouterData: { key: string; baseUrl: string | null; model: string | null } | undefined;
  let userByokData: { key: string; model: string | null; provider: string } | undefined;
  let wiseresumeSubProvider: 'openrouter' | 'groq' | 'auto' | 'openrouter2' = options.wiseresumeSubProvider || 'auto';

  if (userId) {
    const preferredProvider = options.preferredProvider || await getUserPreferredProvider(userId);

    if (preferredProvider === 'ollama') {
      // BYOK strict mode: if the key cannot be loaded, fail-closed rather than
      // silently falling back to platform keys and spending platform resources.
      userOllamaData = await getUserKeyAndUrlFromDB(userId, 'ollama');
      if (!userOllamaData) {
        throw createAIError('invalid_key', 'Your Ollama API key could not be loaded. Please re-add it in AI Settings → Ollama.', 402);
      }
    } else if (preferredProvider === 'openrouter') {
      userOpenRouterData = await getUserKeyAndUrlFromDB(userId, 'openrouter');
      if (!userOpenRouterData) {
        throw createAIError('invalid_key', 'Your OpenRouter API key could not be loaded. Please re-add it in AI Settings.', 402);
      }
    } else if (preferredProvider === 'gemini') {
      const geminiData = await getUserKeyAndUrlFromDB(userId, 'gemini');
      if (!geminiData) {
        throw createAIError('invalid_key', 'Your Gemini API key could not be loaded. Please re-add it in AI Settings → Gemini.', 402);
      }
      userGeminiData = { key: geminiData.key, model: geminiData.model };
    } else if (preferredProvider && (OPENAI_COMPAT_BASE_URLS[preferredProvider] || preferredProvider === 'anthropic')) {
      // New BYOK providers: OpenAI, Anthropic, Groq (BYOK), Mistral, xAI, Cohere
      const data = await getUserKeyAndUrlFromDB(userId, preferredProvider);
      if (!data) {
        throw createAIError('invalid_key', `Your ${preferredProvider} API key could not be loaded. Please re-add it in AI Settings.`, 402);
      }
      userByokData = { key: data.key, model: data.model, provider: preferredProvider };
    } else {
      // 'wiseresume' or no preference — read global engine setting if not already supplied
      if (!options.wiseresumeSubProvider) {
        wiseresumeSubProvider = await getGlobalAIEngine();
      }
    }
  }
  // Legacy deprecated body param support
  if (!userGeminiData && options.userGeminiKey) {
    userGeminiData = { key: options.userGeminiKey, model: null };
  }

  if (!hasManagedAI && !userByokData && !userGeminiData && !userOllamaData && !userOpenRouterData && !globalGeminiKey) {
    console.error('[AI] No API key available');
    throw createAIError('invalid_key', 'WiseResume AI is not configured. Please contact support or add your own API key in Settings.', 500);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Priority -1: New BYOK providers (OpenAI, Anthropic, Groq, Mistral, xAI, Cohere)
    if (userByokData) {
      const { provider, key, model: storedModel } = userByokData;
      const byokModel = storedModel || model;
      if (!byokModel) {
        throw createAIError('invalid_key', `No model selected for ${provider}. Please choose a model in AI Settings.`, 400);
      }
      console.log(`[AI] Using user BYOK ${provider} key, model:`, byokModel);
      try {
        let res: AIResponse;
        if (provider === 'anthropic') {
          res = await callAnthropicDirect(key, byokModel, messages, temperature, maxTokens, controller.signal, tools, toolChoice);
        } else {
          const completionsUrl = OPENAI_COMPAT_BASE_URLS[provider];
          res = await callOpenAICompatible(key, completionsUrl, provider, byokModel, messages, temperature, maxTokens, tools, toolChoice, controller.signal);
        }
        return { ...res, providerUsed: provider };
      } catch (err) {
        // BYOK strict mode: never fall back to platform keys when user has BYOK configured.
        // If the user's key fails, they must fix it — platform resources must not be consumed silently.
        console.error(`[AI] ${provider} BYOK call failed (no platform fallback):`, err instanceof Error ? err.message : err);
        // Preserve the typed AIError emitted by the provider call so the
        // client gets the right toast (rate_limit / payment_required /
        // upstream_5xx / invalid_key). Only wrap unknown / non-AI errors
        // into the generic "your key failed" invalid_key guidance.
        if (isAIError(err)) throw err;
        throw createAIError(
          'invalid_key',
          `Your ${provider} API key failed. Please check your key in AI Settings and try again.`,
          502,
        );
      }
    }

    // Priority 0: User BYOK OpenRouter key
    if (userOpenRouterData) {
      const rawStoredOrModel = userOpenRouterData.model || model;
      if (!rawStoredOrModel) {
        throw createAIError('invalid_key', 'No OpenRouter model selected. Please choose a model in AI Settings.', 400);
      }

      // Task #24: execution-time allow-list enforcement. The manage-api-keys
      // edge function rejects off-list writes, but pre-existing rows or
      // out-of-band writes could still smuggle a decommissioned slug into
      // user_api_keys.model. Reject the request explicitly so the user is
      // forced to update their selection in AI Settings — no silent coercion,
      // because doing so masks a stale row that should be repaired.
      const storedOrModel = rawStoredOrModel;
      if (!isAllowedOpenRouterModel(storedOrModel)) {
        throw createAIError(
          'invalid_key',
          `OpenRouter model "${storedOrModel}" is no longer in the curated allow-list. Open AI Settings → OpenRouter and pick one of: ${OPENROUTER_CURATED_MODELS.join(', ')}.`,
          400,
        );
      }

      // Task #24: Auto-fallback. When the user opted in (model stored as the
      // auto sentinel), iterate the curated chain in order until one model
      // returns successfully. Skippable errors (rate-limit/5xx/404) advance
      // to the next slug; auth/payment errors abort immediately because no
      // amount of model rotation will fix a bad key or exhausted credits.
      const isAuto = storedOrModel === OPENROUTER_AUTO_SENTINEL;
      const orChain: string[] = isAuto
        ? [...OPENROUTER_CURATED_MODELS]
        : [storedOrModel];

      console.log(`[AI] Using user BYOK OpenRouter key${isAuto ? ' (auto chain, ' + orChain.length + ' models)' : ', model: ' + storedOrModel}`);

      let lastOrErr: unknown = null;
      for (let i = 0; i < orChain.length; i++) {
        const orModel = orChain[i];
        try {
          const res = await callOpenRouterDirect(userOpenRouterData.key, orModel, messages, temperature, maxTokens, tools, toolChoice, controller.signal);
          return { ...res, providerUsed: `openrouter:${orModel}` };
        } catch (err) {
          lastOrErr = err;
          // Task #24: in Auto mode, treat per-attempt timeout/network aborts
          // as skippable too — the next slug gets a fresh upstream request,
          // and a stuck model should never be allowed to short-circuit the
          // whole curated chain. A user-initiated outer abort is propagated
          // separately via outerSignal so this does not swallow cancellation.
          const isAbort = err instanceof DOMException && err.name === 'AbortError';
          const skippable = isAuto && (isSkippableError(err) || isAbort);
          console.error(`[AI] OpenRouter BYOK ${orModel} failed${skippable ? ' (advancing in auto chain)' : ''}:`, err instanceof Error ? err.message : err);
          if (!skippable) break;
        }
      }
      // BYOK strict mode: never fall back to platform keys.
      if (isAIError(lastOrErr)) throw lastOrErr;
      throw createAIError(
        'invalid_key',
        isAuto
          ? 'All OpenRouter curated models failed. Please check your key/credits in AI Settings and try again.'
          : 'Your OpenRouter API key failed. Please check your key in AI Settings and try again.',
        502,
      );
    }

    // Priority 1: User BYOK Ollama key — use stored model name
    if (userOllamaData && userOllamaData.baseUrl) {
      const ollamaModel = userOllamaData.model;
      if (!ollamaModel) {
        throw createAIError('invalid_key', 'No Ollama model selected. Please choose a model in AI Settings.', 400);
      }
      console.log('[AI] Using user BYOK Ollama key at:', userOllamaData.baseUrl, 'model:', ollamaModel);
      try {
        const res = await callOllamaDirect(userOllamaData.key, userOllamaData.baseUrl, ollamaModel, messages, temperature, maxTokens, tools, toolChoice, controller.signal);
        return { ...res, providerUsed: 'ollama' };
      } catch (err) {
        // BYOK strict mode: never fall back to platform keys.
        console.error('[AI] Ollama BYOK call failed (no platform fallback):', err instanceof Error ? err.message : err);
        if (isAIError(err)) throw err;
        throw createAIError(
          'invalid_key',
          'Your Ollama endpoint failed. Please check your URL and model in AI Settings and try again.',
          502,
        );
      }
    }

    // Priority 2: User BYOK Gemini key
    if (userGeminiData) {
      const geminiModel = userGeminiData.model || model;
      console.log('[AI] Using user BYOK Gemini key for model:', geminiModel);
      try {
        const res = await callGeminiDirect(userGeminiData.key, geminiModel, messages, temperature, maxTokens, tools, toolChoice, controller.signal);
        return { ...res, providerUsed: 'gemini_byok' };
      } catch (err) {
        // BYOK strict mode: never fall back to platform keys.
        const errDetail = err instanceof Error ? err.message : String(err);
        console.error('[AI] Gemini BYOK call failed (no platform fallback):', errDetail);
        if (isAIError(err)) throw err;
        throw createAIError(
          'invalid_key',
          'Your Gemini API key failed. Please check your key in AI Settings and try again.',
          502,
        );
      }
    }

    // Priority 3: WiseResume AI managed (OpenRouter + Groq)
    if (hasManagedAI) {
      console.log('[AI] Using WiseResume AI (sub-provider:', wiseresumeSubProvider, ')');
      const res = await callWiseresumeAI(
        wiseresumeSubProvider,
        messages,
        temperature,
        maxTokens,
        tools,
        toolChoice,
        controller.signal,
        // Task #24: forward DevKit OpenRouter sub-panel overrides into the
        // managed sub-engine. Both undefined for normal app traffic, so
        // the chain behaves exactly as before unless the admin's test sets them.
        options.openrouterCuratedModel,
        options.openrouterAutoFallback,
        // AI-3: forward the breaker-suppression flag so the parse-retry
        // does not double-count against the per-provider breaker.
        ctx.suppressBreakerAccounting,
      );
      return { ...normalizeToolCallResponse(res, toolChoice), providerUsed: res.providerUsed || 'wiseresume' };
    }

    // Priority 4: Legacy GEMINI_API_KEY fallback — gated by the shared breaker.
    // If this provider has tripped its breaker (e.g. Google API has been
    // returning 5xx for the last minute) we skip the call entirely and fail
    // fast so the user gets an actionable "AI temporarily unavailable" toast
    // instead of waiting through a 30s timeout we already know will fail.
    if (globalGeminiKey) {
      const BREAKER_KEY = 'gemini_global';
      // AI-3: when this is the parse-retry of parseAIJSONWithRetry, the parent
      // call already paid the breaker decision and recorded the outcome —
      // skip both here so the pair counts as exactly one breaker event.
      if (!ctx.suppressBreakerAccounting && await isBreakerOpen(BREAKER_KEY)) {
        console.warn(`[AI] breaker open for ${BREAKER_KEY} — failing fast`);
        throw createAIError('provider_busy', 'AI is temporarily unavailable — please try again in a moment.', 503);
      }
      console.log('[AI] Using legacy GEMINI_API_KEY for model:', model);
      try {
        const res = await callGeminiDirect(globalGeminiKey, model, messages, temperature, maxTokens, tools, toolChoice, controller.signal);
        // Fire-and-forget telemetry: don't make the user wait on the
        // breaker bookkeeping write before the AI response is returned.
        if (!ctx.suppressBreakerAccounting) {
          void recordBreakerEvent(BREAKER_KEY, true);
        }
        return { ...res, providerUsed: 'gemini_global' };
      } catch (err) {
        if (!ctx.suppressBreakerAccounting && shouldCountAsBreakerFailure(err)) {
          void recordBreakerEvent(BREAKER_KEY, false);
        }
        throw err;
      }
    }

    // Should not reach here due to guard above
    throw createAIError('invalid_key', 'No AI API key configured.', 500);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw createAIError('network', `AI request timed out after ${Math.round(timeout / 1000)} seconds. Please try again.`, 408);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============= Retry + Fallback Logic =============

const RETRY_DELAYS = [1000, 2000, 4000];
const RETRY_TIMEOUTS = [30_000, 45_000, 55_000];
/**
 * Last-resort fallback slug used ONLY when dynamic model discovery returns
 * an empty list (OpenRouter API unreachable, empty response, etc.). In the
 * normal path the live list from getOpenRouterFreeModels() is used directly
 * — this constant is never pinned to the front of that list. Historically
 * a hallucinated slug was pinned here and silently broke every managed AI
 * request; keep this as a known-good, currently-free model only.
 */
const FALLBACK_MODEL = 'google/gemma-4-31b-it:free';

// AI-4 (Task #24): the curated OpenRouter list, the auto sentinel, and the
// model validator now live in `_shared/aiProviders.ts` (backed by
// `aiProviders.json`) so the edge function, the manage-api-keys endpoint,
// and the front-end (`src/lib/aiDefaults.ts`) all share one source of
// truth. Re-exported here so existing importers of these names from
// `aiClient.ts` keep working unchanged.
export {
  OPENROUTER_CURATED_MODELS,
  OPENROUTER_AUTO_SENTINEL,
  isAllowedOpenRouterModel,
} from './aiProviders.ts';
import {
  OPENROUTER_CURATED_MODELS,
  OPENROUTER_AUTO_SENTINEL,
  isAllowedOpenRouterModel,
} from './aiProviders.ts';

// ============= Dynamic Model Discovery (cached per cold-start) =============

/**
 * Cache for OpenRouter free models, populated once per edge function cold-start.
 * Keyed by OPENROUTER_API_KEY to invalidate if the key changes (unlikely in practice).
 */
let _openrouterModelCache: string[] | null = null;
let _openrouterCacheKey: string | null = null;

/**
 * Invalidate the cached OpenRouter model list. Call when an attempt fails with
 * 404 / "model not found" / "deprecated", because the cached slug list itself
 * is the source of staleness — the next request will refetch from /models.
 */
export function invalidateOpenRouterModelCache(): void {
  console.warn('[AI] invalidating OpenRouter model cache (stale slug detected)');
  _openrouterModelCache = null;
  _openrouterCacheKey = null;
}

/**
 * Fetches and ranks free models from OpenRouter.
 * Returns a list of model slugs ordered by context window (desc), then parameter count (desc).
 * Results are cached for the lifetime of the edge function cold-start.
 */
async function getOpenRouterFreeModels(apiKey: string): Promise<string[]> {
  // Task #24: dynamic discovery has been replaced by a curated allow-list.
  // The list lives in OPENROUTER_CURATED_MODELS (mirrored in aiDefaults.ts)
  // and the same array is returned for every key — the cache is preserved
  // only so the existing call sites and `invalidateOpenRouterModelCache`
  // hook keep working without changes.
  if (_openrouterModelCache !== null && _openrouterCacheKey === apiKey) {
    return _openrouterModelCache;
  }
  _openrouterModelCache = [...OPENROUTER_CURATED_MODELS];
  _openrouterCacheKey = apiKey;
  console.log(`[AI] OpenRouter curated chain (${_openrouterModelCache.length}):`, _openrouterModelCache.slice(0, 3).join(', '), '…');
  return _openrouterModelCache;
}

/**
 * Cache for Groq models, populated once per cold-start.
 */
let _groqModelCache: string[] | null = null;
let _groqCacheKey: string | null = null;

/**
 * Invalidate the cached Groq model list. Same reasoning as
 * `invalidateOpenRouterModelCache`: a 404 / decommissioned-model error means
 * our cached snapshot of /models is stale and must be refetched.
 */
export function invalidateGroqModelCache(): void {
  console.warn('[AI] invalidating Groq model cache (stale slug detected)');
  _groqModelCache = null;
  _groqCacheKey = null;
}

/**
 * Known-good Groq chat-completion models ranked by capability (largest/best first).
 * Only well-known LLMs that support chat completions are listed here.
 * This list acts as both a filter and a ranking: only IDs in this list are
 * included in the discovered model set, which prevents incompatible or
 * non-chat-capable model IDs from being tried.
 */
const GROQ_KNOWN_CHAT_MODELS: Array<{ id: string; paramCount: number; contextWindow: number }> = [
  { id: 'qwen/qwen3-32b', paramCount: 32, contextWindow: 131072 },
  { id: 'llama-3.3-70b-versatile', paramCount: 70, contextWindow: 128000 },
  { id: 'llama3-70b-8192', paramCount: 70, contextWindow: 8192 },
  { id: 'llama-3.1-70b-versatile', paramCount: 70, contextWindow: 128000 },
  { id: 'mixtral-8x7b-32768', paramCount: 56, contextWindow: 32768 },
  { id: 'gemma2-9b-it', paramCount: 9, contextWindow: 8192 },
  { id: 'llama3-8b-8192', paramCount: 8, contextWindow: 8192 },
  { id: 'llama-3.1-8b-instant', paramCount: 8, contextWindow: 128000 },
  { id: 'gemma-7b-it', paramCount: 7, contextWindow: 8192 },
];

/**
 * Fetches available chat models from Groq, filtered to known-good chat-capable LLMs.
 * Ranks by context window descending, then parameter count descending.
 * Results are cached for the lifetime of the edge function cold-start.
 */
async function getGroqModels(apiKey: string): Promise<string[]> {
  if (_groqModelCache !== null && _groqCacheKey === apiKey) {
    return _groqModelCache;
  }

  try {
    const discoveryCtrl = new AbortController();
    const discoveryTimeout = setTimeout(() => discoveryCtrl.abort(), 5_000);
    let response: Response;
    try {
      response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: discoveryCtrl.signal,
      });
    } finally {
      clearTimeout(discoveryTimeout);
    }

    if (!response.ok) {
      console.warn('[AI] Groq model list fetch failed:', response.status);
      _groqModelCache = ['qwen/qwen3-32b'];
      _groqCacheKey = apiKey;
      return _groqModelCache;
    }

    const json = await response.json() as { data?: Array<{ id: string }> };
    const available = new Set((json.data || []).map(m => m.id));

    // Only include known chat-capable models that are currently available
    const models = GROQ_KNOWN_CHAT_MODELS
      .filter(m => available.has(m.id))
      .sort((a, b) => {
        if (b.contextWindow !== a.contextWindow) return b.contextWindow - a.contextWindow;
        return b.paramCount - a.paramCount;
      })
      .map(m => m.id);

    if (models.length === 0) {
      console.warn('[AI] Groq returned no known-good chat models; using default');
      models.push('qwen/qwen3-32b');
    }

    console.log(`[AI] Groq chat models discovered (${models.length}):`, models.slice(0, 5).join(', '));
    _groqModelCache = models;
    _groqCacheKey = apiKey;
    return models;
  } catch (err) {
    console.warn('[AI] Failed to fetch Groq model list:', err instanceof Error ? err.message : err);
    _groqModelCache = ['qwen/qwen3-32b'];
    _groqCacheKey = apiKey;
    return _groqModelCache;
  }
}

/**
 * Extracts a rough parameter count from a model slug for ranking purposes.
 * e.g. "meta-llama/llama-3.3-70b-instruct:free" → 26, "meta/llama-3.3-70b..." → 70.
 */
function extractParamCount(slug: string): number {
  const match = slug.match(/(\d+)b/i);
  return match ? parseInt(match[1], 10) : 0;
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (isAIError(error)) {
    // 'provider_busy' is thrown by callWiseresumeAI after it has exhausted all
    // internal models. Retrying at the outer callAIWithRetry level is pointless
    // — the inner loop already tried every available model/provider.
    if (error.type === 'provider_busy') return false;
    if (error.status >= 500) return true;
    if (error.type === 'network') return true;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calls AI with retry + exponential backoff + model fallback.
 * - Up to 3 attempts with escalating timeouts (30s, 45s, 55s)
 * - Retries only on 5xx / timeout / network errors
 * - 4xx errors (400, 401, 402, 429) throw immediately
 * - After all retries fail, one final attempt with a lighter fallback model
 */
export async function callAIWithRetry(options: AICallOptions): Promise<AIResponse> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await callAI({ ...options, timeout: RETRY_TIMEOUTS[attempt] });
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error)) throw error;
      console.warn(`[AI] Attempt ${attempt + 1}/3 failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (attempt < 2) await sleep(RETRY_DELAYS[attempt]);
    }
  }

  // All retries failed — try fallback model. Skip if we were already on it
  // (retrying the same model 4 times in a row is never going to help and
  // just burns budget before the user-visible error).
  if (options.model === FALLBACK_MODEL) {
    console.warn(`[AI] Primary model already == fallback (${FALLBACK_MODEL}); not retrying.`);
    throw lastError;
  }
  console.warn(`[AI] Primary model ${options.model} failed after 3 attempts, trying fallback: ${FALLBACK_MODEL}`);
  try {
    return await callAI({ ...options, model: FALLBACK_MODEL, timeout: 55_000 });
  } catch (fallbackError) {
    console.error('[AI] Fallback model also failed:', fallbackError instanceof Error ? fallbackError.message : fallbackError);
    // Throw the original error as it's more meaningful
    throw lastError;
  }
}

// ============= Input Sanitization =============

/**
 * Sanitizes and truncates input text for AI processing.
 * - Normalizes whitespace (collapses excessive newlines/spaces)
 * - Strips non-printable characters
 * - Truncates at a clean sentence boundary if exceeding maxChars
 */
export function sanitizeInputText(text: string, maxChars = 15_000): string {
  const cleaned = text
    .replace(/\r\n/g, '\n')           // Normalize line endings
    .replace(/\n{3,}/g, '\n\n')       // Collapse 3+ newlines to 2
    .replace(/ {2,}/g, ' ')           // Collapse multiple spaces
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, '') // Strip non-printable (keep tabs, newlines, printable)
    .trim();

  if (cleaned.length <= maxChars) return cleaned;

  // Truncate at last sentence boundary before limit
  const truncated = cleaned.slice(0, maxChars);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('.\n'),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('? ')
  );

  if (lastSentenceEnd > maxChars * 0.8) {
    return truncated.slice(0, lastSentenceEnd + 1);
  }

  return truncated;
}

/**
 * Calls an Ollama-compatible API (OpenAI-compatible endpoint)
 */
function isOllamaCloud(url: string): boolean {
  return /ollama\.com/i.test(url);
}

// Exported under a `__test_` prefix so the AI-1 integration smoke test can
// drive the read-time validation + DNS-pin + outbound-fetch pipeline
// directly with a mocked transport, without standing up the entire callAI
// surface (DB lookups, breaker, etc.). Not part of the public API.
export { callOllamaDirect as __test_callOllamaDirect };

async function callOllamaDirect(
  apiKey: string,
  baseUrl: string,
  model: string,
  messages: AIMessage[],
  temperature: number,
  maxTokens?: number,
  tools?: AITool[],
  toolChoice?: { type: 'function'; function: { name: string } } | 'auto',
  signal?: AbortSignal
): Promise<AIResponse> {
  // AI-1: Re-validate at request time so a legacy/tampered row whose
  // base_url predates the write-time check (or whose hostname now resolves
  // to a private IP) never produces an outbound fetch. We also use this
  // safety result as the canonical, normalised URL.
  const safety = await validateBaseUrl(baseUrl);
  if (!safety.ok) {
    throw createAIError(
      'invalid_key',
      `Ollama base URL is not allowed: ${safety.message} Please update it in AI Settings → Ollama.`,
      400,
    );
  }
  // Defeat DNS rebinding: re-resolve the hostname immediately before fetch
  // AND pin the outbound request to one of the validated public IPs via
  // pinnedFetch (which uses node:https' lookup hook). Even if an attacker
  // flips DNS in the microseconds between this check and the connection,
  // we still connect to the pinned IP rather than the attacker's address.
  const rebindCheck = await assertSameSafeIps(safety.hostname);
  if (!rebindCheck.ok) {
    throw createAIError(
      'invalid_key',
      `Ollama host failed safety re-check: ${rebindCheck.message}`,
      400,
    );
  }
  const pinnedIp = rebindCheck.ips[0] ?? safety.ips[0];
  if (!pinnedIp) {
    throw createAIError('invalid_key', 'Ollama host could not be resolved to a safe IP.', 400);
  }
  const cleanUrl = safety.url;
  const useNativeApi = isOllamaCloud(cleanUrl);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  let endpoint: string;
  let body: Record<string, unknown>;

  if (useNativeApi) {
    // Native Ollama API (ollama.com): POST /api/chat
    endpoint = `${cleanUrl}/api/chat`;
    body = { model, messages, stream: false };
    // Native Ollama doesn't support tools via /api/chat the same way
  } else {
    // OpenAI-compatible (self-hosted): POST /v1/chat/completions
    endpoint = `${cleanUrl}/v1/chat/completions`;
    body = { model, messages, temperature };
    if (maxTokens) body.max_tokens = maxTokens;
    if (tools && tools.length > 0) {
      body.tools = tools;
      if (toolChoice) body.tool_choice = toolChoice;
    }
  }

  const response = await pinnedFetch(endpoint, pinnedIp, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (response.status < 200 || response.status >= 300) {
    const errorText = response.bodyText;
    // AI-5: scrub before logging; cap+scrub before forwarding to client.
    console.error('Ollama API error:', response.status, scrubSecrets(errorText));

    let errorMessage = 'Ollama request failed';
    try {
      const parsed = JSON.parse(errorText);
      errorMessage = parsed.error?.message || parsed.error || errorMessage;
    } catch {}
    errorMessage = scrubAndCap(errorMessage);

    if (response.status === 401 || response.status === 403) {
      throw createAIError('invalid_key', 'Invalid Ollama API key. Please check your settings.', 422);
    }
    if (response.status === 429) {
      throw createAIError('rate_limit', 'Ollama rate limit reached. Please wait.', 429);
    }
    if (response.status >= 500 && response.status < 600) {
      throw createAIError('upstream_5xx', `Ollama upstream error (${response.status}). Please try again.`, response.status);
    }
    throw createAIError('unknown', errorMessage, response.status);
  }

  const data = JSON.parse(response.bodyText);

  // Parse native Ollama response format
  if (useNativeApi && data.message) {
    return {
      content: data.message.content || null,
      usage: data.eval_count ? {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
      } : undefined,
      providerUsed: 'ollama-native',
    };
  }

  return parseOpenAIResponse(data);
}

/**
 * Calls OpenRouter API (OpenAI-compatible endpoint)
 */
async function callOpenRouterDirect(
  apiKey: string,
  model: string,
  messages: AIMessage[],
  temperature: number,
  maxTokens?: number,
  tools?: AITool[],
  toolChoice?: { type: 'function'; function: { name: string } } | 'auto',
  signal?: AbortSignal
): Promise<AIResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  const body: Record<string, unknown> = { model, messages, temperature };
  if (maxTokens) body.max_tokens = maxTokens;
  if (tools && tools.length > 0) {
    body.tools = tools;
    if (toolChoice) body.tool_choice = toolChoice;
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter API error:', response.status, scrubSecrets(errorText));

    let errorMessage = 'OpenRouter request failed';
    try {
      const parsed = JSON.parse(errorText);
      errorMessage = parsed.error?.message || parsed.error || errorMessage;
    } catch {}
    errorMessage = scrubAndCap(errorMessage);

    if (response.status === 401 || response.status === 403) {
      throw createAIError('invalid_key', 'Invalid OpenRouter API key. Please check your settings.', 422);
    }
    if (response.status === 429) {
      throw createAIError('rate_limit', 'OpenRouter rate limit reached. Please wait.', 429);
    }
    if (response.status === 402) {
      throw createAIError('payment_required', 'OpenRouter credits exhausted. Please add credits.', 402);
    }
    if (response.status >= 500 && response.status < 600) {
      throw createAIError('upstream_5xx', `OpenRouter upstream error (${response.status}). Please try again.`, response.status);
    }
    throw createAIError('unknown', errorMessage, response.status);
  }

  const data = await response.json();
  return parseOpenAIResponse(data);
}

// AI-4 (Task #24): OPENAI_COMPAT_BASE_URLS now lives in
// `_shared/aiProviders.ts` (backed by `aiProviders.json`) so the credit
// utility, the routing branches, and the manage-api-keys endpoint cannot
// drift. Imported once at the top of the module-level imports.
import { OPENAI_COMPAT_BASE_URLS } from './aiProviders.ts';

/**
 * Generic call to any OpenAI-compatible API with a user-provided key.
 * Used for: OpenAI, Groq (BYOK), Mistral, xAI, Cohere.
 */
async function callOpenAICompatible(
  apiKey: string,
  completionsUrl: string,
  providerName: string,
  model: string,
  messages: AIMessage[],
  temperature: number,
  maxTokens?: number,
  tools?: AITool[],
  toolChoice?: { type: 'function'; function: { name: string } } | 'auto',
  signal?: AbortSignal
): Promise<AIResponse> {
  const body: Record<string, unknown> = { model, messages, temperature };
  if (maxTokens) body.max_tokens = maxTokens;
  if (tools && tools.length > 0) {
    body.tools = tools;
    if (toolChoice) body.tool_choice = toolChoice;
  }

  const response = await fetch(completionsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`${providerName} API error:`, response.status, scrubSecrets(errorText));
    let errorMessage = `${providerName} request failed`;
    try {
      const parsed = JSON.parse(errorText);
      errorMessage = parsed.error?.message || parsed.error || errorMessage;
    } catch {}
    errorMessage = scrubAndCap(errorMessage);
    if (response.status === 401 || response.status === 403) {
      throw createAIError('invalid_key', `Invalid ${providerName} API key. Please check your settings.`, 422);
    }
    if (response.status === 429) {
      throw createAIError('rate_limit', `${providerName} rate limit reached. Please wait.`, 429);
    }
    if (response.status === 402) {
      throw createAIError('payment_required', `${providerName} credits exhausted.`, 402);
    }
    if (response.status >= 500 && response.status < 600) {
      throw createAIError('upstream_5xx', `${providerName} upstream error (${response.status}). Please try again.`, response.status);
    }
    throw createAIError('unknown', errorMessage, response.status);
  }

  const data = await response.json();
  return parseOpenAIResponse(data);
}

// Anthropic response content block types
interface AnthropicTextBlock {
  type: 'text';
  text: string;
}
interface AnthropicToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}
type AnthropicContentBlock = AnthropicTextBlock | AnthropicToolUseBlock;

interface AnthropicResponse {
  content: AnthropicContentBlock[];
  usage?: { input_tokens: number; output_tokens: number };
  stop_reason?: string;
}

/**
 * Calls the Anthropic Messages API directly (Claude models).
 * Supports tool-calling by converting OpenAI tool format to Anthropic format.
 */
async function callAnthropicDirect(
  apiKey: string,
  model: string,
  messages: AIMessage[],
  temperature: number,
  maxTokens?: number,
  signal?: AbortSignal,
  tools?: AITool[],
  toolChoice?: { type: 'function'; function: { name: string } } | 'auto',
): Promise<AIResponse> {
  const systemMessages = messages.filter(m => m.role === 'system');
  const nonSystemMessages = messages.filter(m => m.role !== 'system');

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens || 2048,
    messages: nonSystemMessages.map(m => ({ role: m.role, content: m.content })),
    temperature,
  };

  if (systemMessages.length > 0) {
    body.system = systemMessages.map(m => m.content).join('\n\n');
  }

  // Convert OpenAI tool format to Anthropic tool format
  if (tools && tools.length > 0) {
    body.tools = tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));
    if (toolChoice === 'auto') {
      body.tool_choice = { type: 'auto' };
    } else if (toolChoice && typeof toolChoice === 'object') {
      body.tool_choice = { type: 'tool', name: toolChoice.function.name };
    }
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Anthropic API error:', response.status, scrubSecrets(errorText));
    let errorMessage = 'Anthropic request failed';
    try {
      const parsed = JSON.parse(errorText) as { error?: { message?: string } };
      errorMessage = parsed.error?.message || errorMessage;
    } catch {
      // Use raw error text as message
    }
    errorMessage = scrubAndCap(errorMessage);
    if (response.status === 401 || response.status === 403) {
      throw createAIError('invalid_key', 'Invalid Anthropic API key. Please check your settings.', 422);
    }
    if (response.status === 429) {
      throw createAIError('rate_limit', 'Anthropic rate limit reached. Please wait.', 429);
    }
    if (response.status === 402) {
      throw createAIError('payment_required', 'Anthropic credits exhausted.', 402);
    }
    if (response.status >= 500 && response.status < 600) {
      throw createAIError('upstream_5xx', `Anthropic upstream error (${response.status}). Please try again.`, response.status);
    }
    throw createAIError('unknown', errorMessage, response.status);
  }

  const data = await response.json() as AnthropicResponse;

  const textBlocks = data.content.filter((c): c is AnthropicTextBlock => c.type === 'text');
  const toolUseBlocks = data.content.filter((c): c is AnthropicToolUseBlock => c.type === 'tool_use');

  const toolCalls = toolUseBlocks.length > 0
    ? toolUseBlocks.map(block => ({
        id: block.id,
        type: 'function' as const,
        function: {
          name: block.name,
          arguments: JSON.stringify(block.input),
        },
      }))
    : undefined;

  return {
    content: textBlocks.map(b => b.text).join('') || null,
    toolCalls,
    usage: data.usage ? {
      promptTokens: data.usage.input_tokens,
      completionTokens: data.usage.output_tokens,
    } : undefined,
  };
}

/**
 * Calls Groq API (OpenAI-compatible endpoint) using the managed GROQ_API_KEY.
 * @param model Groq model slug to use (defaults to qwen/qwen3-32b)
 */
async function callGroqDirect(
  apiKey: string,
  messages: AIMessage[],
  temperature: number,
  maxTokens?: number,
  tools?: AITool[],
  toolChoice?: { type: 'function'; function: { name: string } } | 'auto',
  signal?: AbortSignal,
  model = 'qwen/qwen3-32b'
): Promise<AIResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
  };
  if (maxTokens) body.max_tokens = maxTokens;
  if (tools && tools.length > 0) {
    body.tools = tools;
    if (toolChoice) body.tool_choice = toolChoice;
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Groq API error:', response.status, scrubSecrets(errorText));

    let errorMessage = 'Groq request failed';
    try {
      const parsed = JSON.parse(errorText);
      errorMessage = parsed.error?.message || parsed.error || errorMessage;
    } catch {}
    errorMessage = scrubAndCap(errorMessage);

    if (response.status === 401 || response.status === 403) {
      throw createAIError('invalid_key', 'Invalid Groq API key.', 422);
    }
    if (response.status === 429) {
      throw createAIError('rate_limit', 'Groq rate limit reached. Please wait a moment.', 429);
    }
    if (response.status === 402) {
      throw createAIError('payment_required', 'Groq credits exhausted.', 402);
    }
    throw createAIError('unknown', errorMessage, response.status);
  }

  const data = await response.json();
  return parseOpenAIResponse(data);
}

/**
 * Returns true for errors that justify skipping to the next model in the chain:
 * - Rate limits (429)
 * - 5xx server errors (model unavailable, overloaded, etc.)
 * - 404 model not found (model slug unavailable on this provider)
 * - 400 bad request that is not an auth issue (some providers return 400 for
 *   unsupported model IDs or missing capabilities)
 *
 * Hard errors that abort the chain immediately:
 * - 401 / 403 / invalid_key (auth failure — retrying other models won't help)
 * - 402 / payment_required (credits exhausted — retrying won't help)
 */
function isSkippableError(err: unknown): boolean {
  if (isAIError(err)) {
    if (err.type === 'invalid_key' || err.type === 'payment_required') return false;
    // Rate limits and server errors are always skippable
    if (err.type === 'rate_limit') return true;
    if (err.status === 429 || err.status === 503 || err.status === 502 || err.status >= 500) return true;
    // Model-not-found / model-incompatible errors
    if (err.status === 404) return true;
    // 400 errors that indicate a model capability mismatch (not auth-related)
    if (err.status === 400 && err.type !== 'invalid_key') return true;
  }
  return false;
}

/**
 * Routes to WiseResume AI managed backend using dynamic ranked model lists.
 * Priority order:
 *   1. OpenRouter free models (ranked by context window, largest first)
 *   2. Groq models (ranked by capability, largest first)
 * Each model is tried in order; skippable errors (rate limit, 5xx) advance to
 * the next model. Hard errors (auth, payment) abort immediately.
 * Results are logged per-attempt for observability.
 */
/**
 * Mirror of `OPENROUTER2_DEFAULT_MODEL` in `src/lib/aiDefaults.ts`. This is
 * the *primary* model OpenRouter 2 routes to first. Kept as a single string
 * for the dev-kit panel which displays one "pinned" slug.
 */
const OPENROUTER2_PINNED_MODEL = 'openai/gpt-oss-120b:free';

/**
 * Full fallback chain for the OpenRouter 2 sub-provider. The primary slug is
 * `OPENROUTER2_PINNED_MODEL`; the rest are tried in order on skippable errors
 * (rate-limit / 5xx / 404 / timeout). All are verified-working free models on
 * OpenRouter as of April 2026; if any are decommissioned upstream the chain
 * advances past them automatically. Curated for HR/recruiting reasoning
 * quality (large models first, smaller ones as last-resort).
 */
const OPENROUTER2_FALLBACK_CHAIN: string[] = [
  'openai/gpt-oss-120b:free',                    // primary — OpenAI 120B open-weights
  'nvidia/nemotron-3-super-120b-a12b:free',      // 120B, NVIDIA reasoning-tuned
  'meta-llama/llama-3.3-70b-instruct:free',      // 70B Llama 3.3
  'minimax/minimax-m2.5:free',                   // MiniMax M2.5
  'inclusionai/ling-2.6-flash:free',             // OpenRouter's announced Elephant successor
  'google/gemma-4-31b-it:free',                  // 31B Gemma 4
  'nvidia/nemotron-nano-9b-v2:free',             // 9B fallback
];

export async function callWiseresumeAI(
  subProvider: 'openrouter' | 'groq' | 'auto' | 'openrouter2',
  messages: AIMessage[],
  temperature: number,
  maxTokens?: number,
  tools?: AITool[],
  toolChoice?: { type: 'function'; function: { name: string } } | 'auto',
  outerSignal?: AbortSignal,
  // Task #24: optional per-request OpenRouter overrides forwarded from the
  // DevKit OpenRouter sub-panel. Both default to "no override" so every
  // existing call site (tailoring, assist, etc.) keeps the same behavior.
  openrouterCuratedModel?: string,
  openrouterAutoFallback?: boolean,
  // AI-3: when true, skip every isBreakerOpen() and recordBreakerEvent() call
  // in this loop. Set by parseAIJSONWithRetry's corrective second attempt so
  // the parent and the retry together pay one breaker decision and produce
  // one combined breaker outcome event — never two.
  suppressBreakerAccounting?: boolean,
): Promise<AIResponse> {
  const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');
  const openrouter2Key = Deno.env.get('OPENROUTER2_API_KEY');
  const groqKey = Deno.env.get('GROQ_API_KEY');

  /**
   * Per-model timeout: 25 s each — independent of the outer signal.
   * Free OpenRouter models (Gemma/Qwen/Llama-3.x) routinely take 10-30s on
   * cold starts, queueing, or normal-length replies. The previous 8s cap was
   * killing in-flight requests that would have otherwise succeeded, marching
   * the chain through every model and ending in a misleading 503
   * provider_busy. 25s gives each model a real chance to respond.
   */
  const PER_MODEL_TIMEOUT_MS = 25_000;
  /**
   * Overall budget for the entire WiseResume managed chain.
   * Caps total wall-time at ~50s so we still finish inside Supabase's 60s
   * edge function limit even if every attempt runs to its timeout.
   * Tracked via OVERALL_DEADLINE below.
   */
  const OVERALL_BUDGET_MS = 50_000;
  const OVERALL_DEADLINE = Date.now() + OVERALL_BUDGET_MS;

  /**
   * Try a single OpenRouter model by slug.
   * Uses its own AbortController so a timeout on one model does NOT abort the next.
   * The per-model controller is also linked to outerSignal: if the caller cancels
   * the whole operation we propagate the abort immediately.
   */
  /**
   * Generic OpenRouter caller used by both the primary `openrouter` provider
   * and the secondary `openrouter2` provider. The two share an upstream
   * (openrouter.ai) and a wire format; only the API key, the providerUsed tag,
   * and the human label in error messages differ. Keeping the body identical
   * means breaker classification (401 → invalid_key, 429 → rate_limit, etc.)
   * stays in lockstep across both managed accounts.
   */
  const callOpenRouterUpstream = async (
    apiKey: string,
    model: string,
    providerLabel: 'openrouter' | 'openrouter2',
    effectiveTimeoutMs: number,
  ): Promise<AIResponse> => {
    const ctrl = new AbortController();
    const timerId = setTimeout(() => ctrl.abort(), effectiveTimeoutMs);
    const onOuterAbort = () => ctrl.abort();
    outerSignal?.addEventListener('abort', onOuterAbort);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://resume.thewise.cloud',
        'X-Title': 'WiseResume',
      };
      const body: Record<string, unknown> = { model, messages, temperature };
      if (maxTokens) body.max_tokens = maxTokens;
      if (tools && tools.length > 0) {
        body.tools = tools;
        if (toolChoice) body.tool_choice = toolChoice;
      }
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `${providerLabel} request failed`;
        try { const p = JSON.parse(errorText); errorMessage = p.error?.message || p.error || errorMessage; } catch {}
        // AI-5: scrub before logging and cap+scrub before forwarding.
        console.error(`${providerLabel} upstream API error:`, response.status, scrubSecrets(errorText));
        errorMessage = scrubAndCap(errorMessage);
        if (response.status === 401 || response.status === 403) throw createAIError('invalid_key', `WiseResume AI ${providerLabel} key is invalid.`, response.status);
        if (response.status === 429) throw createAIError('rate_limit', `${providerLabel} model ${model} rate limited.`, 429);
        if (response.status === 402) throw createAIError('payment_required', `${providerLabel} credits exhausted.`, 402);
        if (response.status >= 500 && response.status < 600) throw createAIError('upstream_5xx', `${providerLabel} model ${model} upstream error (${response.status}).`, response.status);
        throw createAIError('unknown', errorMessage, response.status);
      }
      const data = await response.json();
      return { ...parseOpenAIResponse(data), providerUsed: `wiseresume/${providerLabel}:${model}` };
    } finally {
      clearTimeout(timerId);
      outerSignal?.removeEventListener('abort', onOuterAbort);
    }
  };

  const tryOpenRouterModel = (model: string, effectiveTimeoutMs: number = PER_MODEL_TIMEOUT_MS): Promise<AIResponse> =>
    callOpenRouterUpstream(openrouterKey!, model, 'openrouter', effectiveTimeoutMs);

  const tryOpenRouter2Model = (model: string, effectiveTimeoutMs: number = PER_MODEL_TIMEOUT_MS): Promise<AIResponse> =>
    callOpenRouterUpstream(openrouter2Key!, model, 'openrouter2', effectiveTimeoutMs);

  /**
   * Try a single Groq model by slug.
   * Same per-model timeout approach as tryOpenRouterModel.
   */
  const tryGroqModel = async (model: string, effectiveTimeoutMs: number = PER_MODEL_TIMEOUT_MS): Promise<AIResponse> => {
    const ctrl = new AbortController();
    const timerId = setTimeout(() => ctrl.abort(), effectiveTimeoutMs);
    const onOuterAbort = () => ctrl.abort();
    outerSignal?.addEventListener('abort', onOuterAbort);
    try {
      const res = await callGroqDirect(groqKey!, messages, temperature, maxTokens, tools, toolChoice, ctrl.signal, model);
      return { ...res, providerUsed: `wiseresume/groq:${model}` };
    } finally {
      clearTimeout(timerId);
      outerSignal?.removeEventListener('abort', onOuterAbort);
    }
  };

  // Build the two chains based on subProvider setting.
  // Cap each list to 2: with PER_MODEL_TIMEOUT_MS=25s the worst case is
  //   (2 OpenRouter × 25s) + (2 Groq × 25s) = 100s — still bounded by
  // OVERALL_DEADLINE (50s) in the loop below, but a smaller chain means
  // that on common failures we exit cleanly with at least one Groq attempt.
  const MAX_MODELS_PER_PROVIDER = 2;

  // Task #24: per-request overrides from the DevKit OpenRouter sub-panel.
  // - openrouterAutoFallback=true → iterate the FULL curated chain (8 slugs)
  //   so the admin can verify auto-fallback end-to-end. Overall deadline
  //   below still bounds total wall time, so the loop exits cleanly even
  //   if every slug times out.
  // - openrouterCuratedModel=<slug> → pin to that single curated slug
  //   (rejected here if off-list — the same allow-list manage-api-keys
  //   enforces on writes is enforced at execution time, no silent coercion).
  // Resolve effective curated model + auto from (in priority order):
  //   1. per-request overrides forwarded from the DevKit Test button
  //   2. app_settings (admin-controlled, propagates to ALL managed traffic)
  //   3. curated default
  // Ordering matters: the panel writes app_settings on every change so live
  // production traffic picks up the new selection within the cache TTL,
  // while the Test button can still target a different slug for verification.
  // Bypass the in-process cache when the caller supplied an explicit override
  // (e.g. the DevKit Test button): it represents a deliberate, just-typed
  // admin choice and must be honored without waiting for cache TTL.
  const adminSettings = await getOpenRouterAdminSettings({
    bypassCache: openrouterCuratedModel !== undefined || openrouterAutoFallback !== undefined,
  });
  const effectiveAuto = openrouterAutoFallback ?? adminSettings.auto;
  const requestedSingle = openrouterCuratedModel ?? adminSettings.model;
  const effectiveSingle = effectiveAuto ? null : requestedSingle;
  if (effectiveSingle && !isAllowedOpenRouterModel(effectiveSingle)) {
    throw createAIError(
      'invalid_key',
      `OpenRouter model "${effectiveSingle}" is not in the curated allow-list. Pick one of: ${OPENROUTER_CURATED_MODELS.join(', ')}.`,
      400,
    );
  }

  let openrouterModels: string[] = [];
  if ((subProvider === 'openrouter' || subProvider === 'auto') && openrouterKey) {
    if (effectiveAuto) {
      // Auto: start from the admin-configured primary, then iterate the
      // rest of the curated chain so the primary is always tried first.
      const primary = adminSettings.model;
      const rest = OPENROUTER_CURATED_MODELS.filter((m) => m !== primary);
      openrouterModels = [primary, ...rest];
    } else if (effectiveSingle) {
      openrouterModels = [effectiveSingle];
    } else {
      openrouterModels = (await getOpenRouterFreeModels(openrouterKey)).slice(0, MAX_MODELS_PER_PROVIDER);
    }
  }
  const groqModels = (subProvider === 'groq' || subProvider === 'auto') && groqKey
    ? (await getGroqModels(groqKey)).slice(0, MAX_MODELS_PER_PROVIDER)
    : [];
  // OpenRouter 2 uses a curated fallback chain (no live /models discovery).
  // The first slug is the pinned primary; the rest are tried in order on
  // skippable errors (429/5xx/404/timeout). Capped at MAX_MODELS_PER_PROVIDER
  // so it doesn't dwarf the other providers in `auto` mode.
  const openrouter2Models =
    (subProvider === 'openrouter2' || subProvider === 'auto') && openrouter2Key
      ? OPENROUTER2_FALLBACK_CHAIN.slice(0, MAX_MODELS_PER_PROVIDER)
      : [];

  // Priority order:
  //   - explicit sub-provider → only that provider's chain
  //   - 'auto' → OpenRouter (ranked free) → OpenRouter 2 (pinned elephant-alpha)
  //              → Groq (ranked). OpenRouter 2 sits between the two
  //              accounts so a quota/rate-limit hit on OpenRouter 1 first
  //              fails over to a sibling OpenRouter account before crossing
  //              to a different upstream (Groq), which is the more disruptive
  //              switch (different ranked-model list, different quirks).
  type AttemptEntry = { provider: 'openrouter' | 'groq' | 'openrouter2'; model: string };
  let attempts: AttemptEntry[];

  if (subProvider === 'openrouter') {
    attempts = openrouterModels.map(m => ({ provider: 'openrouter' as const, model: m }));
  } else if (subProvider === 'groq') {
    attempts = groqModels.map(m => ({ provider: 'groq' as const, model: m }));
  } else if (subProvider === 'openrouter2') {
    attempts = openrouter2Models.map(m => ({ provider: 'openrouter2' as const, model: m }));
  } else {
    // Auto mode: OpenRouter → OpenRouter 2 → Groq (see note above)
    attempts = [
      ...openrouterModels.map(m => ({ provider: 'openrouter' as const, model: m })),
      ...openrouter2Models.map(m => ({ provider: 'openrouter2' as const, model: m })),
      ...groqModels.map(m => ({ provider: 'groq' as const, model: m })),
    ];
  }

  if (attempts.length === 0) {
    throw createAIError('invalid_key', 'WiseResume AI is not configured. Please contact support.', 500);
  }

  // In auto mode we span two providers. When a hard error (auth/payment) occurs
  // on one provider it still makes sense to try the other provider — the second
  // provider might be healthy even when the first has a key/credit issue.
  // We only treat a hard error as truly terminal if it is the *same* provider
  // that the next attempt would also use (i.e., we cannot escape it).
  const isAutoMode = subProvider === 'auto';

  let lastError: unknown;
  const totalAttempts = attempts.length;
  // Per-attempt outcome trail surfaced via the final error for debugging
  // and so the client can show "Tried OpenRouter (timeout) + Groq (429)".
  const attemptLog: Array<{ provider: string; model: string; outcome: string; ms: number }> = [];
  // One breaker read per provider per request — caches the open/closed
  // decision so we don't add a DB round-trip before every model attempt.
  const breakerOpenCache: Record<string, boolean> = {};

  for (let i = 0; i < totalAttempts; i++) {
    // If the outer signal was already aborted (e.g. user navigated away) stop now.
    if (outerSignal?.aborted) {
      throw createAIError('unknown', 'Request cancelled by caller.', 499);
    }

    // Enforce overall budget. Use a small per-attempt floor (5s) — NOT
    // PER_MODEL_TIMEOUT_MS — so that after one ~25s timeout we still have
    // ~25s left and can run the next provider/model. Requiring a full
    // 25s window before starting the next attempt would collapse fallback
    // to a single attempt in the exact failure mode this fix targets.
    // The next attempt will get its own per-model timeout anyway, so as
    // long as we have more than 5s left it is worth trying.
    const MIN_NEXT_ATTEMPT_MS = 5_000;
    const remaining = OVERALL_DEADLINE - Date.now();
    if (remaining < MIN_NEXT_ATTEMPT_MS) {
      // Don't push a synthetic attempt entry — only real provider/model
      // attempts belong in the user-facing telemetry. The deadline event
      // is logged separately so it stays observable in server logs.
      console.warn(`[AI] WiseResume overall deadline reached (${remaining}ms left). Stopping after ${attemptLog.length} attempts.`);
      break;
    }
    // Effective per-attempt timeout = min(PER_MODEL_TIMEOUT_MS, remaining).
    // This is what genuinely caps wall-clock at OVERALL_BUDGET_MS: even if
    // remaining is e.g. 8s and PER_MODEL is 25s, the per-model AbortController
    // will fire at 8s, not 25s. Without this clamp the budget was advisory only.
    const effectiveTimeoutMs = Math.min(PER_MODEL_TIMEOUT_MS, remaining);

    const { provider, model } = attempts[i];
    const breakerKey = `wiseresume/${provider}`;

    // Cross-instance circuit breaker: if THIS managed provider has been
    // failing in the last window, skip every model for it and fall through
    // to the next provider in the chain. This gives the upstream room to
    // recover without us hammering it from every edge function instance.
    //
    // Cache the breaker state per provider for the duration of THIS request
    // so we don't pay a DB round-trip before every model attempt — one read
    // per provider per request is enough to make the routing decision.
    if (!(provider in breakerOpenCache)) {
      // AI-3: parse-retry must NOT pay a second breaker decision — treat
      // the breaker as closed for this attempt; the parent's decision
      // already governed whether the call should proceed at all.
      breakerOpenCache[provider] = suppressBreakerAccounting ? false : await isBreakerOpen(breakerKey);
    }
    if (breakerOpenCache[provider]) {
      console.warn(`[AI] WiseResume breaker open for ${breakerKey} — skipping ${model}`);
      attemptLog.push({ provider, model, outcome: 'breaker_open', ms: 0 });
      // Skip all remaining models for this provider in one step so we
      // don't waste cycles iterating through a known-open breaker.
      while (i + 1 < totalAttempts && attempts[i + 1].provider === provider) {
        i++;
        attemptLog.push({ provider, model: attempts[i].model, outcome: 'breaker_open', ms: 0 });
      }
      continue;
    }

    const attemptStart = Date.now();
    console.log(`[AI] WiseResume attempt ${i + 1}/${totalAttempts}: ${provider} → ${model} (budget left: ${remaining}ms, attempt cap: ${effectiveTimeoutMs}ms)`);
    try {
      const result =
        provider === 'openrouter' ? await tryOpenRouterModel(model, effectiveTimeoutMs) :
        provider === 'openrouter2' ? await tryOpenRouter2Model(model, effectiveTimeoutMs) :
        await tryGroqModel(model, effectiveTimeoutMs);
      const successMs = Date.now() - attemptStart;
      console.log(`[AI] WiseResume success: ${provider} → ${model} in ${successMs}ms (after ${i} prior attempts)`);
      attemptLog.push({ provider, model, outcome: 'success', ms: successMs });
      // Reset the breaker for this provider on any success — even a single
      // healthy reply is enough evidence the upstream is back.
      // Fire-and-forget: telemetry must not block returning the AI result.
      // recordBreakerEvent already swallows its own errors (fail-open).
      // AI-3: skip on parse-retry so the pair counts as one combined event.
      if (!suppressBreakerAccounting) {
        void recordBreakerEvent(breakerKey, true);
      }
      return result;
    } catch (err) {
      // Count this attempt against the breaker (auth/payment errors excluded).
      // Fire-and-forget so the next retry can start immediately instead of
      // waiting on a DB round-trip in the failure path.
      // AI-3: skip on parse-retry so the pair counts as one combined event.
      if (!suppressBreakerAccounting && shouldCountAsBreakerFailure(err)) {
        void recordBreakerEvent(breakerKey, false);
      }
      const elapsed = Date.now() - attemptStart;
      lastError = err;
      const reason = err instanceof Error ? err.message : String(err);

      // Classify outcome for telemetry
      let outcome = 'error';
      if (err instanceof DOMException && err.name === 'AbortError') outcome = 'timeout';
      else if (isAIError(err)) outcome = `${err.type}${err.status ? ' ' + err.status : ''}`;
      else if (err instanceof Error) outcome = err.message.slice(0, 80);
      attemptLog.push({ provider, model, outcome, ms: elapsed });

      // Self-heal the managed model cache: a 404 or "model not found /
      // decommissioned / deprecated" error means our cached snapshot of the
      // provider's /models list is stale (e.g. OpenRouter pulled a free model
      // overnight). Drop the cache so the next request refetches the live list
      // instead of marching through the same dead slug for the rest of the
      // process lifetime.
      const isModelGone =
        (isAIError(err) && err.status === 404) ||
        /model.{0,20}(not found|decommissioned|deprecated|removed|unavailable)|no such model|invalid_model/i.test(reason);
      if (isModelGone) {
        if (provider === 'openrouter') invalidateOpenRouterModelCache();
        else if (provider === 'groq') invalidateGroqModelCache();
      }

      // If the outer signal was aborted (user-level cancel), propagate immediately.
      if (outerSignal?.aborted) {
        console.warn(`[AI] WiseResume outer signal aborted after attempt ${i + 1}. Stopping.`);
        throw err;
      }

      // Per-model timeout (AbortError from per-model controller) is skippable —
      // the next model gets its own fresh PER_MODEL_TIMEOUT_MS window.
      const isPerModelTimeout = err instanceof DOMException && err.name === 'AbortError';

      // Determine whether a next attempt exists on a *different* provider.
      // Look ahead across ALL remaining attempts, not just i+1, so that a hard
      // error on the FIRST openrouter model (e.g. 402 credits exhausted) can
      // still cross over to openrouter2 / groq later in the chain. Without
      // this look-ahead, auto mode bailed out on the very first attempt and
      // never reached the secondary OpenRouter account or Groq fallback.
      let nextDifferentProviderIdx = -1;
      for (let j = i + 1; j < totalAttempts; j++) {
        if (attempts[j].provider !== provider) {
          nextDifferentProviderIdx = j;
          break;
        }
      }
      const canCrossProvider = isAutoMode && nextDifferentProviderIdx !== -1;
      // For hard errors (auth/payment), retrying the SAME provider's other
      // models is hopeless — the same key/account will fail the same way.
      // Jump straight to the next provider in the auto chain instead of
      // wasting attempts on identical failures.
      const isHardProviderError =
        isAIError(err) && (err.type === 'invalid_key' || err.type === 'payment_required');
      if (isHardProviderError && canCrossProvider) {
        console.warn(`[AI] WiseResume attempt ${i + 1}/${totalAttempts} (${provider}/${model}) hard ${err.type}: ${reason}. Skipping remaining ${provider} models, jumping to ${attempts[nextDifferentProviderIdx].provider}.`);
        // Mark all skipped same-provider entries in the telemetry trail.
        for (let j = i + 1; j < nextDifferentProviderIdx; j++) {
          attemptLog.push({ provider: attempts[j].provider, model: attempts[j].model, outcome: `skipped_${err.type}`, ms: 0 });
        }
        i = nextDifferentProviderIdx - 1; // loop will ++ to nextDifferentProviderIdx
        continue;
      }

      if (isPerModelTimeout || isSkippableError(err) || canCrossProvider) {
        console.warn(`[AI] WiseResume attempt ${i + 1}/${totalAttempts} (${provider}/${model}) skippable: ${reason}. Trying next.`);
        continue;
      }

      // Hard error AND no other provider available — abort (the user must
      // fix the key/credits; retrying the same provider's other models is
      // pointless).
      console.error(`[AI] WiseResume attempt ${i + 1}/${totalAttempts} (${provider}/${model}) hard error with no cross-provider option: ${reason}`);
      throw err;
    }
  }

  // Build a compact, human-readable summary of what was tried so the client
  // can render a useful error card instead of a generic "AI temporarily busy".
  const summary = attemptLog
    .map(a => `${a.provider}/${a.model}=${a.outcome}(${a.ms}ms)`)
    .join('; ');
  console.error(`[AI] WiseResume: all models exhausted. Attempts: ${summary}. Last error:`, lastError instanceof Error ? lastError.message : lastError);
  // Keep the user-facing message short and friendly. Detailed attempt
  // telemetry rides on the error's `attempts` field below so the client
  // can render it in a debug detail row, while everyday users still see
  // a clean message in the chat error card.
  const busyError = createAIError(
    'provider_busy',
    'AI is temporarily busy — please try again in a moment.',
    503,
  );
  // Attach structured attempt telemetry to the error for callers that want
  // to forward it in their JSON response (chat error card, etc.).
  (busyError as Error & { attempts?: typeof attemptLog }).attempts = attemptLog;
  throw busyError;
}

/**
 * Calls Vertex AI Express (aiplatform.googleapis.com) with native Gemini format.
 * Converts OpenAI-style messages to native Gemini contents/systemInstruction.
 */
async function callGeminiDirect(
  apiKey: string,
  model: string,
  messages: AIMessage[],
  temperature: number,
  maxTokens?: number,
  tools?: AITool[],
  toolChoice?: { type: 'function'; function: { name: string } } | 'auto',
  signal?: AbortSignal
): Promise<AIResponse> {
  const geminiModel = mapModelForGemini(model);
  console.log(`[AI] callGeminiDirect (Vertex): input model="${model}" → mapped="${geminiModel}"`);

  const systemMessages = messages.filter(m => m.role === 'system');
  const nonSystemMessages = messages.filter(m => m.role !== 'system');

  const contents = nonSystemMessages.map(m => {
    const msg = m as any;
    if (msg.role === 'function' || msg.role === 'tool') {
      return {
        role: 'user',
        parts: [{
          functionResponse: {
            name: msg.name || 'function',
            response: { content: msg.content },
          },
        }],
      };
    }
    if (msg.role === 'assistant' && msg.tool_calls) {
      return {
        role: 'model',
        parts: msg.tool_calls.map((tc: any) => {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.function?.arguments || '{}');
          } catch {
            args = { _raw: tc.function?.arguments || '' };
          }
          return {
            functionCall: {
              name: tc.function?.name || 'function',
              args,
            },
          };
        }),
      };
    }
    return {
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    };
  });

  const body: Record<string, unknown> = {
    contents,
    generationConfig: { temperature },
  };

  if (systemMessages.length > 0) {
    body.systemInstruction = {
      parts: [{ text: systemMessages.map(m => m.content).join('\n\n') }],
    };
  }

  if (maxTokens) {
    (body.generationConfig as Record<string, unknown>).maxOutputTokens = maxTokens;
  }

  if (tools && tools.length > 0) {
    body.tools = [{
      functionDeclarations: tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
    }];
    if (toolChoice && typeof toolChoice === 'object' && toolChoice.type === 'function') {
      body.toolConfig = {
        functionCallingConfig: {
          mode: 'ANY',
          allowedFunctionNames: [toolChoice.function.name],
        },
      };
    }
  }

  // Google Generative Language API (Gemini API) — the standard endpoint for simple API keys.
  // API keys from both Google AI Studio and Cloud Console (with Generative Language API enabled)
  // work here. Note: aiplatform.googleapis.com requires OAuth2/service accounts, not API keys.
  //
  // AI-5: authenticate via the documented `x-goog-api-key` request header
  // instead of the `?key=…` URL query parameter. The query-string form
  // would have leaked into Deno-constructed `TypeError`/`AbortError`
  // `.message` strings on network errors and propagated all the way into
  // the JSON envelope returned to the browser.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;
  console.log(`[AI] Calling Gemini API: ${url} (model: ${geminiModel})`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    handleGeminiError(response.status, await response.text());
  }

  const data = await response.json();
  return parseVertexResponse(data);
}

/**
 * Parses Vertex AI native response into our AIResponse type
 */
function parseVertexResponse(data: any): AIResponse {
  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw createAIError('unknown', 'No response from AI', 500);
  }

  const parts = candidate.content?.parts || [];
  const textParts = parts.filter((p: any) => p.text).map((p: any) => p.text);
  const functionCallParts = parts.filter((p: any) => p.functionCall);

  const toolCalls = functionCallParts.length > 0
    ? functionCallParts.map((p: any, i: number) => ({
        id: `call_${i}`,
        type: 'function' as const,
        function: {
          name: p.functionCall.name,
          arguments: JSON.stringify(p.functionCall.args || {}),
        },
      }))
    : undefined;

  return {
    content: textParts.length > 0 ? textParts.join('') : null,
    toolCalls,
    usage: data.usageMetadata ? {
      promptTokens: data.usageMetadata.promptTokenCount || 0,
      completionTokens: data.usageMetadata.candidatesTokenCount || 0,
    } : undefined,
  };
}

/**
 * Parses OpenAI-format response into our AIResponse type (used by Ollama path)
 */
function parseOpenAIResponse(data: any): AIResponse {
  const choice = data.choices?.[0];
  if (!choice) {
    throw createAIError('unknown', 'No response from AI', 500);
  }

  const message = choice.message;

  return {
    content: message.content,
    toolCalls: message.tool_calls?.map((tc: any) => ({
      id: tc.id,
      type: tc.type,
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments,
      },
    })),
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
    } : undefined,
  };
}

/**
 * Handles errors from Vertex AI / Gemini API calls
 */
function handleGeminiError(status: number, errorText: string): never {
  // AI-5: scrub upstream error text before logging (provider envelopes
  // sometimes echo the request body or the API key) and cap the
  // user-visible message at 100 chars so a leaked secret cannot fit even
  // if a future redactor pattern misses a novel shape.
  console.error('Vertex AI error:', status, scrubSecrets(errorText));

  let errorMessage = 'AI request failed';
  try {
    const parsed = JSON.parse(errorText);
    errorMessage = parsed.error?.message || errorMessage;
  } catch {
    // Use raw error text
  }
  errorMessage = scrubAndCap(errorMessage);

  const lower = errorText.toLowerCase();
  if (status === 401 || status === 403 || (status === 400 && (lower.includes('api_key_invalid') || lower.includes('permission_denied') || lower.includes('api key not valid')))) {
    throw createAIError('invalid_key', 'Invalid API key. Please check your settings.', 422);
  }
  if (status === 404) {
    throw createAIError('unknown', `Model not found: ${errorMessage}. Check your selected model in AI Settings.`, 404);
  }
  if (status === 429) {
    if (errorText.includes('RESOURCE_EXHAUSTED') || errorText.includes('quota')) {
      throw createAIError('quota_exceeded', 'Daily quota exceeded. Try again tomorrow or use a paid key.', 429);
    }
    throw createAIError('rate_limit', 'Too many requests. Please wait a moment.', 429);
  }
  if (status >= 500 && status < 600) {
    throw createAIError('upstream_5xx', `Gemini upstream error (${status}). Please try again.`, status);
  }

  throw createAIError('unknown', errorMessage, status);
}

// handleEmergentError removed — Emergent Universal API no longer used.

/**
 * Creates a typed AI error
 */
function createAIError(type: AIError['type'], message: string, status: number): AIError & Error {
  const error = new Error(message) as Error & AIError;
  error.type = type;
  error.status = status;
  return error;
}

/**
 * Helper to check if an error is an AI error
 */
export function isAIError(error: unknown): error is AIError {
  return error instanceof Error && 'type' in error && 'status' in error;
}

/**
 * Maps raw errors to user-friendly error responses for edge functions.
 * Returns { status, error, message } suitable for JSON responses.
 */
export function toUserError(error: unknown): { status: number; error: string; message: string } {
  if (isAIError(error)) {
    const map: Record<string, string> = {
      rate_limit: 'Rate limit reached. Please try again in a moment.',
      provider_busy: 'AI is temporarily busy — please try again in a moment.',
      payment_required: 'AI credits exhausted. Please try again later or use your own API key.',
      invalid_key: 'Invalid API key. Please check your settings.',
      quota_exceeded: 'Daily quota exceeded. Try again tomorrow or use a different API key.',
      network: 'Network error communicating with AI. Please try again.',
    };
    return {
      status: error.status,
      error: error.type,
      message: map[error.type] || error.message || 'AI request failed. Please try again.',
    };
  }

  // Explicit mapping for AuthError (or duck-typed auth failures)
  if (
    (error instanceof Error && (error.name === 'AuthError' || (error as any).status === 401)) ||
    (typeof error === 'object' && error !== null && (error as any).status === 401)
  ) {
    const msg = error instanceof Error ? error.message : ((error as any).message || 'Unauthorized');
    return {
      status: 401,
      error: 'unauthorized',
      message: msg,
    };
  }

  // For non-AI errors, log full detail (still scrubbed — Deno-constructed
  // TypeError/AbortError messages quote the request URL verbatim, which
  // for Gemini used to embed the API key as ?key=…) and surface a short,
  // already-redacted diagnostic to the client.
  //
  // AI-5: every diag string is run through scrubSecrets() before reaching
  // either stderr or the JSON envelope. The cap (100 chars) is the same
  // bound used for upstream provider error text so a leaked secret cannot
  // fit even if a future redactor pattern misses a novel shape.
  console.error('[toUserError] Internal error:', error instanceof Error ? `${error.name}: ${scrubSecrets(error.message)}` : scrubSecrets(JSON.stringify(error)));
  let diag = 'unknown';
  if (error instanceof Error) {
    const cls = error.name || 'Error';
    const msg = scrubAndCap(error.message);
    diag = msg ? `${cls}: ${msg}` : cls;
  } else if (typeof error === 'string') {
    diag = scrubAndCap(error);
  } else if (error && typeof error === 'object') {
    try {
      diag = scrubAndCap(JSON.stringify(error));
    } catch {
      diag = Object.prototype.toString.call(error);
    }
  }
  return {
    status: 500,
    error: 'internal',
    message: `Something went wrong: ${diag}`,
  };
}

/**
 * When a model returns structured data as text content instead of a proper tool
 * call (common with smaller free models), reconstruct a synthetic tool call so
 * that all downstream edge-function parsers work without modification.
 *
 * Only fires when:
 *  - The response has no tool calls
 *  - The response has non-empty content
 *  - toolChoice is a specific function (not 'auto')
 *  - The content parses to valid JSON
 */
function normalizeToolCallResponse(
  response: AIResponse,
  toolChoice?: AICallOptions['toolChoice'],
): AIResponse {
  if (response.toolCalls?.length) return response;
  if (!response.content?.trim()) return response;
  if (!toolChoice || toolChoice === 'auto' || typeof toolChoice !== 'object') return response;

  const parsed = parseAIJSON(response.content);
  if (!parsed) return response;

  console.log(`[AI] normalizeToolCallResponse: reconstructed tool call "${toolChoice.function.name}" from content JSON`);
  return {
    ...response,
    toolCalls: [{
      id: 'call_content_0',
      type: 'function' as const,
      function: {
        name: toolChoice.function.name,
        arguments: JSON.stringify(parsed),
      },
    }],
    content: null,
  };
}

/**
 * Robust JSON extraction from AI response text.
 * Tries direct parse first, then regex extraction.
 */
export function parseAIJSON<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text.trim()) as T;
  } catch {
    // Fall through
  }

  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim()) as T;
    } catch {
      // Fall through
    }
  }

  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]) as T;
    } catch {
      // Fall through
    }
  }

  return null;
}

/**
 * Parses JSON from an AI response, with one automatic retry on malformed output.
 *
 * If `parseAIJSON` fails to extract valid JSON from `text`, this function makes
 * a single additional AI call with a corrective prompt asking the model to return
 * only valid JSON.  If the retry also fails to parse, `null` is returned — no
 * infinite loops.
 *
 * @param text          The raw AI response text to parse.
 * @param retryOptions  AI call options (model, userId, etc.) used for the retry
 *                      call.  The `messages` field is overridden internally.
 */
export async function parseAIJSONWithRetry<T = unknown>(
  text: string,
  retryOptions: Omit<AICallOptions, 'messages'>,
): Promise<T | null> {
  const first = parseAIJSON<T>(text);
  if (first !== null) return first;

  console.warn('[parseAIJSONWithRetry] Initial JSON parse failed — attempting corrective retry');

  try {
    // AI-3: route through callAIInternal with suppressBreakerAccounting=true.
    // The parent AI call (made by the endpoint that produced `text`) already
    // paid one breaker decision and recorded one outcome event; the parse-
    // corrective retry must NOT add a second of either. The user-visible
    // action is one logical AI request, so it must spend exactly one breaker
    // acquire and produce exactly one combined outcome event for the pair.
    const retryResponse = await callAIInternal({
      ...retryOptions,
      messages: [
        {
          role: 'user',
          content: `The following text was supposed to be valid JSON but could not be parsed. Return ONLY the corrected valid JSON with no markdown, no code blocks, and no explanation.\n\n${text}`,
        },
      ],
      temperature: 0,
    }, { suppressBreakerAccounting: true });

    if (!retryResponse.content) {
      console.error('[parseAIJSONWithRetry] Retry returned no content');
      return null;
    }

    const retried = parseAIJSON<T>(retryResponse.content);
    if (retried === null) {
      console.error('[parseAIJSONWithRetry] Retry response still not valid JSON:', retryResponse.content.slice(0, 500));
    }
    return retried;
  } catch (err) {
    console.error('[parseAIJSONWithRetry] Retry AI call failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
