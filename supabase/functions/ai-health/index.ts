import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getUserKeyFromDB } from "../_shared/aiClient.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/authMiddleware.ts';
import { checkRateLimit } from '../_shared/rateLimiter.ts';
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let status: 'healthy' | 'degraded' | 'down' = 'down';
  let latencyMs = 0;
  const provider: 'gemini' = 'gemini';
  let errorCode: number | null = null;

  try {
    // Resolve user's Gemini key server-side from DB (if authenticated)
    // Auth is optional — unauthenticated requests fall through to the global env key
    let geminiKey: string | undefined;
    if (req.headers.get('Authorization')?.startsWith('Bearer ')) {
      try {
        const { userId } = await requireAuth(req);
        const { allowed } = await checkRateLimit(userId, { actionType: 'health_check', maxRequests: 20, windowSeconds: 60 });
        if (!allowed) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: corsHeaders });
        }
        geminiKey = await getUserKeyFromDB(userId, 'gemini');
      } catch {
        // Invalid or missing JWT — fall through to global env key
      }
    }

    if (!geminiKey) {
      geminiKey = Deno.env.get('VERTEX_API_KEY') || Deno.env.get('WISE_AI_API_KEY') || Deno.env.get('GEMINI_API_KEY');
    }

    if (geminiKey) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(
        `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.0-flash-lite?key=${geminiKey}`,
        { method: 'GET', signal: controller.signal }
      );

      clearTimeout(timeoutId);
      latencyMs = Date.now() - startTime;

      if (response.ok) {
        status = latencyMs < 5000 ? 'healthy' : 'degraded';
      } else {
        errorCode = response.status;
        status = (response.status === 429 || response.status === 402) ? 'degraded' : 'down';
      }
    } else {
      // No API key available
      latencyMs = Date.now() - startTime;
      status = 'down';
      errorCode = 500;
    }
  } catch (err) {
    latencyMs = Date.now() - startTime;
    if (err instanceof DOMException && err.name === 'AbortError') {
      status = 'down';
      errorCode = 408;
    } else {
      status = 'down';
      errorCode = 0;
    }
  }

  return new Response(JSON.stringify({
    status,
    latencyMs,
    timestamp: new Date().toISOString(),
    provider,
    errorCode,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
