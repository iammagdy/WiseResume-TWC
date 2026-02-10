/**
 * Shared AI Client for Edge Functions
 * Routes AI requests to either the AI Gateway or Google Gemini directly
 */

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
  userGeminiKey?: string;
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
// Lovable gateway uses "google/model-name" prefix, Gemini API uses just "model-name"
const MODEL_MAPPING: Record<string, string> = {
  'google/gemini-2.5-flash': 'gemini-2.5-flash-preview-05-20',
  'google/gemini-2.5-pro': 'gemini-2.5-pro-preview-05-06',
  'google/gemini-2.5-flash-lite': 'gemini-2.0-flash-lite',
  'google/gemini-3-flash-preview': 'gemini-2.0-flash',
  'google/gemini-3-pro-preview': 'gemini-2.5-pro-preview-05-06',
  // Fallbacks
  'gemini-2.5-flash': 'gemini-2.5-flash-preview-05-20',
  'gemini-2.5-pro': 'gemini-2.5-pro-preview-05-06',
  'gemini-3-flash-preview': 'gemini-2.0-flash',
};

/**
 * Maps a Lovable gateway model name to a Gemini API model name
 */
function mapModelForGemini(model: string): string {
  // If already mapped, return the mapping
  if (MODEL_MAPPING[model]) {
    return MODEL_MAPPING[model];
  }
  
  // Strip "google/" prefix if present
  if (model.startsWith('google/')) {
    const stripped = model.replace('google/', '');
    return MODEL_MAPPING[stripped] || stripped;
  }
  
  return model;
}

/**
 * Calls AI using either Lovable Gateway or Google Gemini directly
 * based on whether a user Gemini key is provided
 */
export async function callAI(options: AICallOptions): Promise<AIResponse> {
  const { model, messages, temperature = 0.7, maxTokens, tools, toolChoice, userGeminiKey } = options;

  // 30-second timeout for all AI calls
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    if (userGeminiKey) {
      return await callGeminiDirect(userGeminiKey, model, messages, temperature, maxTokens, tools, toolChoice, controller.signal);
    } else {
      return await callLovableGateway(model, messages, temperature, maxTokens, tools, toolChoice, controller.signal);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw createAIError('network', 'AI request timed out after 30 seconds. Please try again.', 408);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
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

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
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
  toolChoice?: { type: 'function'; function: { name: string } } | 'auto'
): Promise<AIResponse> {
  const geminiModel = mapModelForGemini(model);
  
  const body: Record<string, unknown> = {
    model: geminiModel,
    messages,
    temperature,
  };

  if (maxTokens) body.max_tokens = maxTokens;
  if (tools && tools.length > 0) {
    body.tools = tools;
    if (toolChoice) body.tool_choice = toolChoice;
  }

  // Use Google's OpenAI-compatible endpoint
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
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
  
  // Parse error to get more specific message
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
    // Check if it's a quota exceeded error (daily limit)
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
function createAIError(type: AIError['type'], message: string, status: number): AIError {
  const error = new Error(message) as Error & AIError;
  error.type = type;
  error.status = status;
  throw error;
}

/**
 * Helper to check if an error is an AI error
 */
export function isAIError(error: unknown): error is AIError {
  return error instanceof Error && 'type' in error && 'status' in error;
}
