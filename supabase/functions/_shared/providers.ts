/**
 * BYOK provider registry.
 *
 * Maps provider slug → metadata used by validate-api-key and aiClient BYOK path.
 */

export interface ProviderConfig {
  displayName: string;
  baseUrl: string;
  chatEndpoint: string;
  defaultModel: string;
  /**
   * 'bearer'    — Authorization: Bearer {key}  (OpenAI-compatible APIs)
   * 'anthropic' — x-api-key: {key} + anthropic-version header (Anthropic native)
   */
  authStyle: 'bearer' | 'anthropic';
  /** Extra headers to merge in (e.g. OpenRouter HTTP-Referer). */
  extraHeaders?: Record<string, string>;
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  openai: {
    displayName: 'OpenAI',
    baseUrl: 'https://api.openai.com',
    chatEndpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    authStyle: 'bearer',
  },
  anthropic: {
    displayName: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    chatEndpoint: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-haiku-4-5',
    authStyle: 'anthropic',
  },
  gemini: {
    displayName: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    chatEndpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    defaultModel: 'gemini-2.0-flash',
    authStyle: 'bearer',
  },
  groq: {
    displayName: 'Groq',
    baseUrl: 'https://api.groq.com',
    chatEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
    authStyle: 'bearer',
  },
  mistral: {
    displayName: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai',
    chatEndpoint: 'https://api.mistral.ai/v1/chat/completions',
    defaultModel: 'mistral-small-latest',
    authStyle: 'bearer',
  },
  cohere: {
    displayName: 'Cohere',
    baseUrl: 'https://api.cohere.ai',
    chatEndpoint: 'https://api.cohere.ai/compatibility/v1/chat/completions',
    defaultModel: 'command-r',
    authStyle: 'bearer',
  },
  openrouter: {
    displayName: 'OpenRouter',
    baseUrl: 'https://openrouter.ai',
    chatEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    authStyle: 'bearer',
    extraHeaders: {
      'HTTP-Referer': 'https://thewise.cloud',
      'X-Title': 'WiseResume',
    },
  },
  xai: {
    displayName: 'xAI Grok',
    baseUrl: 'https://api.x.ai',
    chatEndpoint: 'https://api.x.ai/v1/chat/completions',
    defaultModel: 'grok-beta',
    authStyle: 'bearer',
  },
};

export const SUPPORTED_PROVIDERS = Object.keys(PROVIDERS);

export function getProvider(slug: string): ProviderConfig | null {
  return PROVIDERS[slug] ?? null;
}

/**
 * Build the HTTP headers for a provider's auth style.
 * Returns an object ready to merge into a fetch headers map.
 */
export function buildAuthHeaders(
  cfg: ProviderConfig,
  key: string,
): Record<string, string> {
  if (cfg.authStyle === 'anthropic') {
    return {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      ...cfg.extraHeaders,
    };
  }
  return {
    Authorization: `Bearer ${key}`,
    ...cfg.extraHeaders,
  };
}

/**
 * Extract the text content from an API response body (already parsed JSON).
 * Handles both OpenAI-compatible format and Anthropic native format.
 */
export function extractResponseContent(
  cfg: ProviderConfig,
  parsed: Record<string, unknown>,
): string {
  if (cfg.authStyle === 'anthropic') {
    const blocks = parsed?.content as Array<{ type: string; text?: string }> | undefined;
    return blocks?.[0]?.text ?? '';
  }
  const choices = parsed?.choices as Array<{ message?: { content?: string } }> | undefined;
  const content = choices?.[0]?.message?.content;
  return typeof content === 'string' ? content : JSON.stringify(content ?? '');
}

/** Make a minimal one-token chat completion using the given key+provider. */
export async function pingProvider(
  provider: string,
  key: string,
  signal?: AbortSignal,
): Promise<{ ok: boolean; model?: string; error?: string; latencyMs: number }> {
  const cfg = getProvider(provider);
  if (!cfg) {
    return { ok: false, error: `Unknown provider: ${provider}`, latencyMs: 0 };
  }

  const start = Date.now();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...buildAuthHeaders(cfg, key),
  };

  const body: Record<string, unknown> = {
    model: cfg.defaultModel,
    messages: [{ role: 'user', content: 'ping' }],
    max_tokens: 1,
    temperature: 0,
  };

  try {
    const res = await fetch(cfg.chatEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
    const latencyMs = Date.now() - start;
    const text = await res.text();

    if (!res.ok) {
      let message = text.slice(0, 300);
      try {
        const j = JSON.parse(text);
        message = j?.error?.message ?? j?.error?.error ?? j?.message ?? message;
      } catch { /* ignore */ }
      return { ok: false, error: message, latencyMs };
    }

    let model = cfg.defaultModel;
    try {
      const j = JSON.parse(text);
      model = j?.model ?? model;
    } catch { /* ignore */ }

    return { ok: true, model, latencyMs };
  } catch (err) {
    return {
      ok: false,
      error: (err as Error).message ?? 'Network error',
      latencyMs: Date.now() - start,
    };
  }
}
