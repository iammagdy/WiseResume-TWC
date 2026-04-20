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
    const openrouter2Key = Deno.env.get('OPENROUTER2_API_KEY');
    const groqKey = Deno.env.get('GROQ_API_KEY');
    const legacyGeminiKey = Deno.env.get('VERTEX_API_KEY') || Deno.env.get('WISE_AI_API_KEY') || Deno.env.get('GEMINI_API_KEY');

    // PARITY: honor the global app_settings.wiseresume_ai_engine selection
    // so the badge probe targets the SAME managed engine that callAI() would
    // route a real chat through, instead of guessing from env-key presence
    // order. This mirrors getGlobalAIEngine() in _shared/aiClient.ts.
    let managedEngine: 'openrouter' | 'groq' | 'auto' | 'openrouter2' = 'auto';
    try {
      const { data: engineRow } = await getServiceClient()
        .from('app_settings')
        .select('value')
        .eq('key', 'wiseresume_ai_engine')
        .maybeSingle();
      const v = engineRow?.value as string | undefined;
      if (v === 'openrouter' || v === 'groq' || v === 'auto' || v === 'openrouter2') managedEngine = v;
    } catch {
      // fall through to 'auto'
    }
    // Resolve which managed key the probe should actually use. The probe
    // talks to openrouter.ai for both OpenRouter accounts (same upstream),
    // so the only thing that changes between 'openrouter' and 'openrouter2'
    // is which API key + which model slug the probe sends:
    //  - explicit 'openrouter'  → primary OPENROUTER_API_KEY + free-model probe
    //  - explicit 'openrouter2' → secondary OPENROUTER2_API_KEY + pinned
    //                              `openrouter/elephant-alpha`. Previously the
    //                              probe wrongly used OPENROUTER_API_KEY here,
    //                              so the badge could go green while the
    //                              actual second account was broken (or red
    //                              when the second was healthy and only the
    //                              primary was missing).
    //  - explicit 'groq'        → only Groq
    //  - 'auto'                 → OpenRouter (1) if present, else Groq.
    //                              OpenRouter 2 is not probed in 'auto' mode
    //                              because callAI's auto chain falls through
    //                              from OpenRouter 1 to OpenRouter 2 anyway —
    //                              probing #1 is sufficient for the badge.
    const usingOpenrouter2 = managedEngine === 'openrouter2';
    const effectiveOpenrouterKey =
      managedEngine === 'groq' ? undefined :
      usingOpenrouter2 ? openrouter2Key :
      openrouterKey;
    const effectiveOpenrouterProbeModel = usingOpenrouter2
      ? 'openrouter/elephant-alpha'
      : 'meta-llama/llama-3.3-70b-instruct:free';
    const effectiveGroqKey =
      managedEngine === 'openrouter' || managedEngine === 'openrouter2' ? undefined :
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
    } else if (effectiveOpenrouterKey || (managedEngine === 'auto' && openrouter2Key)) {
      // Managed OpenRouter probe. The badge has to mirror what a real chat
      // call would experience, so when the engine is 'auto' we walk the same
      // chain callWiseresumeAI does: openrouter → openrouter2 → groq.
      // Previously the probe only looked at the primary OpenRouter key, so a
      // 429/402 there made the badge yell "AI Slow / Rate limited" even
      // though every actual chat call was being served happily by
      // OpenRouter 2 or Groq. The chain stops at the first probe that
      // returns 200 and reports the latency from that probe.
      provider = 'wiseresume';
      type Probe = { label: 'openrouter' | 'openrouter2' | 'groq'; key: string; url: string; model: string; extraHeaders?: Record<string, string> };
      const probes: Probe[] = [];
      if (effectiveOpenrouterKey) {
        probes.push({
          label: usingOpenrouter2 ? 'openrouter2' : 'openrouter',
          key: effectiveOpenrouterKey,
          url: 'https://openrouter.ai/api/v1/chat/completions',
          model: effectiveOpenrouterProbeModel,
          extraHeaders: { 'HTTP-Referer': 'https://resume.thewise.cloud', 'X-Title': 'WiseResume' },
        });
      }
      // In 'auto' mode also chain through OpenRouter 2 and Groq so a 429 on
      // the primary key doesn't poison the badge when the fallback chain is
      // healthy. When the admin has explicitly pinned to 'openrouter' or
      // 'openrouter2' we do NOT cross over — they want to see that single
      // engine's true state.
      if (managedEngine === 'auto') {
        if (openrouter2Key && !usingOpenrouter2) {
          probes.push({
            label: 'openrouter2',
            key: openrouter2Key,
            url: 'https://openrouter.ai/api/v1/chat/completions',
            model: 'openrouter/elephant-alpha',
            extraHeaders: { 'HTTP-Referer': 'https://resume.thewise.cloud', 'X-Title': 'WiseResume' },
          });
        }
        if (effectiveGroqKey) {
          probes.push({
            label: 'groq',
            key: effectiveGroqKey,
            url: 'https://api.groq.com/openai/v1/chat/completions',
            model: 'qwen/qwen3-32b',
          });
        }
      }

      let lastErrorCode: number | null = null;
      let success = false;
      for (const probe of probes) {
        const probeStart = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10_000);
        try {
          const response = await fetch(probe.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${probe.key}`,
              ...(probe.extraHeaders ?? {}),
            },
            body: JSON.stringify({
              model: probe.model,
              messages: [{ role: 'user', content: 'Hi' }],
              max_tokens: 1,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (response.ok) {
            latencyMs = Date.now() - probeStart;
            status = latencyMs < 15000 ? 'healthy' : 'degraded';
            errorCode = null;
            success = true;
            break;
          }
          lastErrorCode = response.status;
        } catch {
          clearTimeout(timeoutId);
          // network/timeout — try the next probe in the chain
        }
      }
      if (!success) {
        latencyMs = Date.now() - startTime;
        if (lastErrorCode !== null) {
          errorCode = lastErrorCode;
          status = (lastErrorCode === 429) ? 'degraded' : 'down';
        } else {
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
