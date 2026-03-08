/**
 * Shared AI Client for Edge Functions
 * Routes AI requests to either the AI Gateway or Google Gemini directly
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
  preferredProvider?: 'gemini' | 'ollama' | 'wiseresume';
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
  'google/gemini-2.5-flash-lite': 'gemini-2.5-flash-lite-preview-06-17',
  'google/gemini-3-flash-preview': 'gemini-2.5-flash',
  'google/gemini-3-pro-preview': 'gemini-2.5-pro',
  'gemini-2.5-flash': 'gemini-2.5-flash',
  'gemini-2.5-pro': 'gemini-2.5-pro',
  'gemini-3-flash-preview': 'gemini-2.5-flash',
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

const ENCRYPTION_SECRET = Deno.env.get('API_KEY_ENCRYPTION_SECRET') || '';

async function getDecryptionKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_SECRET),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('user-api-keys-salt'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
}

async function decryptKey(encoded: string): Promise<string> {
  const key = await getDecryptionKey();
  const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

/**
 * Fetches a user's API key from the database (decrypted).
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
      .select('encrypted_key, base_url')
      .eq('user_id', userId)
      .eq('provider', provider)
      .maybeSingle();

    if (error || !data?.encrypted_key) return undefined;
    return await decryptKey(data.encrypted_key);
  } catch (err) {
    console.warn('[aiClient] Failed to fetch user key from DB:', err);
    return undefined;
  }
}

/**
 * Fetches a user's API key + base_url from the database (decrypted).
 */
