import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, authErrorResponse } from '../_shared/authMiddleware.ts';

function isOllamaCloud(url: string): boolean {
  return /ollama\.com/i.test(url);
}

function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    if (
      hostname === 'localhost' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname === '127.0.0.1'
    ) {
      return true;
    }

    if (
      /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^169\.254\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^fc00:/.test(hostname) ||
      /^fe80:/.test(hostname)
    ) {
      return true;
    }

    const match172 = /^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(hostname);
    if (match172) {
      const secondOctet = parseInt(match172[1], 10);
      if (secondOctet >= 16 && secondOctet <= 31) {
        return true;
      }
    }

    return false;
  } catch {
    return true;
  }
}

/**
 * Fetches model IDs from an OpenAI-compatible /v1/models endpoint.
 * Returns an array of model ID strings, or the fallback list on error.
 */
async function fetchOpenAICompatModels(
  apiKey: string,
  modelsUrl: string,
  fallback: string[],
): Promise<string[]> {
  try {
    const resp = await fetch(modelsUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!resp.ok) return fallback;
    const data = await resp.json() as { data?: Array<{ id: string }> };
    const ids = (data.data || []).map(m => m.id).filter(Boolean);
    return ids.length > 0 ? ids : fallback;
  } catch {
    return fallback;
  }
}

