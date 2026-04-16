import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getUserKeyFromDB, getUserKeyAndUrlFromDB } from "../_shared/aiClient.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/authMiddleware.ts';
import { checkRateLimit } from '../_shared/rateLimiter.ts';
import { getServiceClient } from '../_shared/dbClient.ts';

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

    // Read user's configured AI provider so we test the right backend
    const { data: prefsData } = await getServiceClient()
      .from('user_preferences')
      .select('ai_provider')
      .eq('user_id', userId)
      .maybeSingle();
    const userProvider = prefsData?.ai_provider as string | undefined;

    const OPENAI_COMPAT_URLS: Record<string, string> = {
      openai: 'https://api.openai.com/v1/chat/completions',
      groq: 'https://api.groq.com/openai/v1/chat/completions',
      mistral: 'https://api.mistral.ai/v1/chat/completions',
      xai: 'https://api.x.ai/v1/chat/completions',
      cohere: 'https://api.cohere.com/compatibility/v1/chat/completions',
      openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    };

    // Non-Gemini BYOK provider configured — ping that provider's API.
    // If the user has declared a non-Gemini BYOK provider, always return based
    // on that provider's result — never silently fall back to platform keys.
    if (userProvider && userProvider !== 'wiseresume' && userProvider !== 'gemini' && userProvider !== 'ollama') {
      if (userProvider === 'anthropic') {
        // Anthropic uses a different auth header scheme
        const byokData = await getUserKeyAndUrlFromDB(userId, 'anthropic');
        provider = 'anthropic';
        latencyMs = Date.now() - startTime;
        if (!byokData?.key) {
          // Key declared but unreadable — report 'down' rather than falling through
          status = 'down';
          errorCode = 401;
        } else {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10_000);
          try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-api-key': byokData.key, 'anthropic-version': '2023-06-01' },
              body: JSON.stringify({ model: byokData.model || 'claude-3-5-haiku-latest', max_tokens: 1, messages: [{ role: 'user', content: 'Hi' }] }),
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            latencyMs = Date.now() - startTime;
            if (response.ok) {
              status = latencyMs < 8000 ? 'healthy' : 'degraded';
            } else {
              errorCode = response.status;
              status = (response.status === 429 || response.status === 402) ? 'degraded' : 'down';
            }
          } catch {
            clearTimeout(timeoutId);
            latencyMs = Date.now() - startTime;
            status = 'down';
          }
        }
        return new Response(JSON.stringify({ status, latencyMs, timestamp: new Date().toISOString(), provider, errorCode }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (OPENAI_COMPAT_URLS[userProvider]) {
        const byokData = await getUserKeyAndUrlFromDB(userId, userProvider);
        provider = userProvider;
        latencyMs = Date.now() - startTime;
        if (!byokData?.key) {
          // Key declared but unreadable — report 'down' rather than falling through
          status = 'down';
          errorCode = 401;
        } else {
          const completionsUrl = OPENAI_COMPAT_URLS[userProvider];
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10_000);
          try {
            const response = await fetch(completionsUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${byokData.key}` },
              body: JSON.stringify({ model: byokData.model || 'gpt-4o-mini', messages: [{ role: 'user', content: 'Hi' }], max_tokens: 1 }),
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            latencyMs = Date.now() - startTime;
            if (response.ok) {
              status = latencyMs < 8000 ? 'healthy' : 'degraded';
            } else {
              errorCode = response.status;
              status = (response.status === 429 || response.status === 402) ? 'degraded' : 'down';
            }
          } catch {
            clearTimeout(timeoutId);
            latencyMs = Date.now() - startTime;
            status = 'down';
          }
        }
        // Return early — we've tested the user's actual configured provider
        return new Response(JSON.stringify({ status, latencyMs, timestamp: new Date().toISOString(), provider, errorCode }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
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
