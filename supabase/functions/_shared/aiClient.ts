/**
 * Shared AI Client for Edge Functions
 * WiseResume AI: OpenRouter (Gemma 4, free) + Groq (Llama 3.3, free) with auto-fallback.
 * Also supports user BYOK keys: Gemini, Ollama, OpenRouter.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getServiceClient } from './dbClient.ts';

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
  /** WiseResume AI sub-provider: 'openrouter' (Gemma 4), 'groq' (Llama 3.3), or 'auto' (try both) */
  wiseresumeSubProvider?: 'openrouter' | 'groq' | 'auto';
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
  type: 'rate_limit' | 'payment_required' | 'invalid_key' | 'quota_exceeded' | 'network' | 'unknown';
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
  if (MODEL_MAPPING[model]) return MODEL_MAPPING[model];
  if (model.startsWith('google/')) {
    const stripped = model.replace('google/', '');
    return MODEL_MAPPING[stripped] || stripped;
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
 * Decrypts an encrypted key using the provided PBKDF2 salt.
 * Pass the static v1 salt or the per-user v2 salt depending on key_version.
 */
async function decryptKeyWithSalt(encoded: string, salt: string): Promise<string> {
  const key = await deriveDecryptionKey(salt);
  const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

/** Resolves the correct PBKDF2 salt based on key_version and userId. */
function resolveKeySalt(keyVersion: number | null | undefined, userId: string): string {
  if (keyVersion === 2) return `user-api-keys-salt-v2-${userId}`;
  return 'user-api-keys-salt';
}

/**
 * Fetches a user's API key from the database (decrypted).
 * Supports v1 (static salt) and v2 (per-user salt) encryption.
 * Uses the service role key to bypass RLS.
 */
export async function getUserKeyFromDB(userId: string, provider = 'gemini'): Promise<string | undefined> {
  if (!ENCRYPTION_SECRET) {
    console.warn('[aiClient] API_KEY_ENCRYPTION_SECRET not set — cannot decrypt user BYOK keys. Falling back to global key.');
    return undefined;
  }

  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('user_api_keys')
      .select('encrypted_key, key_version')
      .eq('user_id', userId)
      .eq('provider', provider)
      .maybeSingle();

    if (error || !data?.encrypted_key) return undefined;
    const salt = resolveKeySalt(data.key_version, userId);
    return await decryptKeyWithSalt(data.encrypted_key, salt);
  } catch (err) {
    console.warn('[aiClient] Failed to fetch user key from DB:', err);
    return undefined;
  }
}

/**
 * Fetches a user's API key + base_url from the database (decrypted).
 * Supports v1 (static salt) and v2 (per-user salt) encryption.
 */
export async function getUserKeyAndUrlFromDB(userId: string, provider: string): Promise<{ key: string; baseUrl: string | null; model: string | null } | undefined> {
  if (!ENCRYPTION_SECRET) return undefined;

  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('user_api_keys')
      .select('encrypted_key, base_url, model, key_version')
      .eq('user_id', userId)
      .eq('provider', provider)
      .maybeSingle();

    if (error || !data?.encrypted_key) return undefined;
    const salt = resolveKeySalt(data.key_version, userId);
    const key = await decryptKeyWithSalt(data.encrypted_key, salt);
    return { key, baseUrl: data.base_url ?? null, model: data.model ?? null };
  } catch (err) {
    console.warn('[aiClient] Failed to fetch user key from DB:', err);
    return undefined;
  }
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

/**
 * Reads the global WiseResume AI engine setting from app_settings table.
 * Returns 'openrouter', 'groq', 'auto', or 'auto' as default.
 * Admin-controlled; users cannot override this.
 */
async function getGlobalAIEngine(): Promise<'openrouter' | 'groq' | 'auto'> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'wiseresume_ai_engine')
      .maybeSingle();
    if (error || !data?.value) return 'auto';
    const val = data.value as string;
    if (val === 'openrouter' || val === 'groq' || val === 'auto') return val;
    return 'auto';
  } catch (err) {
    console.warn('[aiClient] Failed to fetch global AI engine setting:', err);
    return 'auto';
  }
}

/**
 * Calls AI API routing through WiseResume AI (OpenRouter/Groq) or user BYOK keys.
 * Priority: BYOK OpenRouter → BYOK Ollama → BYOK Gemini → WiseResume AI (managed) → legacy GEMINI_API_KEY
 */