/** Generic OpenAI-compatible validation: sends a tiny chat request and returns { isValid, tier } */
async function validateOpenAICompat(
  apiKey: string,
  completionsUrl: string,
  providerName: string,
  model: string,
): Promise<{ isValid: boolean; tier: string; error?: string }> {
  try {
    const resp = await fetch(completionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Say OK' }],
        max_tokens: 5,
        temperature: 0,
      }),
    });

    if (resp.ok) {
      await resp.json();
      return { isValid: true, tier: 'paid' };
    }

    const status = resp.status;
    const errText = await resp.text();
    if (status === 401 || status === 403) {
      return { isValid: false, tier: 'unknown', error: `Invalid ${providerName} API key` };
    }
    if (status === 429) {
      // Rate limited but key is valid
      return { isValid: true, tier: 'paid' };
    }
    return { isValid: false, tier: 'unknown', error: `${providerName} returned HTTP ${status}: ${errText.slice(0, 120)}` };
  } catch (err) {
    return { isValid: false, tier: 'unknown', error: `Cannot reach ${providerName}. Check your API key.` };
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let authResult: Awaited<ReturnType<typeof requireAuth>>;
  try {
    authResult = await requireAuth(req);
  } catch (authErr) {
    return authErrorResponse(authErr, req.headers.get('origin'));
  }
  const { userId, client } = authResult;

  try {
    const { apiKey, provider, baseUrl, model, modelsOnly, wiseresumeSubProvider } = await req.json();

    // ===== WiseResume AI (managed) =====
    if (provider === 'wiseresume') {
      const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');
      const groqKey = Deno.env.get('GROQ_API_KEY');
      const sub = wiseresumeSubProvider || 'auto';

      if (!openrouterKey && !groqKey) {
        return new Response(JSON.stringify({
          isValid: false,
          error: 'WiseResume AI is not configured. Please contact support.',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      let testEngine: 'openrouter' | 'groq';
      if (sub === 'openrouter') {
        if (!openrouterKey) {
          return new Response(JSON.stringify({
            isValid: false,
            error: 'OpenRouter engine is not configured. Please contact support.',
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        testEngine = 'openrouter';
      } else if (sub === 'groq') {
        if (!groqKey) {
          return new Response(JSON.stringify({
            isValid: false,
            error: 'Groq engine is not configured. Please contact support.',
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        testEngine = 'groq';
      } else {
        testEngine = openrouterKey ? 'openrouter' : 'groq';
      }

      try {
        let resp: Response;
        if (testEngine === 'groq' && groqKey) {
          resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
            body: JSON.stringify({ model: 'qwen/qwen3-32b', messages: [{ role: 'user', content: 'Hi' }], max_tokens: 1 }),
          });
        } else if (openrouterKey) {
          resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openrouterKey}`,
              'HTTP-Referer': 'https://resume.thewise.cloud',
              'X-Title': 'WiseResume',
            },
            body: JSON.stringify({ model: 'meta-llama/llama-3.3-70b-instruct:free', messages: [{ role: 'user', content: 'Hi' }], max_tokens: 1 }),
          });
        } else {
          throw new Error('No key available');
        }

        if (resp.ok) {
          return new Response(JSON.stringify({
            isValid: true,
            tier: 'free',
            engine: testEngine,
            message: `WiseResume AI (${testEngine === 'groq' ? 'Groq — Qwen 3 32B' : 'OpenRouter — Gemma 4'}) is working.`,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const errText = await resp.text();
        return new Response(JSON.stringify({
          isValid: false,
          engine: testEngine,
          error: `WiseResume AI (${testEngine}) returned HTTP ${resp.status}: ${errText.slice(0, 120)}`,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (fetchErr) {
        return new Response(JSON.stringify({
          isValid: false,
          error: `Cannot reach WiseResume AI (${testEngine}). Please try again later.`,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // For all non-wiseresume providers, require a real API key (except ollama + openrouter which allow empty)
    const keyTrimmed = (apiKey || '').trim();
    if (provider !== 'ollama' && provider !== 'openrouter' && keyTrimmed.length < 8) {
      return new Response(JSON.stringify({ isValid: false, error: 'Invalid API key format' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Curated model lists for modelsOnly responses
    const OPENAI_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'o1', 'o1-mini', 'o3-mini'];
    const ANTHROPIC_MODELS = ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'];
    const GROQ_MODELS = ['qwen/qwen3-32b', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'llama-3.2-11b-vision-preview', 'mixtral-8x7b-32768', 'gemma2-9b-it'];
    const MISTRAL_MODELS = ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'codestral-latest', 'open-mistral-nemo'];
    const XAI_MODELS = ['grok-3', 'grok-3-mini', 'grok-2-latest', 'grok-2-mini'];
    const COHERE_MODELS = ['command-r-plus', 'command-r', 'command-nightly'];

    // ===== OpenAI validation =====
    if (provider === 'openai') {
      // Fetch live model list from OpenAI; fall back to curated list on error
      const availableModels = await fetchOpenAICompatModels(
        keyTrimmed,
        'https://api.openai.com/v1/models',
        OPENAI_MODELS,
      );
      if (modelsOnly) {
        return new Response(JSON.stringify({ isValid: true, tier: 'paid', availableModels }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const testModel = model || 'gpt-4o-mini';
      const result = await validateOpenAICompat(
        keyTrimmed,
        'https://api.openai.com/v1/chat/completions',
        'OpenAI',
        testModel,
      );
      return new Response(JSON.stringify({ ...result, model: testModel, availableModels }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== Anthropic (Claude) validation =====
    if (provider === 'anthropic') {
      // Anthropic does not expose a public models list endpoint; use curated list
      const availableModels = ANTHROPIC_MODELS;
      if (modelsOnly) {
        return new Response(JSON.stringify({ isValid: true, tier: 'paid', availableModels }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const testModel = model || 'claude-3-5-haiku-20241022';
      try {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': keyTrimmed,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: testModel,
            max_tokens: 5,
            messages: [{ role: 'user', content: 'Say OK' }],
          }),
        });

        if (resp.ok) {
          await resp.json();
          return new Response(JSON.stringify({ isValid: true, tier: 'paid', model: testModel, availableModels }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const status = resp.status;
        const errText = await resp.text();
        if (status === 401 || status === 403) {
          return new Response(JSON.stringify({ isValid: false, error: 'Invalid Anthropic API key' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (status === 429) {
          return new Response(JSON.stringify({ isValid: true, tier: 'paid', model: testModel, availableModels }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ isValid: false, error: `Anthropic returned HTTP ${status}: ${errText.slice(0, 120)}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch {
        return new Response(JSON.stringify({ isValid: false, error: 'Cannot reach Anthropic. Check your API key.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ===== Groq (BYOK) validation =====
    if (provider === 'groq') {
      // Fetch live model list from Groq; fall back to curated list on error
      const availableModels = await fetchOpenAICompatModels(
        keyTrimmed,
        'https://api.groq.com/openai/v1/models',
        GROQ_MODELS,
      );
      if (modelsOnly) {
        return new Response(JSON.stringify({ isValid: true, tier: 'paid', availableModels }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const testModel = model || 'qwen/qwen3-32b';
      const result = await validateOpenAICompat(
        keyTrimmed,
        'https://api.groq.com/openai/v1/chat/completions',
        'Groq',
        testModel,
      );
      return new Response(JSON.stringify({ ...result, model: testModel, availableModels }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== Mistral AI validation =====
    if (provider === 'mistral') {
      // Fetch live model list from Mistral; fall back to curated list on error
      const availableModels = await fetchOpenAICompatModels(
        keyTrimmed,
        'https://api.mistral.ai/v1/models',
        MISTRAL_MODELS,
      );
      if (modelsOnly) {
        return new Response(JSON.stringify({ isValid: true, tier: 'paid', availableModels }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const testModel = model || 'mistral-small-latest';
      const result = await validateOpenAICompat(
        keyTrimmed,
        'https://api.mistral.ai/v1/chat/completions',
        'Mistral',
        testModel,
      );
      return new Response(JSON.stringify({ ...result, model: testModel, availableModels }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== xAI (Grok) validation =====
    if (provider === 'xai') {
      // Fetch live model list from xAI; fall back to curated list on error
      const availableModels = await fetchOpenAICompatModels(
        keyTrimmed,
        'https://api.x.ai/v1/models',
        XAI_MODELS,
      );
      if (modelsOnly) {
        return new Response(JSON.stringify({ isValid: true, tier: 'paid', availableModels }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const testModel = model || 'grok-2-mini';
      const result = await validateOpenAICompat(
        keyTrimmed,
        'https://api.x.ai/v1/chat/completions',
        'xAI',
        testModel,
      );
      return new Response(JSON.stringify({ ...result, model: testModel, availableModels }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== Cohere validation =====
    if (provider === 'cohere') {
      // Fetch live model list from Cohere compatibility endpoint; fall back to curated list
      const availableModels = await fetchOpenAICompatModels(
        keyTrimmed,
        'https://api.cohere.com/compatibility/v1/models',
        COHERE_MODELS,
      );
      if (modelsOnly) {
        return new Response(JSON.stringify({ isValid: true, tier: 'paid', availableModels }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const testModel = model || 'command-r';
      const result = await validateOpenAICompat(
        keyTrimmed,
        'https://api.cohere.com/compatibility/v1/chat/completions',
        'Cohere',
        testModel,
      );
      return new Response(JSON.stringify({ ...result, model: testModel, availableModels }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== OpenRouter validation =====
    if (provider === 'openrouter') {
      const orKey = keyTrimmed;

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
      if (keyTrimmed) {
        reqHeaders['Authorization'] = `Bearer ${keyTrimmed}`;
      }

      try {
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
        
        let availableModels: string[] = [];
        if (useNativeApi) {
          availableModels = modelsData.models?.map((m: any) => m.name || m.model) || [];
        } else {
          availableModels = modelsData.data?.map((m: any) => m.id) || [];
        }

        console.log(`[validate] Ollama: found ${availableModels.length} models, native=${useNativeApi}`);

        const testModel = model || availableModels[0];
        if (testModel) {
          let completionResponse: Response;

          if (useNativeApi) {
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
    if (provider === 'gemini') {
      const GEMINI_TEST_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'];
      const testModel = 'gemini-2.5-flash-lite';

      const testResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${keyTrimmed}`,
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
          return new Response(JSON.stringify({ isValid: true, tier: 'free', availableModels: GEMINI_TEST_MODELS }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ isValid: false, tier: 'unknown', error: `Validation failed: ${status}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await testResponse.json();

      const availableModels: string[] = [];
      for (const m of GEMINI_TEST_MODELS) {
        if (m === testModel) {
          availableModels.push(m);
          continue;
        }
        try {
          const probeRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${keyTrimmed}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: 'Hi' }] }],
                generationConfig: { maxOutputTokens: 1 },
              }),
            }
          );
          if (probeRes.ok) availableModels.push(m);
          await probeRes.text();
        } catch {
          // Skip unavailable models
        }
      }

      let tier: 'free' | 'paid' | 'unknown' = 'unknown';
      const rateLimitHeader = testResponse.headers.get('x-ratelimit-limit-requests')
        || testResponse.headers.get('x-ratelimit-limit-requests-per-model')
        || testResponse.headers.get('x-ratelimit-limit-requests-per-minute');

      if (rateLimitHeader) {
        const rpm = parseInt(rateLimitHeader, 10);
        if (!isNaN(rpm)) tier = rpm < 100 ? 'free' : 'paid';
      }

      if (tier === 'unknown') {
        const rpdHeader = testResponse.headers.get('x-ratelimit-limit-requests-per-day');
        if (rpdHeader) {
          const rpd = parseInt(rpdHeader, 10);
          if (!isNaN(rpd)) tier = rpd > 2000 ? 'paid' : 'free';
        }
      }

      if (tier === 'unknown') tier = 'paid';

      return new Response(JSON.stringify({ isValid: true, tier, availableModels }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ isValid: false, error: 'Unsupported provider' }), {
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
