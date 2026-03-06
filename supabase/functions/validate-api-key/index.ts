import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

function isOllamaCloud(url: string): boolean {
  return /ollama\.com/i.test(url);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { apiKey, provider, baseUrl, model } = await req.json();
    
    // Ollama may have empty API key (some setups don't need auth)
    if (provider !== 'ollama' && (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10)) {
      return new Response(JSON.stringify({ isValid: false, error: 'Invalid API key format' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (provider !== 'gemini' && provider !== 'ollama') {
      return new Response(JSON.stringify({ isValid: false, error: 'Unsupported provider' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== Ollama validation =====
    if (provider === 'ollama') {

      if (!baseUrl) {
        return new Response(JSON.stringify({ isValid: false, error: 'Base URL is required for Ollama' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const cleanUrl = baseUrl.replace(/\/+$/, '');
      const useNativeApi = isOllamaCloud(cleanUrl);
      
      const reqHeaders: Record<string, string> = {};
      if (apiKey.trim()) {
        reqHeaders['Authorization'] = `Bearer ${apiKey.trim()}`;
      }

      try {
        // Step 1: List models
        const modelsEndpoint = useNativeApi
          ? `${cleanUrl}/api/tags`
          : `${cleanUrl}/v1/models`;

        console.log(`[validate] Ollama: listing models at ${modelsEndpoint} (native=${useNativeApi})`);

        const modelsResponse = await fetch(modelsEndpoint, {
          method: 'GET',
          headers: reqHeaders,
        });

        if (!modelsResponse.ok) {
          const errText = await modelsResponse.text();
          const status = modelsResponse.status;
          let hint = '';
          if (status === 401 || status === 403) {
            hint = ' Check your API key. For Ollama Cloud, the base URL should be https://ollama.com';
          } else if (status === 404) {
            hint = useNativeApi
              ? ' The /api/tags endpoint was not found. Check the base URL.'
              : ' The /v1/models endpoint was not found. If using Ollama Cloud, set the URL to https://ollama.com';
          }
          return new Response(JSON.stringify({ isValid: false, error: `Connection failed: HTTP ${status} - ${errText.slice(0, 150)}.${hint}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const modelsData = await modelsResponse.json();
        
        // Parse models list differently based on API format
        let availableModels: string[] = [];
        if (useNativeApi) {
          // Native Ollama: { models: [{ name: "model:tag", ... }] }
          availableModels = modelsData.models?.map((m: any) => m.name || m.model) || [];
        } else {
          // OpenAI-compatible: { data: [{ id: "model" }] }
          availableModels = modelsData.data?.map((m: any) => m.id) || [];
        }

        console.log(`[validate] Ollama: found ${availableModels.length} models, native=${useNativeApi}`);

        // Step 2: Real completion test with the chosen model
        const testModel = model || availableModels[0];
        if (testModel) {
          let completionResponse: Response;

          if (useNativeApi) {
            // Native Ollama API: POST /api/chat
            completionResponse = await fetch(`${cleanUrl}/api/chat`, {
              method: 'POST',
              headers: { ...reqHeaders, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: testModel,
                messages: [{ role: 'user', content: 'Say OK' }],
                stream: false,
              }),
            });
          } else {
            // OpenAI-compatible: POST /v1/chat/completions
            completionResponse = await fetch(`${cleanUrl}/v1/chat/completions`, {
              method: 'POST',
              headers: { ...reqHeaders, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: testModel,
                messages: [{ role: 'user', content: 'Say OK' }],
                max_tokens: 5,
                temperature: 0,
              }),
            });
          }

          if (!completionResponse.ok) {
            const errText = await completionResponse.text();
            const cStatus = completionResponse.status;
            let hint = '';
            if (cStatus === 401 || cStatus === 403) {
              hint = ' Verify your API key and base URL.';
            } else if (cStatus === 404) {
              hint = useNativeApi
                ? ' The /api/chat endpoint was not found.'
                : ' The /v1/chat/completions endpoint was not found. If using Ollama Cloud, set URL to https://ollama.com';
            }
            return new Response(JSON.stringify({ 
              isValid: false, 
              error: `Connected but model "${testModel}" failed: HTTP ${cStatus} - ${errText.slice(0, 150)}.${hint}` 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          // Consume the body
          await completionResponse.json();
        }

        return new Response(JSON.stringify({ isValid: true, tier: 'paid', availableModels }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (fetchErr) {
        console.error('[validate] Ollama fetch error:', fetchErr);
        return new Response(JSON.stringify({ isValid: false, error: 'Cannot connect to Ollama server. Check the URL and API key.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ===== Gemini validation =====

    // Step 1: Validate by listing models
    const modelsResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`,
      { method: 'GET' }
    );

    if (!modelsResponse.ok) {
      const status = modelsResponse.status;
      if (status === 400 || status === 403) {
        return new Response(JSON.stringify({ isValid: false, tier: 'unknown', error: 'Invalid API key' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ isValid: false, tier: 'unknown', error: `Validation failed: ${status}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const modelsData = await modelsResponse.json();
    const allModels = modelsData.models
      ?.filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      ?.map((m: any) => m.name.replace('models/', '')) || [];

    // Filter to only useful generative models (exclude embedding, TTS, vision-only, etc.)
    const GEMINI_MODEL_PREFIXES = ['gemini-'];
    const EXCLUDED_SUFFIXES = ['-vision', '-embedding', '-aqa'];
    const availableModels = allModels.filter((name: string) => {
      const lower = name.toLowerCase();
      if (!GEMINI_MODEL_PREFIXES.some(p => lower.startsWith(p))) return false;
      if (EXCLUDED_SUFFIXES.some(s => lower.endsWith(s))) return false;
      if (lower.includes('embedding') || lower.includes('tts') || lower.includes('imagen')) return false;
      return true;
    });

    if (availableModels.length === 0) {
      return new Response(JSON.stringify({ isValid: false, tier: 'unknown', error: 'No compatible models available' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Detect tier via minimal request using a model we know exists
    const testModel = availableModels.includes('gemini-2.5-flash') ? 'gemini-2.5-flash' 
      : availableModels.includes('gemini-2.0-flash') ? 'gemini-2.0-flash'
      : availableModels[0];

    const tierResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${apiKey.trim()}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hi' }] }],
          generationConfig: { maxOutputTokens: 1 },
        }),
      }
    );

    let tier: 'free' | 'paid' | 'unknown' = 'unknown';

    // Check multiple rate limit headers for tier detection
    const rateLimitHeader = tierResponse.headers.get('x-ratelimit-limit-requests')
      || tierResponse.headers.get('x-ratelimit-limit-requests-per-model')
      || tierResponse.headers.get('x-ratelimit-limit-requests-per-minute');

    if (rateLimitHeader) {
      const rpm = parseInt(rateLimitHeader, 10);
      if (!isNaN(rpm)) {
        tier = rpm < 100 ? 'free' : 'paid';
      }
    }

    // If headers didn't give us tier info, check the response body for quota hints
    if (tier === 'unknown' && tierResponse.ok) {
      // Successful response — check remaining headers
      const remaining = tierResponse.headers.get('x-ratelimit-remaining-requests');
      if (remaining) {
        const rem = parseInt(remaining, 10);
        // Free tier has very low limits (typically 2-15 RPM)
        tier = rem < 50 ? 'free' : 'paid';
      }
    }

    // If tier detection via a 429 error
    if (tier === 'unknown' && tierResponse.status === 429) {
      const errorBody = await tierResponse.json().catch(() => null);
      const errorMsg = errorBody?.error?.message || '';
      if (errorMsg.includes('free') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        tier = 'free';
      }
    }

    // Default to free for safety
    if (tier === 'unknown') tier = 'free';

    return new Response(JSON.stringify({ isValid: true, tier, availableModels }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('validate-api-key error:', err);
    return new Response(JSON.stringify({ isValid: false, tier: 'unknown', error: 'Validation failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