export async function callAI(options: AICallOptions): Promise<AIResponse> {
  const { model, messages, temperature = 0.7, maxTokens, tools, toolChoice, userId, timeout = 30_000 } = options;

  const openrouterManagedKey = Deno.env.get('OPENROUTER_API_KEY');
  const groqManagedKey = Deno.env.get('GROQ_API_KEY');
  const globalGeminiKey = Deno.env.get('GEMINI_API_KEY');
  const hasManagedAI = !!(openrouterManagedKey || groqManagedKey);

  let userGeminiData: { key: string; model: string | null } | undefined;
  let userOllamaData: { key: string; baseUrl: string | null; model: string | null } | undefined;
  let userOpenRouterData: { key: string; baseUrl: string | null; model: string | null } | undefined;
  let userByokData: { key: string; model: string | null; provider: string } | undefined;
  let wiseresumeSubProvider: 'openrouter' | 'groq' | 'auto' = options.wiseresumeSubProvider || 'auto';

  if (userId) {
    const preferredProvider = options.preferredProvider || await getUserPreferredProvider(userId);

    if (preferredProvider === 'ollama') {
      userOllamaData = await getUserKeyAndUrlFromDB(userId, 'ollama');
    } else if (preferredProvider === 'openrouter') {
      userOpenRouterData = await getUserKeyAndUrlFromDB(userId, 'openrouter');
    } else if (preferredProvider === 'gemini') {
      const geminiData = await getUserKeyAndUrlFromDB(userId, 'gemini');
      if (geminiData) userGeminiData = { key: geminiData.key, model: geminiData.model };
    } else if (preferredProvider && (OPENAI_COMPAT_BASE_URLS[preferredProvider] || preferredProvider === 'anthropic')) {
      // New BYOK providers: OpenAI, Anthropic, Groq (BYOK), Mistral, xAI, Cohere
      const data = await getUserKeyAndUrlFromDB(userId, preferredProvider);
      if (data) userByokData = { key: data.key, model: data.model, provider: preferredProvider };
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
        console.warn(`[AI] ${provider} BYOK failed, falling back to WiseResume AI:`, err instanceof Error ? err.message : err);
        if (hasManagedAI) {
          const fallbackController = new AbortController();
          const fallbackTimeout = setTimeout(() => fallbackController.abort(), timeout);
          try {
            const res = await callWiseresumeAI('auto', messages, temperature, maxTokens, tools, toolChoice, fallbackController.signal);
            return { ...res, fallbackUsed: true, fallbackReason: `${provider}_error`, providerUsed: 'wiseresume_fallback' };
          } finally {
            clearTimeout(fallbackTimeout);
          }
        }
        throw err;
      }
    }

    // Priority 0: User BYOK OpenRouter key
    if (userOpenRouterData) {
      const orModel = userOpenRouterData.model || model;
      if (!orModel) {
        throw createAIError('invalid_key', 'No OpenRouter model selected. Please choose a model in AI Settings.', 400);
      }
      console.log('[AI] Using user BYOK OpenRouter key, model:', orModel);
      try {
        const res = await callOpenRouterDirect(userOpenRouterData.key, orModel, messages, temperature, maxTokens, tools, toolChoice, controller.signal);
        return { ...res, providerUsed: 'openrouter' };
      } catch (err) {
        console.warn('[AI] OpenRouter BYOK failed, falling back to WiseResume AI:', err instanceof Error ? err.message : err);
        if (hasManagedAI) {
          const fallbackController = new AbortController();
          const fallbackTimeout = setTimeout(() => fallbackController.abort(), timeout);
          try {
            const res = await callWiseresumeAI('auto', messages, temperature, maxTokens, tools, toolChoice, fallbackController.signal);
            return { ...res, fallbackUsed: true, fallbackReason: 'openrouter_error', providerUsed: 'wiseresume_fallback' };
          } finally {
            clearTimeout(fallbackTimeout);
          }
        }
        throw err;
      }
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
        console.warn('[AI] Ollama BYOK failed, falling back to WiseResume AI:', err instanceof Error ? err.message : err);
        if (hasManagedAI) {
          const fallbackController = new AbortController();
          const fallbackTimeout = setTimeout(() => fallbackController.abort(), timeout);
          try {
            const res = await callWiseresumeAI('auto', messages, temperature, maxTokens, tools, toolChoice, fallbackController.signal);
            return { ...res, fallbackUsed: true, fallbackReason: 'ollama_error', providerUsed: 'wiseresume_fallback' };
          } finally {
            clearTimeout(fallbackTimeout);
          }
        }
        throw err;
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
        const errDetail = err instanceof Error ? `${err.message} (type=${(err as any)?.type}, status=${(err as any)?.status})` : String(err);
        console.warn('[AI] Gemini BYOK failed, falling back to WiseResume AI:', errDetail);
        const fallbackReason = (err as any)?.type === 'quota_exceeded' ? 'quota_exceeded'
          : (err as any)?.type === 'invalid_key' ? 'invalid_key'
          : (err as any)?.type === 'rate_limit' ? 'rate_limit'
          : (err instanceof Error && err.message?.includes('not found')) ? 'model_not_found'
          : 'gemini_error';
        if (hasManagedAI) {
          const fallbackController = new AbortController();
          const fallbackTimeout = setTimeout(() => fallbackController.abort(), timeout);
          try {
            const res = await callWiseresumeAI('auto', messages, temperature, maxTokens, tools, toolChoice, fallbackController.signal);
            return { ...res, fallbackUsed: true, fallbackReason, providerUsed: 'wiseresume_fallback' };
          } finally {
            clearTimeout(fallbackTimeout);
          }
        }
        throw err;
      }
    }

    // Priority 3: WiseResume AI managed (OpenRouter + Groq)
    if (hasManagedAI) {
      console.log('[AI] Using WiseResume AI (sub-provider:', wiseresumeSubProvider, ')');
      const res = await callWiseresumeAI(wiseresumeSubProvider, messages, temperature, maxTokens, tools, toolChoice, controller.signal);
      return { ...normalizeToolCallResponse(res, toolChoice), providerUsed: res.providerUsed || 'wiseresume' };
    }

    // Priority 4: Legacy GEMINI_API_KEY fallback
    if (globalGeminiKey) {
      console.log('[AI] Using legacy GEMINI_API_KEY for model:', model);
      const res = await callGeminiDirect(globalGeminiKey, model, messages, temperature, maxTokens, tools, toolChoice, controller.signal);
      return { ...res, providerUsed: 'gemini_global' };
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
/** Last-resort fallback slug used only if dynamic model discovery returns empty. */
const FALLBACK_MODEL = 'google/gemma-4-26b-a4b-it:free';

// ============= Dynamic Model Discovery (cached per cold-start) =============

/**
 * Cache for OpenRouter free models, populated once per edge function cold-start.
 * Keyed by OPENROUTER_API_KEY to invalidate if the key changes (unlikely in practice).
 */
let _openrouterModelCache: string[] | null = null;
let _openrouterCacheKey: string | null = null;

/**
 * Fetches and ranks free models from OpenRouter.
 * Returns a list of model slugs ordered by context window (desc), then parameter count (desc).
 * Results are cached for the lifetime of the edge function cold-start.
 */
async function getOpenRouterFreeModels(apiKey: string): Promise<string[]> {
  if (_openrouterModelCache !== null && _openrouterCacheKey === apiKey) {
    return _openrouterModelCache;
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('[AI] OpenRouter model list fetch failed:', response.status);
      _openrouterModelCache = [FALLBACK_MODEL];
      _openrouterCacheKey = apiKey;
      return _openrouterModelCache;
    }

    const json = await response.json() as { data?: Array<{ id: string; context_length?: number; pricing?: { prompt?: string; completion?: string } }> };
    const models = (json.data || [])
      .filter(m => m.pricing?.prompt === '0' && m.pricing?.completion === '0')
      .map(m => ({
        id: m.id,
        contextLength: m.context_length || 0,
        paramCount: extractParamCount(m.id),
      }))
      .sort((a, b) => {
        if (b.contextLength !== a.contextLength) return b.contextLength - a.contextLength;
        return b.paramCount - a.paramCount;
      })
      .map(m => m.id);

    if (models.length === 0) {
      console.warn('[AI] OpenRouter returned no free models; using fallback constant');
      models.push(FALLBACK_MODEL);
    }

    console.log(`[AI] OpenRouter free models discovered (${models.length}):`, models.slice(0, 5).join(', '));
    _openrouterModelCache = models;
    _openrouterCacheKey = apiKey;
    return models;
  } catch (err) {
    console.warn('[AI] Failed to fetch OpenRouter model list:', err instanceof Error ? err.message : err);
    _openrouterModelCache = [FALLBACK_MODEL];
    _openrouterCacheKey = apiKey;
    return _openrouterModelCache;
  }
}