export async function getUserKeyAndUrlFromDB(userId: string, provider: string): Promise<{ key: string; baseUrl: string | null; model: string | null } | undefined> {
  if (!ENCRYPTION_SECRET) return undefined;

  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('user_api_keys')
      .select('encrypted_key, base_url, model')
      .eq('user_id', userId)
      .eq('provider', provider)
      .maybeSingle();

    if (error || !data?.encrypted_key) return undefined;
    const key = await decryptKey(data.encrypted_key);
    return { key, baseUrl: data.base_url ?? null, model: (data as any).model ?? null };
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
 * Calls AI API (Gemini or Emergent Universal).
 * If userId is provided, attempts to fetch their Gemini key from the DB.
 * Falls back to global GEMINI_API_KEY env var, then EMERGENT_LLM_KEY.
 */
export async function callAI(options: AICallOptions): Promise<AIResponse> {
  const { model, messages, temperature = 0.7, maxTokens, tools, toolChoice, userId, timeout = 30_000 } = options;

  // Lovable AI Gateway (primary)
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');

  // Resolve user BYOK keys only if userId provided
  let userGeminiKey: string | undefined;
  let userOllamaData: { key: string; baseUrl: string | null; model: string | null } | undefined;
  if (userId) {
    // Read user's preferred provider from user_preferences table
    const preferredProvider = options.preferredProvider || await getUserPreferredProvider(userId);
    
    if (preferredProvider === 'ollama') {
      userOllamaData = await getUserKeyAndUrlFromDB(userId, 'ollama');
    } else if (preferredProvider === 'gemini') {
      userGeminiKey = await getUserKeyFromDB(userId);
    } else {
      // No preference or 'wiseresume': skip BYOK, use Lovable Gateway
    }
  }
  if (!userGeminiKey && !userOllamaData && options.userGeminiKey) {
    userGeminiKey = options.userGeminiKey; // deprecated body param
  }

  // Legacy fallbacks
  const globalGeminiKey = Deno.env.get('GEMINI_API_KEY');
  const emergentKey = Deno.env.get('EMERGENT_LLM_KEY');

  if (!lovableKey && !userGeminiKey && !userOllamaData && !globalGeminiKey && !emergentKey) {
    console.error('[AI] No API key available');
    throw createAIError('invalid_key', 'No AI API key configured. Please add your API key in Settings.', 500);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Priority 1: Lovable AI Gateway (always first — unless user has BYOK)
    if (lovableKey && !userOllamaData && !userGeminiKey) {
      console.log('[AI] Using Lovable AI Gateway for model:', model);
      const res = await callLovableGateway(lovableKey, model, messages, temperature, maxTokens, tools, toolChoice, controller.signal);
      return { ...res, providerUsed: 'lovable' };
    }

    // Priority 2: User BYOK Ollama key — use stored model name
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
        console.warn('[AI] Ollama BYOK failed, falling back to Lovable Gateway:', err instanceof Error ? err.message : err);
        if (lovableKey) {
          // Create a fresh controller for the fallback — the original may already be aborted
          const fallbackController = new AbortController();
          const fallbackTimeout = setTimeout(() => fallbackController.abort(), timeout);
          try {
            const res = await callLovableGateway(lovableKey, model, messages, temperature, maxTokens, tools, toolChoice, fallbackController.signal);
            return { ...res, fallbackUsed: true, fallbackReason: 'ollama_error', providerUsed: 'lovable_fallback' };
          } finally {
            clearTimeout(fallbackTimeout);
          }
        }
        throw err;
      }
    }

    // Priority 3: User BYOK Gemini key (fallback)
    if (userGeminiKey) {
      console.log('[AI] Using user BYOK Gemini key for model:', model);
      try {
        const res = await callGeminiDirect(userGeminiKey, model, messages, temperature, maxTokens, tools, toolChoice, controller.signal);
        return { ...res, providerUsed: 'gemini_byok' };
      } catch (err) {
        const errDetail = err instanceof Error ? `${err.message} (type=${(err as any)?.type}, status=${(err as any)?.status})` : String(err);
        console.warn('[AI] Gemini BYOK failed, falling back to Lovable Gateway:', errDetail);
        // Extract specific error type for better fallback reporting
        const fallbackReason = (err as any)?.type === 'quota_exceeded' ? 'quota_exceeded'
          : (err as any)?.type === 'invalid_key' ? 'invalid_key'
          : (err as any)?.type === 'rate_limit' ? 'rate_limit'
          : (err instanceof Error && err.message?.includes('not found')) ? 'model_not_found'
          : 'gemini_error';
        if (lovableKey) {
          const fallbackController = new AbortController();
          const fallbackTimeout = setTimeout(() => fallbackController.abort(), timeout);
          try {
            const res = await callLovableGateway(lovableKey, model, messages, temperature, maxTokens, tools, toolChoice, fallbackController.signal);
            return { ...res, fallbackUsed: true, fallbackReason, providerUsed: 'lovable_fallback' };
          } finally {
            clearTimeout(fallbackTimeout);
          }
        }
        throw err;
      }
    }

    // Priority 4: Lovable Gateway (if we have BYOK but it was skipped)
    if (lovableKey) {
      console.log('[AI] Using Lovable AI Gateway for model:', model);
      const res = await callLovableGateway(lovableKey, model, messages, temperature, maxTokens, tools, toolChoice, controller.signal);
      return { ...res, providerUsed: 'lovable' };
    }

    // Priority 5: Global GEMINI_API_KEY (legacy)
    if (globalGeminiKey) {
      console.log('[AI] Using global GEMINI_API_KEY for model:', model);
      const res = await callGeminiDirect(globalGeminiKey, model, messages, temperature, maxTokens, tools, toolChoice, controller.signal);
      return { ...res, providerUsed: 'gemini_global' };
    }

    // Priority 6: Emergent Universal API (legacy)
    console.log('[AI] Using Emergent Universal Key for model:', model);
    const res = await callEmergentUniversal(emergentKey!, model, messages, temperature, maxTokens, tools, toolChoice, controller.signal);
    return { ...res, providerUsed: 'emergent' };
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
const FALLBACK_MODEL = 'google/gemini-2.5-flash-lite';

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
      throw createAIError('invalid_key', 'Invalid Ollama API key. Please check your settings.', 401);
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
 * Calls Google Gemini API directly
 * Uses the OpenAI-compatible endpoint for consistency
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
  console.log(`[AI] callGeminiDirect: input model="${model}" → mapped="${geminiModel}"`);

  const body: Record<string, unknown> = { model: geminiModel, messages, temperature };
  if (maxTokens) body.max_tokens = maxTokens;
  if (tools && tools.length > 0) {
    body.tools = tools;
    if (toolChoice) body.tool_choice = toolChoice;
  }

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    handleGeminiError(response.status, await response.text());
  }

  const data = await response.json();
  return parseOpenAIResponse(data);
}

/**
 * Calls Lovable AI Gateway
 * Uses OpenAI-compatible endpoint at ai.gateway.lovable.dev
 */
async function callLovableGateway(
  apiKey: string,
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

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Lovable AI Gateway error:', response.status, errorText);
    
    let errorMessage = 'AI request failed';
    try {
      const parsed = JSON.parse(errorText);
      errorMessage = parsed.error?.message || parsed.error || errorMessage;
    } catch {}

    if (response.status === 401 || response.status === 403) {
      throw createAIError('invalid_key', 'Invalid Lovable AI key.', 401);
    }
    if (response.status === 402) {
      throw createAIError('payment_required', 'AI credits exhausted. Please add credits to your workspace.', 402);
    }
    if (response.status === 429) {
      throw createAIError('rate_limit', 'Too many requests. Please wait a moment.', 429);
    }
    throw createAIError('unknown', errorMessage, response.status);
  }

  const data = await response.json();
  return parseOpenAIResponse(data);
}

