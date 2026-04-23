import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { callAIWithRetry } from "../_shared/aiClient.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, authErrorResponse } from '../_shared/authMiddleware.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { checkRateLimit } from '../_shared/rateLimiter.ts';
import { logger } from '../_shared/logger.ts';

const log = logger('ai-test');

/**
 * AI smoke test for the DevKit OpenRouter / Groq panels.
 *
 * Body fields (all optional):
 *   - provider:  'openrouter' | 'groq'  → pin the test to one provider
 *   - keyIndex:  1 | 2 | 3                → pin to a specific key in that pool
 *   - prompt:    string                   → user prompt to send (default: "Say hello")
 *
 * Admin DevKit panels send `provider`+`keyIndex` to test individual keys.
 * Regular users may call without a body for a quick connectivity check.
 */
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const startTime = Date.now();

  try {
    let body: { provider?: string; keyIndex?: number; prompt?: string } = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch { /* empty body */ }

    const isAdminPin = body.provider === 'openrouter' || body.provider === 'groq';

    let userId = 'admin';
    if (isAdminPin) {
      // Throws a Response on failure.
      await requireAdminAuth(req, corsHeaders);
    } else {
      try {
        ({ userId } = await requireAuth(req));
      } catch (e) {
        return authErrorResponse(e, req.headers.get('origin'));
      }
      const { allowed } = await checkRateLimit(userId, { actionType: 'test_check', maxRequests: 10, windowSeconds: 60 });
      if (!allowed) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Admin pin: hit the chosen specific key directly so the DevKit can
    // verify each key in isolation. Pool-mode tests just call the normal
    // random-pick client.
    let providerUsed = 'unknown';
    let model = '';
    let content = '';

    if (isAdminPin) {
      const idx = Math.max(1, Math.min(3, Number(body.keyIndex) || 1));
      const provider = body.provider as 'openrouter' | 'groq';
      const envName = provider === 'openrouter' ? `OPENROUTER_KEY_${idx}` : `GROQ_KEY_${idx}`;
      const apiKey = Deno.env.get(envName)?.trim();
      if (!apiKey) {
        return new Response(JSON.stringify({
          success: false,
          error: `${envName} is not set on the server.`,
          latencyMs: Date.now() - startTime,
        }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const url = provider === 'openrouter'
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : 'https://api.groq.com/openai/v1/chat/completions';
      model = provider === 'openrouter'
        ? 'meta-llama/llama-3.3-70b-instruct:free'
        : 'llama-3.3-70b-versatile';
      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
      if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://thewise.cloud';
        headers['X-Title'] = 'WiseResume';
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20_000);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: body.prompt || 'Say hello in one short sentence.' }],
            max_tokens: 60,
            temperature: 0,
          }),
          signal: controller.signal,
        });
        const txt = await res.text();
        if (!res.ok) {
          return new Response(JSON.stringify({
            success: false,
            providerUsed: `${provider}:${idx}`,
            model,
            error: `${res.status}: ${txt.slice(0, 300)}`,
            latencyMs: Date.now() - startTime,
          }), { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const parsed = JSON.parse(txt);
        content = parsed?.choices?.[0]?.message?.content ?? '';
        providerUsed = `${provider}:${idx}`;
      } finally {
        clearTimeout(timer);
      }
    } else {
      const r = await callAIWithRetry({
        messages: [{ role: 'user', content: body.prompt || 'Say hello in one short sentence.' }],
        maxTokens: 60,
        temperature: 0,
        userId,
      });
      providerUsed = r.providerUsed;
      model = r.model;
      content = r.content;
    }

    return new Response(JSON.stringify({
      success: true,
      providerUsed,
      model,
      latencyMs: Date.now() - startTime,
      response: (content || 'OK').trim(),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    log.error('Unhandled error', err);
    if (err instanceof Response) return err;
    const e = err as Partial<{ status: number; message: string; code: string }>;
    const status = typeof e?.status === 'number' && e.status >= 400 && e.status < 600 ? e.status : 500;
    return new Response(JSON.stringify({
      success: false,
      error: e?.message || 'Unknown error',
      reason: e?.code || 'internal',
      latencyMs: Date.now() - startTime,
    }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
