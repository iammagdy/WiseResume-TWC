import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, authErrorResponse } from '../_shared/authMiddleware.ts';

function isOllamaCloud(url: string): boolean {
  return /ollama\.com/i.test(url);
}

function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Exact matches
    if (
      hostname === 'localhost' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname === '127.0.0.1' // Caught by regex too, but fast path
    ) {
      return true;
    }

    // IP ranges
    if (
      /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) || // 127.x.x.x loopback
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||  // 10.x.x.x private
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||     // 192.168.x.x private
      /^169\.254\.\d{1,3}\.\d{1,3}$/.test(hostname) ||     // 169.254.x.x link-local APIPA
      /^fc00:/.test(hostname) ||                           // IPv6 private/unique local
      /^fe80:/.test(hostname)                              // IPv6 link-local
    ) {
      return true;
    }

    // 172.16.x.x - 172.31.x.x private
    const match172 = /^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(hostname);
    if (match172) {
      const secondOctet = parseInt(match172[1], 10);
      if (secondOctet >= 16 && secondOctet <= 31) {
        return true;
      }
    }

    return false;
  } catch {
    // Unparseable URLs are effectively blocked/invalid
    return true;
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, client } = await requireAuth(req);

    const { apiKey, provider, baseUrl, model, modelsOnly } = await req.json();
    
    // Ollama may have empty API key; OpenRouter model refresh may send placeholder
    if (provider !== 'ollama' && provider !== 'openrouter' && (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10)) {
      return new Response(JSON.stringify({ isValid: false, error: 'Invalid API key format' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (provider !== 'gemini' && provider !== 'ollama' && provider !== 'openrouter') {
      return new Response(JSON.stringify({ isValid: false, error: 'Unsupported provider' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== OpenRouter validation =====
    if (provider === 'openrouter') {
      const orKey = (apiKey || '').trim();

      // Model list refresh mode: fetch public models list without key validation
      if (modelsOnly) {
        try {
          const modelsResponse = await fetch('https://openrouter.ai/api/v1/models');
          if (modelsResponse.ok) {
            const modelsData = await modelsResponse.json();
            const availableModels: string[] = (modelsData.data || []).map((m: any) => m.id).slice(0, 200);
            return new Response(JSON.stringify({ isValid: true, tier: 'paid', availableModels }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } catch {}
        return new Response(JSON.stringify({ isValid: true, tier: 'paid', availableModels: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        const modelsResponse = await fetch('https://openrouter.ai/api/v1/models', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${orKey}` },
        });

        if (!modelsResponse.ok) {
          const status = modelsResponse.status;
          const errText = await modelsResponse.text();
          if (status === 401 || status === 403) {
            return new Response(JSON.stringify({ isValid: false, error: 'Invalid OpenRouter API key' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          return new Response(JSON.stringify({ isValid: false, error: `OpenRouter validation failed: HTTP ${status} - ${errText.slice(0, 150)}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const modelsData = await modelsResponse.json();
        const availableModels: string[] = (modelsData.data || []).map((m: any) => m.id).slice(0, 200);

        console.log(`[validate] OpenRouter: found ${availableModels.length} models`);

        const testModel = model || (availableModels.includes('google/gemini-2.5-flash') ? 'google/gemini-2.5-flash' : availableModels[0]);
        if (testModel) {
          const completionResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${orKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: testModel,
              messages: [{ role: 'user', content: 'Say OK' }],
              max_tokens: 5,
              temperature: 0,
            }),
          });

          if (!completionResponse.ok) {
            const cStatus = completionResponse.status;
            const errText = await completionResponse.text();
            if (cStatus === 401 || cStatus === 403) {
              return new Response(JSON.stringify({ isValid: false, error: 'Invalid OpenRouter API key' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
            return new Response(JSON.stringify({ isValid: false, error: `Key valid but model "${testModel}" failed: HTTP ${cStatus} - ${errText.slice(0, 150)}` }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          await completionResponse.json();
        }

        return new Response(JSON.stringify({ isValid: true, tier: 'paid', availableModels }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (fetchErr) {
        console.error('[validate] OpenRouter fetch error:', fetchErr);
        return new Response(JSON.stringify({ isValid: false, error: 'Cannot connect to OpenRouter. Check your API key.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ===== Ollama validation =====
    if (provider === 'ollama') {

      if (!baseUrl) {
        return new Response(JSON.stringify({ isValid: false, error: 'Base URL is required for Ollama' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const cleanUrl = baseUrl.replace(/\/+$/, '');
      if (isPrivateUrl(cleanUrl)) {
        return new Response(JSON.stringify({ status: 400, isValid: false, error: 'Invalid base URL: private or reserved addresses are not allowed.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
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

    // ===== Gemini / Vertex AI validation =====

    const VERTEX_TEST_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'];
    const testModel = 'gemini-2.5-flash-lite';

    // Step 1: Validate key with a minimal generateContent call
    const testResponse = await fetch(
      `https://aiplatform.googleapis.com/v1/publishers/google/models/${testModel}:generateContent?key=${apiKey.trim()}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hi' }] }],
          generationConfig: { maxOutputTokens: 1 },
        }),
      }
    );

    if (!testResponse.ok) {
      const status = testResponse.status;
      const errText = await testResponse.text();
      const lower = errText.toLowerCase();
      if (status === 400 && (lower.includes('api_key_invalid') || lower.includes('api key not valid'))) {
        return new Response(JSON.stringify({ isValid: false, tier: 'unknown', error: 'Invalid API key' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 401 || status === 403) {
        return new Response(JSON.stringify({ isValid: false, tier: 'unknown', error: 'Invalid API key' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 429) {
        return new Response(JSON.stringify({ isValid: true, tier: 'free', availableModels: VERTEX_TEST_MODELS }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ isValid: false, tier: 'unknown', error: `Validation failed: ${status}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Key is valid — consume response
    await testResponse.json();

    // Step 2: Probe available models
    const availableModels: string[] = [];
    for (const model of VERTEX_TEST_MODELS) {
      if (model === testModel) {
        availableModels.push(model);
        continue;
      }
      try {
        const probeRes = await fetch(
          `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent?key=${apiKey.trim()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Hi' }] }],
              generationConfig: { maxOutputTokens: 1 },
            }),
          }
        );
        if (probeRes.ok) {
          availableModels.push(model);
        }
        await probeRes.text();
      } catch {
        // Skip unavailable models
      }
    }

    // Step 3: Tier detection via rate limit headers or RPM probe
    let tier: 'free' | 'paid' | 'unknown' = 'unknown';

    const headerEntries: Record<string, string> = {};
    testResponse.headers.forEach((v, k) => { headerEntries[k] = v; });
    console.log('[validate] Vertex AI response headers:', JSON.stringify(headerEntries));

    const rateLimitHeader = testResponse.headers.get('x-ratelimit-limit-requests')
      || testResponse.headers.get('x-ratelimit-limit-requests-per-model')
      || testResponse.headers.get('x-ratelimit-limit-requests-per-minute');

    if (rateLimitHeader) {
      const rpm = parseInt(rateLimitHeader, 10);
      if (!isNaN(rpm)) {
        tier = rpm < 100 ? 'free' : 'paid';
        console.log(`[validate] Tier from RPM header: ${tier} (rpm=${rpm})`);
      }
    }

    if (tier === 'unknown') {
      const rpdHeader = testResponse.headers.get('x-ratelimit-limit-requests-per-day');
      if (rpdHeader) {
        const rpd = parseInt(rpdHeader, 10);
        if (!isNaN(rpd)) {
          tier = rpd > 2000 ? 'paid' : 'free';
          console.log(`[validate] Tier from RPD header: ${tier} (rpd=${rpd})`);
        }
      }
    }

    // Vertex AI Express keys are generally "paid" (pay-as-you-go)
    if (tier === 'unknown') {
      tier = 'paid';
      console.log('[validate] Vertex AI key validated, defaulting to paid tier');
    }

    console.log(`[validate] Final tier: ${tier}`);

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
