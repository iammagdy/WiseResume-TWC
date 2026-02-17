/**
 * Shared AI Client for Edge Functions
 * Routes AI requests to either the AI Gateway or Google Gemini directly
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
}

export interface AIError {
  type: 'rate_limit' | 'payment_required' | 'invalid_key' | 'quota_exceeded' | 'network' | 'unknown';
  message: string;
  status: number;
}

// Model mapping for direct Gemini calls
const MODEL_MAPPING: Record<string, string> = {
  'google/gemini-2.5-flash': 'gemini-2.5-flash-preview-05-20',
  'google/gemini-2.5-pro': 'gemini-2.5-pro-preview-05-06',
  'google/gemini-2.5-flash-lite': 'gemini-2.0-flash-lite',
  'google/gemini-3-flash-preview': 'gemini-2.0-flash',
  'google/gemini-3-pro-preview': 'gemini-2.5-pro-preview-05-06',
  'gemini-2.5-flash': 'gemini-2.5-flash-preview-05-20',
  'gemini-2.5-pro': 'gemini-2.5-pro-preview-05-06',
  'gemini-3-flash-preview': 'gemini-2.0-flash',
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
  if (!ENCRYPTION_SECRET) return undefined;
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data, error } = await supabase
      .from('user_api_keys')
      .select('encrypted_key')
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
 * Calls AI using either Lovable Gateway or Google Gemini directly.
 * If userId is provided, attempts to fetch their Gemini key from the DB.
 * Falls back to userGeminiKey (deprecated) for backward compat.
 */
export async function callAI(options: AICallOptions): Promise<AIResponse> {
  const { model, messages, temperature = 0.7, maxTokens, tools, toolChoice, userId, timeout = 30_000 } = options;
  
  // Resolve the user's Gemini key: prefer DB lookup, fall back to deprecated body param
  let userGeminiKey = options.userGeminiKey;
  if (!userGeminiKey && userId) {
    userGeminiKey = await getUserKeyFromDB(userId);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    if (userGeminiKey) {
      try {
        return await callGeminiDirect(userGeminiKey, model, messages, temperature, maxTokens, tools, toolChoice, controller.signal);
      } catch (geminiErr) {
        if (isAIError(geminiErr) && (geminiErr.type === 'quota_exceeded' || geminiErr.type === 'rate_limit' || geminiErr.type === 'invalid_key')) {
          console.warn(`[AI] User Gemini key failed (${geminiErr.type}), falling back to Lovable gateway`);
          return await callLovableGateway(model, messages, temperature, maxTokens, tools, toolChoice, controller.signal);
        }
        throw geminiErr;
      }
    } else {
      return await callLovableGateway(model, messages, temperature, maxTokens, tools, toolChoice, controller.signal);
    }
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
  let cleaned = text
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
 * Calls the AI Gateway (default path)
 */
async function callLovableGateway(
  model: string,
  messages: AIMessage[],
  temperature: number,
  maxTokens?: number,
  tools?: AITool[],
  toolChoice?: { type: 'function'; function: { name: string } } | 'auto',
  signal?: AbortSignal
): Promise<AIResponse> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw createAIError('unknown', 'LOVABLE_API_KEY is not configured', 500);
  }

  const body: Record<string, unknown> = { model, messages, temperature };
  if (maxTokens) body.max_tokens = maxTokens;
  if (tools && tools.length > 0) {
    body.tools = tools;
    if (toolChoice) body.tool_choice = toolChoice;
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    handleGatewayError(response.status, await response.text());
  }

  const data = await response.json();
  return parseOpenAIResponse(data);
}

/**
 * Calls Google Gemini API directly using user's key
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
 * Handles errors from the AI Gateway
 */
function handleGatewayError(status: number, errorText: string): never {
  console.error('AI Gateway error:', status, errorText);
  
  if (status === 429) {
    throw createAIError('rate_limit', 'Rate limit exceeded. Please try again later.', 429);
  }
  if (status === 402) {
    throw createAIError('payment_required', 'AI credits exhausted. Please add more credits.', 402);
  }
  
  throw createAIError('unknown', `AI request failed: ${status}`, status);
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
  if (status === 429) {
    if (errorText.includes('RESOURCE_EXHAUSTED') || errorText.includes('quota')) {
      throw createAIError('quota_exceeded', 'Daily quota exceeded. Try again tomorrow or use a paid key.', 429);
    }
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