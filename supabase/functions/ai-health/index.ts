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

    // Health check budget needs to be generous: the badge auto-pings on
    // mount, every 90s, and on window focus across ALL open tabs. With a
    // 20/min cap a user with a couple tabs and a few reloads burns it in
    // under a minute, then we'd label upstream as "Rate limited" even
    // though it's our own self-throttle. 120/min comfortably covers
    // realistic multi-tab usage. The `error: 'health_throttled'` field
    // lets the client distinguish this from a real upstream 429.
    const { allowed } = await checkRateLimit(userId, { actionType: 'health_check', maxRequests: 120, windowSeconds: 60 });
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'health_throttled', message: 'Health check throttled — too many recent pings.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PROVIDER PARITY WITH agentic-chat:
    // The probe must hit the SAME provider + model that an actual chat
    // request would route to, otherwise the badge can show 'healthy' while
    // chat fails (or vice versa). We mirror agentic-chat's resolution order:
    //   1. user_preferences.ai_provider (BYOK Anthropic / OpenAI-compat)
    //      → fetch the user's stored key + model from ai_keys and call that
    //        provider's real endpoint with that exact model.
    //   2. BYOK Gemini key → google generativelanguage with the same
    //        gemini-2.5-flash-lite model the chat path uses.
    //   3. Managed OpenRouter / Groq fallbacks → same managed endpoints.
    // The model strings hard-coded below intentionally match the defaults
    // used by callAI() in supabase/functions/_shared/aiClient.ts.
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
              status = latencyMs < 15000 ? 'healthy' : 'degraded';
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
              status = latencyMs < 15000 ? 'healthy' : 'degraded';
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

    // PARITY: honor the global app_settings.wiseresume_ai_engine selection
    // so the badge probe targets the SAME managed engine that callAI() would
    // route a real chat through, instead of guessing from env-key presence
    // order. This mirrors getGlobalAIEngine() in _shared/aiClient.ts.
    let managedEngine: 'openrouter' | 'groq' | 'auto' = 'auto';
    try {
      const { data: engineRow } = await getServiceClient()
        .from('app_settings')
        .select('value')
        .eq('key', 'wiseresume_ai_engine')
        .maybeSingle();
      const v = engineRow?.value as string | undefined;
      if (v === 'openrouter' || v === 'groq' || v === 'auto') managedEngine = v;
    } catch {
      // fall through to 'auto'
    }
    // Resolve which managed key the probe should actually use:
    //  - explicit 'openrouter' → only OpenRouter (do not silently fall to Groq)
    //  - explicit 'groq'       → only Groq
    //  - 'auto'                → OpenRouter if present, else Groq
    const effectiveOpenrouterKey =
      managedEngine === 'groq' ? undefined :
      openrouterKey;
    const effectiveGroqKey =
      managedEngine === 'openrouter' ? undefined :
      groqKey;

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
    } else if (effectiveOpenrouterKey) {
      // Managed OpenRouter: quick health check
      provider = 'wiseresume';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${effectiveOpenrouterKey}`,
            'HTTP-Referer': 'https://resume.thewise.cloud',
            'X-Title': 'WiseResume',
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-3.3-70b-instruct:free',
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 1,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        latencyMs = Date.now() - startTime;
        if (response.ok) {
          status = latencyMs < 15000 ? 'healthy' : 'degraded';
        } else {
          errorCode = response.status;
          status = (response.status === 429) ? 'degraded' : 'down';
        }
      } catch {
        clearTimeout(timeoutId);
        // OpenRouter unreachable — only try Groq fallback if the global engine
        // setting allows it (i.e. 'auto'). Don't fall back when the admin has
        // pinned to OpenRouter.
        if (effectiveGroqKey && managedEngine !== 'openrouter') {
          const groqStart = Date.now();
          const groqController = new AbortController();
          const groqTimeout = setTimeout(() => groqController.abort(), 8_000);
          try {
            const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${effectiveGroqKey}` },
              body: JSON.stringify({ model: 'qwen/qwen3-32b', messages: [{ role: 'user', content: 'Hi' }], max_tokens: 1 }),
              signal: groqController.signal,
            });
            clearTimeout(groqTimeout);
            latencyMs = Date.now() - groqStart;
            if (groqResp.ok) {
              status = latencyMs < 15000 ? 'healthy' : 'degraded';
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
    } else if (effectiveGroqKey) {
      // Managed Groq: quick health check
      provider = 'wiseresume';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${effectiveGroqKey}`,
          },
          body: JSON.stringify({
            model: 'qwen/qwen3-32b',
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 1,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        latencyMs = Date.now() - startTime;
        if (response.ok) {
          status = latencyMs < 15000 ? 'healthy' : 'degraded';
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
