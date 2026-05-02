/**
 * Validate a user-supplied API key by making a real one-token ping.
 *
 * POST /validate-api-key  { provider: string, key: string }
 * → { ok: true, model: string, latencyMs: number }
 * → { ok: false, error: string, latencyMs: number }
 *
 * The key is NEVER stored — this function only tests it.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/authMiddleware.ts';
import { pingProvider, SUPPORTED_PROVIDERS } from '../_shared/providers.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
serve(wrapHandler("validate-api-key", async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    await requireAuth(req);

    const body = await req.json().catch(() => ({}));
    const { provider, key } = body as { provider?: string; key?: string };

    if (!provider || !SUPPORTED_PROVIDERS.includes(provider)) {
      return json({ ok: false, error: `Unsupported provider: ${provider}. Supported: ${SUPPORTED_PROVIDERS.join(', ')}`, latencyMs: 0 }, 400);
    }
    if (!key || key.trim().length < 8) {
      return json({ ok: false, error: 'key is required', latencyMs: 0 }, 400);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);
    try {
      const result = await pingProvider(provider, key.trim(), controller.signal);
      return json(result);
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err) {
    console.error('[validate-api-key]', err);
    return json({ ok: false, error: (err as Error).message ?? 'Internal error', latencyMs: 0 }, 500);
  }
}));
