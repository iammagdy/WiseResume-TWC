import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getUserKeyFromDB } from "../_shared/aiClient.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let status: 'healthy' | 'degraded' | 'down' = 'down';
  let latencyMs = 0;
  let provider: 'wiseresume' | 'gemini' = 'wiseresume';
  let errorCode: number | null = null;

  try {
    // Resolve user's Gemini key server-side from DB (if authenticated)
    let userGeminiKey: string | undefined;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_ANON_KEY')!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const token = authHeader.replace('Bearer ', '');
        const { data: claimsData } = await supabase.auth.getClaims(token);
        const userId = claimsData?.claims?.sub;
        if (userId) {
          userGeminiKey = await getUserKeyFromDB(userId, 'gemini');
        }
      } catch {
        // If auth fails, fall through to wiseresume check
      }
    }

    provider = userGeminiKey ? 'gemini' : 'wiseresume';

    if (userGeminiKey) {
      // Gemini: lightweight model info call (free, no tokens consumed)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite?key=${userGeminiKey}`,
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
      // WiseResume (Lovable AI Gateway): verify backend is alive
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      latencyMs = Date.now() - startTime;

      if (LOVABLE_API_KEY) {
        status = 'healthy';
      } else {
        status = 'down';
        errorCode = 500;
      }
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
