import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI, getUserKeyFromDB, getUserKeyAndUrlFromDB } from "../_shared/aiClient.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, authErrorResponse } from '../_shared/authMiddleware.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Auth via manual JWT decode (cross-project compatible)
    const { userId, client: supabaseAdmin } = await requireAuth(req);

    // Get user's preferred provider (use service-role client for cross-project DB)
    const { data: prefs } = await supabaseAdmin
      .from('user_preferences')
      .select('ai_provider')
      .eq('user_id', userId)
      .maybeSingle();

    const preferredProvider = (prefs?.ai_provider as 'gemini' | 'ollama' | 'wiseresume') || 'wiseresume';

    // Resolve user keys
    let userGeminiKey: string | undefined;
    let ollamaConfig: { key: string; baseUrl: string | null; model: string | null } | undefined;
    let testModel = 'google/gemini-2.5-flash';

    if (preferredProvider === 'gemini') {
      userGeminiKey = await getUserKeyFromDB(userId, 'gemini');
      const { data: keyData } = await supabaseAdmin
        .from('user_api_keys')
        .select('model')
        .eq('user_id', userId)
        .eq('provider', 'gemini')
        .maybeSingle();
      if (keyData?.model) {
        testModel = keyData.model.startsWith('google/') || keyData.model.startsWith('gemini-')
          ? (keyData.model.startsWith('gemini-') ? `google/${keyData.model}` : keyData.model)
          : `google/${keyData.model}`;
      }
    } else if (preferredProvider === 'ollama') {
      ollamaConfig = await getUserKeyAndUrlFromDB(userId, 'ollama');
    }

    const identityMap: Record<string, string> = {
      wiseresume: "Hello! I'm Wise Resume AI",
      gemini: "Hello! I'm Gemini AI",
      ollama: "Hello! I'm Ollama AI",
    };
    const expectedGreeting = identityMap[preferredProvider] || identityMap.wiseresume;

    const aiResponse = await callAI({
      model: testModel,
      messages: [
        { role: 'system', content: `Reply with exactly this text and nothing else: "${expectedGreeting}"` },
        { role: 'user', content: 'Say hello and identify yourself.' },
      ],
      temperature: 0,
      maxTokens: 10,
      timeout: 15000,
      preferredProvider,
      userGeminiKey,
      userId,
    });

    const latencyMs = Date.now() - startTime;
    const providerUsed = aiResponse.providerUsed || preferredProvider;

    // Log test call
    await supabaseAdmin.from('ai_usage_logs').insert({
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

    return new Response(JSON.stringify({
      success: true,
      providerUsed,
      latencyMs,
      response: aiResponse.content?.trim() || 'OK',
      model: testModel,
      fallbackUsed: aiResponse.fallbackUsed || false,
      fallbackReason: aiResponse.fallbackReason || null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
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