/**
 * Cache for Groq models, populated once per cold-start.
 */
let _groqModelCache: string[] | null = null;
let _groqCacheKey: string | null = null;

/**
 * Known-good Groq chat-completion models ranked by capability (largest/best first).
 * Only well-known LLMs that support chat completions are listed here.
 * This list acts as both a filter and a ranking: only IDs in this list are
 * included in the discovered model set, which prevents incompatible or
 * non-chat-capable model IDs from being tried.
 */
const GROQ_KNOWN_CHAT_MODELS: Array<{ id: string; paramCount: number; contextWindow: number }> = [
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
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('[AI] Groq model list fetch failed:', response.status);
      _groqModelCache = ['llama-3.3-70b-versatile'];
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
      models.push('llama-3.3-70b-versatile');
    }

    console.log(`[AI] Groq chat models discovered (${models.length}):`, models.slice(0, 5).join(', '));
    _groqModelCache = models;
    _groqCacheKey = apiKey;
    return models;
  } catch (err) {
    console.warn('[AI] Failed to fetch Groq model list:', err instanceof Error ? err.message : err);
    _groqModelCache = ['llama-3.3-70b-versatile'];
    _groqCacheKey = apiKey;
    return _groqModelCache;
  }
}

/**
 * Extracts a rough parameter count from a model slug for ranking purposes.
 * e.g. "google/gemma-4-26b-a4b-it:free" → 26, "meta/llama-3.3-70b..." → 70.
 */
