/**
 * Thin wrappers around the three model providers we route to in production.
 * Each returns a uniform { content, latencyMs, ok, error?, usage? } shape so
 * the runner can compare them apples-to-apples.
 */

const OR_KEY = process.env.OPENROUTER_API_KEY!;
const OR2_KEY = process.env.OPENROUTER2_API_KEY!;
const GROQ_KEY = process.env.GROQ_API_KEY!;

export type ProviderName = 'gemma' | 'elephant' | 'qwen';

export interface ProviderResult {
  provider: ProviderName;
  model: string;
  ok: boolean;
  content: string;
  latencyMs: number;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: string;
}

interface CallOpts {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

async function postJSON(url: string, key: string, body: unknown, headers: Record<string, string> = {}): Promise<{ status: number; body: any }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });
  let parsed: any = null;
  try { parsed = await res.json(); } catch { /* ignore */ }
  return { status: res.status, body: parsed };
}

function buildMessages(opts: CallOpts) {
  const msgs: Array<{ role: string; content: string }> = [];
  if (opts.systemPrompt) msgs.push({ role: 'system', content: opts.systemPrompt });
  msgs.push({ role: 'user', content: opts.userPrompt });
  return msgs;
}

export async function callGemma(opts: CallOpts): Promise<ProviderResult> {
  const model = 'google/gemma-4-31b-it:free';
  const start = Date.now();
  try {
    const { status, body } = await postJSON(
      'https://openrouter.ai/api/v1/chat/completions',
      OR_KEY,
      {
        model,
        messages: buildMessages(opts),
        temperature: opts.temperature ?? 0.5,
        max_tokens: opts.maxTokens ?? 1024,
        ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      },
      { 'HTTP-Referer': 'https://resume.thewise.cloud', 'X-Title': 'WiseResume-Test' },
    );
    const latencyMs = Date.now() - start;
    if (status !== 200 || !body?.choices?.[0]?.message?.content) {
      return { provider: 'gemma', model, ok: false, content: '', latencyMs, error: `status=${status} body=${JSON.stringify(body).slice(0, 300)}` };
    }
    return { provider: 'gemma', model, ok: true, content: body.choices[0].message.content, latencyMs, usage: body.usage };
  } catch (err) {
    return { provider: 'gemma', model, ok: false, content: '', latencyMs: Date.now() - start, error: String(err) };
  }
}

export async function callElephant(opts: CallOpts): Promise<ProviderResult> {
  const model = 'openai/gpt-oss-120b:free';
  const start = Date.now();
  try {
    const { status, body } = await postJSON(
      'https://openrouter.ai/api/v1/chat/completions',
      OR2_KEY,
      {
        model,
        messages: buildMessages(opts),
        temperature: opts.temperature ?? 0.5,
        max_tokens: opts.maxTokens ?? 1024,
        ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      },
      { 'HTTP-Referer': 'https://resume.thewise.cloud', 'X-Title': 'WiseResume-Test' },
    );
    const latencyMs = Date.now() - start;
    if (status !== 200 || !body?.choices?.[0]?.message?.content) {
      return { provider: 'elephant', model, ok: false, content: '', latencyMs, error: `status=${status} body=${JSON.stringify(body).slice(0, 300)}` };
    }
    return { provider: 'elephant', model, ok: true, content: body.choices[0].message.content, latencyMs, usage: body.usage };
  } catch (err) {
    return { provider: 'elephant', model, ok: false, content: '', latencyMs: Date.now() - start, error: String(err) };
  }
}

export async function callQwen(opts: CallOpts): Promise<ProviderResult> {
  const model = 'llama-3.3-70b-versatile';
  const start = Date.now();
  try {
    const { status, body } = await postJSON(
      'https://api.groq.com/openai/v1/chat/completions',
      GROQ_KEY,
      {
        model,
        messages: buildMessages(opts),
        temperature: opts.temperature ?? 0.5,
        max_tokens: opts.maxTokens ?? 1024,
        ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      },
    );
    const latencyMs = Date.now() - start;
    if (status !== 200 || !body?.choices?.[0]?.message?.content) {
      return { provider: 'qwen', model, ok: false, content: '', latencyMs, error: `status=${status} body=${JSON.stringify(body).slice(0, 300)}` };
    }
    return { provider: 'qwen', model, ok: true, content: body.choices[0].message.content, latencyMs, usage: body.usage };
  } catch (err) {
    return { provider: 'qwen', model, ok: false, content: '', latencyMs: Date.now() - start, error: String(err) };
  }
}

export async function callAll(opts: CallOpts): Promise<ProviderResult[]> {
  return Promise.all([callGemma(opts), callElephant(opts), callQwen(opts)]);
}