/**
 * Calls Emergent Universal API
 * Uses OpenAI-compatible endpoint with universal key that routes to multiple LLM providers
 */
async function callEmergentUniversal(
  apiKey: string,
  model: string,
  messages: AIMessage[],
  temperature: number,
  maxTokens?: number,
  tools?: AITool[],
  toolChoice?: { type: 'function'; function: { name: string } } | 'auto',
  signal?: AbortSignal
): Promise<AIResponse> {
  // Map model names to Emergent-compatible format
  const emergentModel = mapModelForEmergent(model);

  const body: Record<string, unknown> = { model: emergentModel, messages, temperature };
  if (maxTokens) body.max_tokens = maxTokens;
  if (tools && tools.length > 0) {
    body.tools = tools;
    if (toolChoice) body.tool_choice = toolChoice;
  }

  const response = await fetch('https://api.emergent.sh/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    handleEmergentError(response.status, await response.text());
  }

  const data = await response.json();
  return parseOpenAIResponse(data);
}

// Model mapping for Emergent Universal API
function mapModelForEmergent(model: string): string {
  const EMERGENT_MODEL_MAP: Record<string, string> = {
    'google/gemini-2.5-flash': 'gemini-2.5-flash',
    'google/gemini-2.5-pro': 'gemini-2.5-pro',
    'google/gemini-2.5-flash-lite': 'gemini-2.5-flash-lite',
    'google/gemini-3-flash-preview': 'gemini-3-flash-preview',
    'google/gemini-3-pro-preview': 'gemini-3-pro-preview',
    'gemini-2.5-flash': 'gemini-2.5-flash',
    'gemini-2.5-pro': 'gemini-2.5-pro',
    'gemini-3-flash-preview': 'gemini-3-flash-preview',
    'gemini-2.0-flash': 'gemini-2.0-flash',
    'gemini-2.0-flash-lite': 'gemini-2.0-flash-lite',
    'gemini-1.5-pro': 'gemini-2.5-pro',
  };

  // If model starts with google/, strip it for Emergent
  const stripped = model.startsWith('google/') ? model.replace('google/', '') : model;
  return EMERGENT_MODEL_MAP[model] || EMERGENT_MODEL_MAP[stripped] || stripped;
}

/**
 * Parses OpenAI-format response into our AIResponse type
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
 * Handles errors from direct Gemini API calls
 */
function handleGeminiError(status: number, errorText: string): never {
  console.error('Gemini API error:', status, errorText);

  let errorMessage = 'AI request failed';
  try {
    const parsed = JSON.parse(errorText);
    errorMessage = parsed.error?.message || errorMessage;
  } catch {
    // Use raw error text
  }

  if (status === 401 || status === 403) {
    throw createAIError('invalid_key', 'Invalid Gemini API key. Please check your settings.', 401);
  }
  if (status === 404) {
    throw createAIError('invalid_key', `Model not found: ${errorMessage}. Check your selected model in AI Settings.`, 404);
  }
  if (status === 429) {
    if (errorText.includes('RESOURCE_EXHAUSTED') || errorText.includes('quota')) {
      throw createAIError('quota_exceeded', 'Daily quota exceeded. Try again tomorrow or use a paid key.', 429);
    }
    throw createAIError('rate_limit', 'Too many requests. Please wait a moment.', 429);
  }

  throw createAIError('unknown', errorMessage, status);
}

/**
 * Handles errors from Emergent Universal API calls
 */
function handleEmergentError(status: number, errorText: string): never {
  console.error('Emergent API error:', status, errorText);

  let errorMessage = 'AI request failed';
  try {
    const parsed = JSON.parse(errorText);
    errorMessage = parsed.error?.message || errorMessage;
  } catch {
    // Use raw error text
  }

  if (status === 401 || status === 403) {
    throw createAIError('invalid_key', 'Invalid Emergent Universal Key. Please contact support.', 401);
  }
  if (status === 402) {
    throw createAIError('payment_required', 'Emergent Universal Key balance exhausted. Please add credits.', 402);
  }
  if (status === 429) {
    throw createAIError('rate_limit', 'Too many requests. Please wait a moment.', 429);
  }

  throw createAIError('unknown', errorMessage, status);
}

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
  // For non-AI errors, return a safe generic message (don't leak internals)
  console.error('[toUserError] Internal error:', error);
  return {
    status: 500,
    error: 'internal',
    message: 'Something went wrong. Please try again.',
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