import { callAIWithRetry } from "../_shared/aiClient.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAdminAuthSession } from '../_shared/adminAuth.ts';
import { checkRateLimit } from '../_shared/rateLimiter.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
/**
 * AI health probe.
 *
 * Sends a tiny chat completion through callAIWithRetry so the probe exercises
 * the same key-rotation and cross-provider fallback that real requests use.
 * The measured latency therefore reflects what users actually experience.
 * Returns:
 *   - healthy:  pool responded OK in < 15s (fast key found within retries)
 *   - degraded: pool responded OK but slow, or replied 429/402
 *   - down:     anything else (timeout, network error, 5xx, 401, …)
 */
Deno.serve(wrapHandler("ai-health", async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    let sessionId: string;
    try {
      ({ sessionId } = await requireAdminAuthSession(req, corsHeaders));
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    const { allowed } = await checkRateLimit(sessionId, { actionType: 'health_check', maxRequests: 120, windowSeconds: 60 });
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'health_throttled', message: 'Health check throttled — too many recent pings.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const controller = new AbortController();
    // Allow up to 25s so retries across providers can complete before aborting.
    const timeoutId = setTimeout(() => controller.abort(), 25_000);
    let status: 'healthy' | 'degraded' | 'down' = 'down';
    let providerUsed = 'unknown';
    let errorCode: number | null = null;
    try {
      const r = await callAIWithRetry({
        messages: [{ role: 'user', content: 'ping' }],
        maxTokens: 1,
        temperature: 0,
        signal: controller.signal,
      });
      providerUsed = r.providerUsed;
      const latency = Date.now() - startTime;
      // 15s threshold: even if the first key is slow and a retry is needed,
      // finding a fast key within ~15s is still a healthy user experience.
      status = latency < 15_000 ? 'healthy' : 'degraded';
    } catch (err) {
      const e = err as { status?: number; message?: string };
      errorCode = typeof e?.status === 'number' ? e.status : 0;
      status = (errorCode === 429 || errorCode === 402) ? 'degraded' : 'down';
    } finally {
      clearTimeout(timeoutId);
    }

    return new Response(JSON.stringify({
      status,
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      provider: providerUsed,
      errorCode,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({
      status: 'down',
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      provider: 'unknown',
      errorCode: 500,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}));
