import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

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
      
      const reqHeaders: Record<string, string> = {};
      if (apiKey.trim()) {
        reqHeaders['Authorization'] = `Bearer ${apiKey.trim()}`;
      }

      try {
        // Step 1: List models to verify connectivity
        const modelsResponse = await fetch(`${cleanUrl}/v1/models`, {
          method: 'GET',
          headers: reqHeaders,
        });

        if (!modelsResponse.ok) {
          const errText = await modelsResponse.text();
          const status = modelsResponse.status;
          let hint = '';
          if (status === 401 || status === 403) {
            hint = ' Check your API key and ensure the URL is correct (Ollama Cloud uses https://ollama.com).';
          }
          return new Response(JSON.stringify({ isValid: false, error: `Connection failed: HTTP ${status} - ${errText.slice(0, 150)}.${hint}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const modelsData = await modelsResponse.json();
        const availableModels = modelsData.data?.map((m: any) => m.id) || [];

        // Step 2: Real completion test with the chosen model
        const testModel = model || availableModels[0];
        if (testModel) {
          const completionResponse = await fetch(`${cleanUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: { ...reqHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: testModel,
              messages: [{ role: 'user', content: 'Say OK' }],
              max_tokens: 5,
              temperature: 0,
            }),
          });

          if (!completionResponse.ok) {
            const errText = await completionResponse.text();
            return new Response(JSON.stringify({ 
              isValid: false, 
              error: `Connected but model "${testModel}" failed: HTTP ${completionResponse.status} - ${errText.slice(0, 200)}` 
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
    const availableModels = modelsData.models
      ?.filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      ?.map((m: any) => m.name.replace('models/', '')) || [];

    if (availableModels.length === 0) {
      return new Response(JSON.stringify({ isValid: false, tier: 'unknown', error: 'No compatible models available' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Detect tier via minimal request
    const tierResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey.trim()}`,
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
    const rateLimitHeader = tierResponse.headers.get('x-ratelimit-limit-requests');
    if (rateLimitHeader) {
      const rpm = parseInt(rateLimitHeader, 10);
      if (!isNaN(rpm)) {
        tier = rpm < 100 ? 'free' : 'paid';
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