function extractParamCount(slug: string): number {
  const match = slug.match(/(\d+)b/i);
  return match ? parseInt(match[1], 10) : 0;
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (isAIError(error)) {
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

  // All retries failed — try fallback model
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
  // Normalize base URL
  const cleanUrl = baseUrl.replace(/\/+$/, '');
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

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Ollama API error:', response.status, errorText);

    let errorMessage = 'Ollama request failed';
    try {
      const parsed = JSON.parse(errorText);
      errorMessage = parsed.error?.message || parsed.error || errorMessage;
    } catch {}

    if (response.status === 401 || response.status === 403) {
      throw createAIError('invalid_key', 'Invalid Ollama API key. Please check your settings.', 422);
    }
    if (response.status === 429) {
      throw createAIError('rate_limit', 'Ollama rate limit reached. Please wait.', 429);
    }
    throw createAIError('unknown', errorMessage, response.status);
  }

  const data = await response.json();

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
    console.error('OpenRouter API error:', response.status, errorText);

    let errorMessage = 'OpenRouter request failed';
    try {
      const parsed = JSON.parse(errorText);
      errorMessage = parsed.error?.message || parsed.error || errorMessage;
    } catch {}

    if (response.status === 401 || response.status === 403) {
      throw createAIError('invalid_key', 'Invalid OpenRouter API key. Please check your settings.', 422);
    }
    if (response.status === 429) {
      throw createAIError('rate_limit', 'OpenRouter rate limit reached. Please wait.', 429);
    }
    if (response.status === 402) {
      throw createAIError('payment_required', 'OpenRouter credits exhausted. Please add credits.', 402);
    }
    throw createAIError('unknown', errorMessage, response.status);
  }

  const data = await response.json();
  return parseOpenAIResponse(data);
}

/**
 * Base URLs for user BYOK OpenAI-compatible providers.
 */
