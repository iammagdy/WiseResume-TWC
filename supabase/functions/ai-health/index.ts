import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { callAI } from "../_shared/aiClient.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/authMiddleware.ts';
import { checkRateLimit } from '../_shared/rateLimiter.ts';

/**
 * AI health probe.
 *
 * Sends a tiny chat completion through the new flat 6-key pool. Whichever
 * provider+key the random pick lands on is the one whose health we report.
 * Returns:
 *   - healthy:  upstream responded OK in < 8s
 *   - degraded: upstream responded OK but slow, or replied 429/402
 *   - down:     anything else (timeout, network error, 5xx, 401, …)
 */
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    let userId: string;
    try {
      ({ userId } = await requireAuth(req));
    } catch {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { allowed } = await checkRateLimit(userId, { actionType: 'health_check', maxRequests: 120, windowSeconds: 60 });
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'health_throttled', message: 'Health check throttled — too many recent pings.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    let status: 'healthy' | 'degraded' | 'down' = 'down';
    let providerUsed = 'unknown';
    let errorCode: number | null = null;
    try {
      const r = await callAI({
        messages: [{ role: 'user', content: 'ping' }],
        maxTokens: 1,
        temperature: 0,
        signal: controller.signal,
      });
      providerUsed = r.providerUsed;
      const latency = Date.now() - startTime;
      status = latency < 8000 ? 'healthy' : 'degraded';
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
});
