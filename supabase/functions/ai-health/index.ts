import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getUserKeyFromDB } from "../_shared/aiClient.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/authMiddleware.ts';
import { checkRateLimit } from '../_shared/rateLimiter.ts';
import { checkAndDeductCredit } from '../_shared/creditUtils.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let status: 'healthy' | 'degraded' | 'down' = 'down';
  let latencyMs = 0;
  let provider = 'wiseresume';
  let errorCode: number | null = null;

  try {
    let userId: string;
    try {
      const auth = await requireAuth(req);
      userId = auth.userId;
    } catch {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { allowed } = await checkRateLimit(userId, { actionType: 'health_check', maxRequests: 20, windowSeconds: 60 });
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: corsHeaders });
    }

    const creditCheck = await checkAndDeductCredit(userId);
    if (!creditCheck.hasCredits) {
      return new Response(
        JSON.stringify({ error: 'Daily AI credit limit reached.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let geminiKey: string | undefined;
    geminiKey = await getUserKeyFromDB(userId, 'gemini');

    // Check managed AI keys (WiseResume AI backend)
    const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');
    const groqKey = Deno.env.get('GROQ_API_KEY');
    const legacyGeminiKey = Deno.env.get('VERTEX_API_KEY') || Deno.env.get('WISE_AI_API_KEY') || Deno.env.get('GEMINI_API_KEY');

    if (geminiKey) {
      // User BYOK Gemini: test directly
      provider = 'gemini';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
            generationConfig: { maxOutputTokens: 1 },
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
      latencyMs = Date.now() - startTime;
      if (response.ok) {
        status = latencyMs < 5000 ? 'healthy' : 'degraded';
      } else {
        errorCode = response.status;
        status = (response.status === 429 || response.status === 402) ? 'degraded' : 'down';
      }
    } else if (openrouterKey) {
      // Managed OpenRouter: quick health check
      provider = 'wiseresume';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openrouterKey}`,
            'HTTP-Referer': 'https://resume.thewise.cloud',
            'X-Title': 'WiseResume',
          },
          body: JSON.stringify({
            model: 'google/gemma-4-26b-a4b-it:free',
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 1,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        latencyMs = Date.now() - startTime;
        if (response.ok) {
          status = latencyMs < 8000 ? 'healthy' : 'degraded';
        } else {
          errorCode = response.status;
          status = (response.status === 429) ? 'degraded' : 'down';
        }
      } catch {
        clearTimeout(timeoutId);
        // OpenRouter unreachable — try Groq before reporting degraded
        if (groqKey) {
          const groqStart = Date.now();
          const groqController = new AbortController();
          const groqTimeout = setTimeout(() => groqController.abort(), 8_000);
          try {
            const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
              body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: 'Hi' }], max_tokens: 1 }),
              signal: groqController.signal,
            });
            clearTimeout(groqTimeout);
            latencyMs = Date.now() - groqStart;
            if (groqResp.ok) {
              status = latencyMs < 8000 ? 'healthy' : 'degraded';
            } else {
              errorCode = groqResp.status;
              status = (groqResp.status === 429) ? 'degraded' : 'down';
            }
          } catch {
            clearTimeout(groqTimeout);
            latencyMs = Date.now() - startTime;
            status = 'down';
          }
        } else {
          latencyMs = Date.now() - startTime;
          status = 'down';
        }
      }
    } else if (groqKey) {
      // Managed Groq: quick health check
      provider = 'wiseresume';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 1,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        latencyMs = Date.now() - startTime;
        if (response.ok) {
          status = latencyMs < 8000 ? 'healthy' : 'degraded';
        } else {
          errorCode = response.status;
          status = (response.status === 429) ? 'degraded' : 'down';
        }
      } catch {
        clearTimeout(timeoutId);
        latencyMs = Date.now() - startTime;
        status = 'down';
      }
    } else if (legacyGeminiKey) {
      // Legacy Gemini/Vertex key fallback
      provider = 'gemini';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${legacyGeminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
            generationConfig: { maxOutputTokens: 1 },
          }),
          signal: controller.signal,
        }
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
