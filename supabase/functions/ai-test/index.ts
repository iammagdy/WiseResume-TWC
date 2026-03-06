import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI, getUserKeyFromDB, getUserKeyAndUrlFromDB } from "../_shared/aiClient.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's preferred provider
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('ai_provider')
      .eq('user_id', user.id)
      .maybeSingle();

    const preferredProvider = (prefs?.ai_provider as 'gemini' | 'ollama' | 'wiseresume') || 'wiseresume';

    // Resolve user keys
    let userGeminiKey: string | undefined;
    let ollamaConfig: { key: string; baseUrl: string | null; model: string | null } | undefined;

    if (preferredProvider === 'gemini') {
      userGeminiKey = await getUserKeyFromDB(user.id, 'gemini');
    } else if (preferredProvider === 'ollama') {
      ollamaConfig = await getUserKeyAndUrlFromDB(user.id, 'ollama');
    }

    const testModel = 'google/gemini-2.5-flash-lite';
    const aiResponse = await callAI({
      model: testModel,
      messages: [
        { role: 'system', content: 'You are a helpful AI. Reply with a short greeting that includes the name of the AI model you are. Keep it under 10 words.' },
        { role: 'user', content: 'Say hello and identify yourself.' },
      ],
      temperature: 0,
      maxTokens: 10,
      timeout: 15000,
      preferredProvider,
      userGeminiKey,
      userId: user.id,
    });

    const latencyMs = Date.now() - startTime;

    return new Response(JSON.stringify({
      success: true,
      providerUsed: aiResponse.providerUsed || preferredProvider,
      latencyMs,
      response: aiResponse.content?.trim() || 'OK',
      model: testModel,
      fallbackUsed: aiResponse.fallbackUsed || false,
      fallbackReason: aiResponse.fallbackReason || null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
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
