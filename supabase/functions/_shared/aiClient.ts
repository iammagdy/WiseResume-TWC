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
  'google/gemini-3-flash-preview': 'gemini-3-flash-preview',
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
const FALLBACK_MODEL = 'google/gemma-4-26b-a4b-it:free';

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
 * Model: llama-3.3-70b-versatile
 */
async function callGroqDirect(
  apiKey: string,
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

  const body: Record<string, unknown> = {
    model: 'llama-3.3-70b-versatile',
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
 * Routes to WiseResume AI managed backend: OpenRouter (Gemma 4) or Groq (Llama 3.3).
 * Auto mode: tries OpenRouter first, falls back to Groq.
 */
async function callWiseresumeAI(
  subProvider: 'openrouter' | 'groq' | 'auto',
  messages: AIMessage[],
  temperature: number,
  maxTokens?: number,
  tools?: AITool[],
  toolChoice?: { type: 'function'; function: { name: string } } | 'auto',
  signal?: AbortSignal
): Promise<AIResponse> {
  const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');
  const groqKey = Deno.env.get('GROQ_API_KEY');

  const tryOpenRouter = async (): Promise<AIResponse> => {
    if (!openrouterKey) throw new Error('OPENROUTER_API_KEY not set');
    console.log('[AI] WiseResume AI → OpenRouter (google/gemma-4-26b-a4b-it:free)');
    const extraHeaders: Record<string, string> = {
      'HTTP-Referer': 'https://resume.thewise.cloud',
      'X-Title': 'WiseResume',
    };
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openrouterKey}`,
      ...extraHeaders,
    };
    const body: Record<string, unknown> = {
      model: 'google/gemma-4-26b-a4b-it:free',
      messages,
      temperature,
    };
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
      console.error('WiseResume OpenRouter error:', response.status, errorText);
      let errorMessage = 'OpenRouter request failed';
      try { const p = JSON.parse(errorText); errorMessage = p.error?.message || p.error || errorMessage; } catch {}
      if (response.status === 401 || response.status === 403) throw createAIError('invalid_key', 'WiseResume AI OpenRouter key is invalid.', 422);
      if (response.status === 429) throw createAIError('rate_limit', 'WiseResume AI rate limited. Please try again shortly.', 429);
      throw createAIError('unknown', errorMessage, response.status);
    }
    const data = await response.json();
    return { ...parseOpenAIResponse(data), providerUsed: 'wiseresume' };
  };

  const tryGroq = async (): Promise<AIResponse> => {
    if (!groqKey) throw new Error('GROQ_API_KEY not set');
    console.log('[AI] WiseResume AI → Groq (llama-3.3-70b-versatile)');
    const res = await callGroqDirect(groqKey, messages, temperature, maxTokens, tools, toolChoice, signal);
    return { ...res, providerUsed: 'wiseresume' };
  };

  if (subProvider === 'openrouter') {
    return await tryOpenRouter();
  }
  if (subProvider === 'groq') {
    return await tryGroq();
  }

  // Auto mode: prefer Groq when tool calling is requested (Llama 3.3 has better
  // function-calling reliability than Gemma 4 free). For plain text, keep
  // OpenRouter first (higher throughput, no Groq rate-limit concerns).
  const needsTools = !!(tools && tools.length > 0);

  if (needsTools && groqKey) {
    try {
      return await tryGroq();
    } catch (err) {
      console.warn('[AI] WiseResume Groq (tool-call) failed, trying OpenRouter:', err instanceof Error ? err.message : err);
      if (openrouterKey) {
        return await tryOpenRouter();
      }
      throw err;
    }
  }

  if (openrouterKey) {
    try {
      return await tryOpenRouter();
    } catch (err) {
      console.warn('[AI] WiseResume OpenRouter failed, trying Groq:', err instanceof Error ? err.message : err);
      if (groqKey) {
        return await tryGroq();
      }
      throw err;
    }
  }
  if (groqKey) {
    return await tryGroq();
  }

  throw createAIError('invalid_key', 'WiseResume AI is not configured. Please contact support.', 500);
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