const OPENAI_COMPAT_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
  xai: 'https://api.x.ai/v1/chat/completions',
  cohere: 'https://api.cohere.com/compatibility/v1/chat/completions',
};

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
    console.error(`${providerName} API error:`, response.status, errorText);
    let errorMessage = `${providerName} request failed`;
    try {
      const parsed = JSON.parse(errorText);
      errorMessage = parsed.error?.message || parsed.error || errorMessage;
    } catch {}
    if (response.status === 401 || response.status === 403) {
      throw createAIError('invalid_key', `Invalid ${providerName} API key. Please check your settings.`, 422);
    }
    if (response.status === 429) {
      throw createAIError('rate_limit', `${providerName} rate limit reached. Please wait.`, 429);
    }
    if (response.status === 402) {
      throw createAIError('payment_required', `${providerName} credits exhausted.`, 402);
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
    console.error('Anthropic API error:', response.status, errorText);
    let errorMessage = 'Anthropic request failed';
    try {
      const parsed = JSON.parse(errorText) as { error?: { message?: string } };
      errorMessage = parsed.error?.message || errorMessage;
    } catch {
      // Use raw error text as message
    }
    if (response.status === 401 || response.status === 403) {
      throw createAIError('invalid_key', 'Invalid Anthropic API key. Please check your settings.', 422);
    }
    if (response.status === 429) {
      throw createAIError('rate_limit', 'Anthropic rate limit reached. Please wait.', 429);
    }
    if (response.status === 402) {
      throw createAIError('payment_required', 'Anthropic credits exhausted.', 402);
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
 * @param model Groq model slug to use (defaults to llama-3.3-70b-versatile)
 */
async function callGroqDirect(
  apiKey: string,
  messages: AIMessage[],
  temperature: number,
  maxTokens?: number,
  tools?: AITool[],
  toolChoice?: { type: 'function'; function: { name: string } } | 'auto',
  signal?: AbortSignal,
  model = 'llama-3.3-70b-versatile'
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
    console.error('Groq API error:', response.status, errorText);

    let errorMessage = 'Groq request failed';
    try {
      const parsed = JSON.parse(errorText);
      errorMessage = parsed.error?.message || parsed.error || errorMessage;
    } catch {}

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
export async function callWiseresumeAI(
  subProvider: 'openrouter' | 'groq' | 'auto',
  messages: AIMessage[],
  temperature: number,
  maxTokens?: number,
  tools?: AITool[],
  toolChoice?: { type: 'function'; function: { name: string } } | 'auto',
  outerSignal?: AbortSignal
): Promise<AIResponse> {
  const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');
  const groqKey = Deno.env.get('GROQ_API_KEY');

  /** Per-model timeout: 20 s each — independent of the outer signal. */
  const PER_MODEL_TIMEOUT_MS = 20_000;

  /**
   * Try a single OpenRouter model by slug.
   * Uses its own AbortController so a timeout on one model does NOT abort the next.
   * The per-model controller is also linked to outerSignal: if the caller cancels
   * the whole operation we propagate the abort immediately.
   */
  const tryOpenRouterModel = async (model: string): Promise<AIResponse> => {
    const ctrl = new AbortController();
    const timerId = setTimeout(() => ctrl.abort(), PER_MODEL_TIMEOUT_MS);
    // Propagate outer cancellation
    const onOuterAbort = () => ctrl.abort();
    outerSignal?.addEventListener('abort', onOuterAbort);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterKey!}`,
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
        let errorMessage = 'OpenRouter request failed';
        try { const p = JSON.parse(errorText); errorMessage = p.error?.message || p.error || errorMessage; } catch {}
        if (response.status === 401 || response.status === 403) throw createAIError('invalid_key', 'WiseResume AI OpenRouter key is invalid.', response.status);
        if (response.status === 429) throw createAIError('rate_limit', `OpenRouter model ${model} rate limited.`, 429);
        if (response.status === 402) throw createAIError('payment_required', 'OpenRouter credits exhausted.', 402);
        throw createAIError('unknown', errorMessage, response.status);
      }
      const data = await response.json();
      return { ...parseOpenAIResponse(data), providerUsed: `wiseresume/openrouter:${model}` };
    } finally {
      clearTimeout(timerId);
      outerSignal?.removeEventListener('abort', onOuterAbort);
    }
  };

  /**
   * Try a single Groq model by slug.
   * Same per-model timeout approach as tryOpenRouterModel.
   */
  const tryGroqModel = async (model: string): Promise<AIResponse> => {
    const ctrl = new AbortController();
    const timerId = setTimeout(() => ctrl.abort(), PER_MODEL_TIMEOUT_MS);
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

  // Build the two chains based on subProvider setting
  const openrouterModels = (subProvider === 'openrouter' || subProvider === 'auto') && openrouterKey
    ? await getOpenRouterFreeModels(openrouterKey)
    : [];
  const groqModels = (subProvider === 'groq' || subProvider === 'auto') && groqKey
    ? await getGroqModels(groqKey)
    : [];

  // Priority order (per spec): OpenRouter ranked free models → Groq ranked models.
  // This applies in all auto-mode scenarios. Explicit sub-provider selections only
  // use the requested chain.
  type AttemptEntry = { provider: 'openrouter' | 'groq'; model: string };
  let attempts: AttemptEntry[];

  if (subProvider === 'openrouter') {
    attempts = openrouterModels.map(m => ({ provider: 'openrouter' as const, model: m }));
  } else if (subProvider === 'groq') {
    attempts = groqModels.map(m => ({ provider: 'groq' as const, model: m }));
  } else {
    // Auto mode: always OpenRouter first, then Groq as fallback (per spec)
    attempts = [
      ...openrouterModels.map(m => ({ provider: 'openrouter' as const, model: m })),
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

  for (let i = 0; i < totalAttempts; i++) {
    // If the outer signal was already aborted (e.g. user navigated away) stop now.
    if (outerSignal?.aborted) {
      throw createAIError('unknown', 'Request cancelled by caller.', 499);
    }

    const { provider, model } = attempts[i];
    console.log(`[AI] WiseResume attempt ${i + 1}/${totalAttempts}: ${provider} → ${model}`);
    try {
      const result = provider === 'openrouter'
        ? await tryOpenRouterModel(model)
        : await tryGroqModel(model);
      console.log(`[AI] WiseResume success: ${provider} → ${model}`);
      return result;
    } catch (err) {
      lastError = err;
      const reason = err instanceof Error ? err.message : String(err);

      // If the outer signal was aborted (user-level cancel), propagate immediately.
      if (outerSignal?.aborted) {
        console.warn(`[AI] WiseResume outer signal aborted after attempt ${i + 1}. Stopping.`);
        throw err;
      }

      // Per-model timeout (AbortError from per-model controller) is skippable —
      // the next model gets its own fresh 20 s window.
      const isPerModelTimeout = err instanceof DOMException && err.name === 'AbortError';

      // Determine whether a next attempt exists on a *different* provider
      const nextProvider = i + 1 < totalAttempts ? attempts[i + 1].provider : null;
      const canCrossProvider = isAutoMode && nextProvider !== null && nextProvider !== provider;

      if (isPerModelTimeout || isSkippableError(err) || canCrossProvider) {
        console.warn(`[AI] WiseResume attempt ${i + 1}/${totalAttempts} (${provider}/${model}) skippable: ${reason}. Trying next.`);
        continue;
      }

      // Hard error within the same provider chain — abort
      console.error(`[AI] WiseResume attempt ${i + 1}/${totalAttempts} (${provider}/${model}) hard error: ${reason}`);
      throw err;
    }
  }

  console.error('[AI] WiseResume: all models exhausted. Last error:', lastError instanceof Error ? lastError.message : lastError);
  // All models exhausted — surface as rate_limit so clients show a friendly message.
  throw lastError ?? createAIError('rate_limit', 'All WiseResume AI models are busy. Please try again in a moment.', 503);
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
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
  console.log(`[AI] Calling Gemini API: ${url.split('?')[0]} (model: ${geminiModel})`);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  console.error('Vertex AI error:', status, errorText);

  let errorMessage = 'AI request failed';
  try {
    const parsed = JSON.parse(errorText);
    errorMessage = parsed.error?.message || errorMessage;
  } catch {
    // Use raw error text
  }

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

  // For non-AI errors, return a safe generic message (don't leak internals)
  console.error('[toUserError] Internal error:', error);
  return {
    status: 500,
    error: 'internal',
    message: 'Something went wrong. Please try again.',
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
    const retryResponse = await callAI({
      ...retryOptions,
      messages: [
        {
          role: 'user',
          content: `The following text was supposed to be valid JSON but could not be parsed. Return ONLY the corrected valid JSON with no markdown, no code blocks, and no explanation.\n\n${text}`,
        },
      ],
      temperature: 0,
    });

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
