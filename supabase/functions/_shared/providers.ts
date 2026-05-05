/**
 * Flat-pool AI provider definitions.
 *
 * These are the three providers used by the managed flat-pool infrastructure
 * (OpenRouter, Groq, DeepSeek — up to 3 key slots each). The `validate-api-key`
 * edge function uses `pingProvider` + `SUPPORTED_PROVIDERS` to let admins test
 * individual key slots from the DevKit AI panel.
 *
 * BYOK was removed in Task #17. The former BYOK-only entries (openai, anthropic,
 * gemini, mistral, cohere, xai) have been removed along with callBYOK(),
 * resolveByok(), and the aiClient BYOK paths.
 */

export interface ProviderConfig {
  displayName: string;
  baseUrl: string;
  chatEndpoint: string;
  defaultModel: string;
  /** 'bearer' — Authorization: Bearer {key}  (OpenAI-compatible APIs) */
  authStyle: 'bearer';
  /** Extra headers to merge in (e.g. OpenRouter HTTP-Referer). */
  extraHeaders?: Record<string, string>;
}

export const PROVIDERS: Record<string, ProviderConfig> = {
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
  groq: {
    displayName: 'Groq',
    baseUrl: 'https://api.groq.com',
    chatEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
    authStyle: 'bearer',
  },
  deepseek: {
    displayName: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    chatEndpoint: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-chat',
    authStyle: 'bearer',
  },
};

export const SUPPORTED_PROVIDERS = Object.keys(PROVIDERS);

export function getProvider(slug: string): ProviderConfig | null {
  return PROVIDERS[slug] ?? null;
}

/**
 * Build the Authorization header for a Bearer-auth provider.
 * Returns an object ready to merge into a fetch headers map.
 */
export function buildAuthHeaders(
  cfg: ProviderConfig,
  key: string,
): Record<string, string> {
  return {
    Authorization: `Bearer ${key}`,
    ...cfg.extraHeaders,
  };
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
