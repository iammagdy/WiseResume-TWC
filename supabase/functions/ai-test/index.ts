import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI, getUserKeyFromDB, getUserKeyAndUrlFromDB } from "../_shared/aiClient.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, authErrorResponse } from '../_shared/authMiddleware.ts';
import { checkRateLimit } from '../_shared/rateLimiter.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Auth via manual JWT decode (cross-project compatible)
    const { userId, client: supabaseAdmin } = await requireAuth(req);

    const { allowed } = await checkRateLimit(userId, { actionType: 'test_check', maxRequests: 10, windowSeconds: 60 });
    if (!allowed) {
      return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded" }), { status: 429, headers: corsHeaders });
    }

    // Parse request body for potential 'checkOnly' flag and client-provided sub-provider
    let checkOnly = false;
    let bodySubProvider: 'openrouter' | 'groq' | 'auto' | undefined;
    try {
      const text = await req.clone().text();
      if (text) {
        const body = JSON.parse(text);
        checkOnly = body?.checkOnly === true;
        if (body?.wiseresumeSubProvider === 'openrouter' || body?.wiseresumeSubProvider === 'groq' || body?.wiseresumeSubProvider === 'auto') {
          bodySubProvider = body.wiseresumeSubProvider;
        }
      }
    } catch {
      // Ignore parse errors for empty/invalid bodies
    }

    // Get user's preferred provider (use service-role client for cross-project DB)
    const { data: prefs } = await supabaseAdmin
      .from('user_preferences')
      .select('ai_provider')
      .eq('user_id', userId)
      .maybeSingle();

    const preferredProvider = (prefs?.ai_provider as 'gemini' | 'ollama' | 'openrouter' | 'wiseresume') || 'wiseresume';

    // Determine WiseResume sub-provider:
    // body-provided value (admin Dev Kit override) takes priority;
    // otherwise fall back to the global wiseresume_ai_engine app setting.
    let wiseresumeSubProvider: 'openrouter' | 'groq' | 'auto' = bodySubProvider ?? 'auto';
    if (!bodySubProvider) {
      const { data: engineRow } = await supabaseAdmin
        .from('app_settings')
        .select('value')
        .eq('key', 'wiseresume_ai_engine')
        .maybeSingle();
      const engineVal = engineRow?.value as string | undefined;
      if (engineVal === 'openrouter' || engineVal === 'groq' || engineVal === 'auto') {
        wiseresumeSubProvider = engineVal;
      }
    }

    // ===== Cooldown Check for WiseResume AI =====
    if (preferredProvider === 'wiseresume') {
      const COOLDOWN_SECONDS = 300; // 5 minutes
      console.log(`[ai-test] Checking cooldown for user: ${userId}`);
      
      const { data: lastTest, error: logError } = await supabaseAdmin
        .from('ai_usage_logs')
        .select('created_at')
        .eq('user_id', userId)
        .eq('action_type', 'test')
        .filter('metadata->>provider', 'eq', 'wiseresume')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (logError) {
        console.error('[ai-test] Error fetching usage logs:', logError);
      }

      if (lastTest) {
        const lastTestAt = new Date(lastTest.created_at).getTime();
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - lastTestAt) / 1000);
        console.log(`[ai-test] Last test was ${elapsedSeconds}s ago`);
        
        if (elapsedSeconds < COOLDOWN_SECONDS) {
          const secondsRemaining = COOLDOWN_SECONDS - elapsedSeconds;
          return new Response(JSON.stringify({
            success: false,
            reason: 'cooldown',
            secondsRemaining,
            cooldownEndsAt: new Date(lastTestAt + COOLDOWN_SECONDS * 1000).toISOString(),
            message: `Please wait ${Math.ceil(secondsRemaining / 60)} more minutes before testing again.`
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        console.log('[ai-test] No previous test found for WiseResume AI');
      }
    }

    // If checkOnly was requested and we passed the cooldown check, return OK
    if (checkOnly) {
      console.log('[ai-test] Cooldown check passed (checkOnly)');
      return new Response(JSON.stringify({ success: true, cooldownActive: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve user keys
    let userGeminiKey: string | undefined;
    let ollamaConfig: { key: string; baseUrl: string | null; model: string | null } | undefined;
    let testModel = 'google/gemma-4-26b-a4b-it:free';

    if (preferredProvider === 'gemini') {
      userGeminiKey = await getUserKeyFromDB(userId, 'gemini');
      testModel = 'gemini-2.5-flash-lite';
    } else if (preferredProvider === 'ollama') {
      ollamaConfig = await getUserKeyAndUrlFromDB(userId, 'ollama');
    }

    const identityMap: Record<string, string> = {
      wiseresume: "Hello! I'm Wise Resume AI",
      gemini: "Hello! I'm Gemini AI",
      ollama: "Hello! I'm Ollama AI",
      openrouter: "Hello! I'm OpenRouter AI",
    };
    const expectedGreeting = identityMap[preferredProvider] || identityMap.wiseresume;

    console.log(`[ai-test] Calling AI for provider: ${preferredProvider}, sub: ${wiseresumeSubProvider}, model: ${testModel}`);
    const aiResponse = await callAI({
      model: testModel,
      messages: [
        { role: 'system', content: `Reply with exactly this text and nothing else: "${expectedGreeting}"` },
        { role: 'user', content: 'Say hello and identify yourself.' },
      ],
      temperature: 0,
      maxTokens: 50,
      timeout: 20000,
      preferredProvider,
      wiseresumeSubProvider,
      userGeminiKey,
      userId,
    });

    const latencyMs = Date.now() - startTime;
    const providerUsed = aiResponse.providerUsed || preferredProvider;
    console.log(`[ai-test] AI responded in ${latencyMs}ms using ${providerUsed}`);

    // Log test call
    const { error: insertError } = await supabaseAdmin.from('ai_usage_logs').insert({
      user_id: userId,
      action_type: 'test',
      metadata: {
        provider: providerUsed,
        model: testModel,
        latencyMs,
        response: (aiResponse.content?.trim() || 'OK').slice(0, 100),
        fallbackUsed: aiResponse.fallbackUsed || false,
      },
    });

    if (insertError) {
      console.error('[ai-test] Failed to log usage:', insertError);
    }

    // Brand the response for WiseResume AI so clients never see raw sub-provider names
    const isWiseresumeMode = preferredProvider === 'wiseresume' && !bodySubProvider;
    const displayProvider = isWiseresumeMode ? 'WiseResume AI' : providerUsed;
    const displayModel = isWiseresumeMode ? undefined : testModel;

    return new Response(JSON.stringify({
      success: true,
      providerUsed,
      displayProvider,
      displayModel,
      latencyMs,
      response: aiResponse.content?.trim() || 'OK',
      model: testModel,
      fallbackUsed: aiResponse.fallbackUsed || false,
      fallbackReason: aiResponse.fallbackReason || null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[ai-test] Unhandled error:', err);
    // If it's an auth error from requireAuth, return it properly
    if (typeof err === 'object' && err !== null && 'status' in err) {
      return authErrorResponse(err, req.headers.get('origin'));
    }
    const latencyMs = Date.now() - startTime;
    return new Response(JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      latencyMs,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
