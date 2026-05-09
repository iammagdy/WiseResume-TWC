'use strict';

const axios = require('axios');
const sdk = require('node-appwrite');

// ─── Datadog LLM Observability ────────────────────────────────────────────────
// Initialise dd-trace at module level (once per cold start).
// Agentless mode is required — Appwrite Functions cannot run a Datadog agent sidecar.
// Observability is best-effort: when the API key is absent all AI calls continue normally.
const ddTrace = require('dd-trace');
const tracer = ddTrace.init({ logInjection: false });
const llmobs = tracer.llmobs;

let _llmobsEnabled = false;

function enableLLMObs() {
  if (_llmobsEnabled) return;
  // Accept DATADOG_API_KEY (Appwrite global variable) with fallback to DD_API_KEY.
  const ddApiKey = process.env.DATADOG_API_KEY || process.env.DD_API_KEY;
  const ddSite   = process.env.DD_SITE || 'datadoghq.com';
  if (!ddApiKey) return;
  try {
    llmobs.enable({ mlApp: 'wiseresumeai', agentlessEnabled: true, ddApiKey, site: ddSite });
    _llmobsEnabled = true;
  } catch (_) {
    // swallow — never block the AI route
  }
}

/**
 * Flush pending LLM spans before the short-lived Function container exits.
 * Always resolves — never throws.
 */
async function flushDD() {
  if (!_llmobsEnabled) return;
  try {
    llmobs.flush();
    await new Promise(resolve => tracer.flush(resolve));
  } catch (_) { /* best-effort */ }
}

// ─── Provider constants ───────────────────────────────────────────────────────

const OPENROUTER_FREE_MODEL  = 'meta-llama/llama-3.3-70b-instruct:free';
const GROQ_FREE_MODEL        = 'llama-3.3-70b-versatile';
const DEEPSEEK_MODEL         = 'deepseek-chat';
const NVIDIA_DEFAULT_MODEL   = 'nvidia/llama-3.1-nemotron-70b-instruct';

const BASES = {
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  groq:       'https://api.groq.com/openai/v1/chat/completions',
  deepseek:   'https://api.deepseek.com/v1/chat/completions',
  nvidia:     'https://integrate.api.nvidia.com/v1/chat/completions',
};

const DB_ID = 'main';

function getDbClient() {
  const endpoint  = process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey    = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
  const client    = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new sdk.Databases(client);
}

// ─── Main handler ─────────────────────────────────────────────────────────────

module.exports = async ({ req, res, log, error }) => {
  enableLLMObs();

  // Broad outer catch — preserves the JSON error contract on any unexpected failure.
  try {
    const opts = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { featureName, messages } = opts;

    log(`AI-Gateway Hub: Processing ${featureName || 'general'} request...`);

    // ── 1. EMAIL ROUTE (never traced as LLM span) ───────────────────────────
    if (featureName === 'send-email' || featureName === 'send-contact-email') {
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        await flushDD();
        return res.json({ status: 'error', message: 'RESEND_API_KEY not found.' }, 500);
      }

      const emailResponse = await axios.post('https://api.resend.com/emails', {
        from:    opts.from    || 'WiseResume <notifications@thewise.cloud>',
        to:      opts.to      || ['contact@thewise.cloud'],
        subject: opts.subject || 'System Notification',
        html:    opts.html    || '<p>Default notification body</p>',
      }, {
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      });

      await flushDD();
      return res.json({ status: 'success', data: { id: emailResponse.data.id } });
    }

    // ── 2. AI ROUTE ─────────────────────────────────────────────────────────
    const pool = [];
    for (let i = 1; i <= 3; i++) {
      const key = process.env[`OPENROUTER_KEY_${i}`];
      if (key) pool.push({ provider: 'openrouter', key });
    }
    for (let i = 1; i <= 3; i++) {
      const key = process.env[`GROQ_KEY_${i}`];
      if (key) pool.push({ provider: 'groq', key });
    }
    if (process.env.DEEPSEEK_KEY) pool.push({ provider: 'deepseek', key: process.env.DEEPSEEK_KEY });
    for (let i = 1; i <= 3; i++) {
      const key = process.env[`NVIDIA_KEY_${i}`];
      if (key) pool.push({ provider: 'nvidia', key });
    }

    if (pool.length === 0) {
      error('No keys found in environment variables.');
      await flushDD();
      return res.json({ status: 'error', message: 'No AI keys found on server.' }, 503);
    }

    const picked       = pool[Math.floor(Math.random() * pool.length)];
    const url          = BASES[picked.provider];
    const defaultModel =
      picked.provider === 'openrouter' ? OPENROUTER_FREE_MODEL :
      picked.provider === 'deepseek'   ? DEEPSEEK_MODEL :
      picked.provider === 'nvidia'     ? NVIDIA_DEFAULT_MODEL : GROQ_FREE_MODEL;

    const model       = opts.model       || defaultModel;
    const temperature = opts.temperature || 0.7;
    const maxTokens   = opts.maxTokens   || 1000;

    log(`Using provider: ${picked.provider}, model: ${model}`);

    /** Shared AI caller — called from inside the trace span or directly. */
    async function callProvider() {
      const response = await axios.post(url, {
        model,
        messages:    messages || [{ role: 'user', content: 'hello' }],
        temperature,
        max_tokens: maxTokens,
      }, {
        headers: { 'Authorization': `Bearer ${picked.key}`, 'Content-Type': 'application/json' },
        timeout: 30000,
      });
      return {
        content:  response.data.choices[0].message.content,
        usage:    response.data.usage || {},
      };
    }

    let content      = null;
    let providerUsed = picked.provider;

    if (_llmobsEnabled) {
      // Track whether the trace callback was entered so we can distinguish
      // "llmobs.trace() setup failed" from "provider call inside the trace failed".
      let callbackExecuted = false;

      try {
        await llmobs.trace(
          {
            kind:          'llm',
            name:          featureName || 'ai-gateway',
            modelName:     model,
            modelProvider: picked.provider,
          },
          async (span) => {
            callbackExecuted = true;

            // Annotate input before the call
            llmobs.annotate(span, {
              inputData: messages || [{ role: 'user', content: 'hello' }],
              metadata: {
                temperature,
                max_tokens:   maxTokens,
                feature_name: featureName || 'general',
              },
              tags: {
                feature_name: featureName || 'general',
                provider:     picked.provider,
                model,
              },
            });

            let result;
            try {
              result = await callProvider();
            } catch (providerErr) {
              // Mark the span as errored then re-throw so the outer catch handles it.
              span.setTag('error', providerErr);
              span.setTag('error.message', providerErr.message);
              throw providerErr;
            }

            // Annotate output + token metrics on success
            llmobs.annotate(span, {
              outputData: [{ role: 'assistant', content: result.content }],
              metrics: {
                input_tokens:  result.usage.prompt_tokens     || 0,
                output_tokens: result.usage.completion_tokens || 0,
                total_tokens:  result.usage.total_tokens      || 0,
              },
            });

            content = result.content;
          },
        );

      } catch (traceErr) {
        if (!callbackExecuted) {
          // llmobs.trace() setup itself failed (e.g. bad kind value).
          // Fall back to a direct AI call so the response contract is preserved.
          error('DD LLMObs trace setup error, falling back: ' + traceErr.message);
          const result = await callProvider();
          content = result.content;
        } else {
          // The provider call inside the trace threw. Surface the error.
          await flushDD();
          error('AI-Gateway Error: ' + traceErr.message);
          return res.json({ status: 'error', message: traceErr.message }, 500);
        }
      }

    } else {
      // LLMObs not enabled — direct call with no overhead
      const result = await callProvider();
      content = result.content;
    }

    await flushDD();
    return res.json({
      status: 'success',
      data: { content, providerUsed },
    });

  } catch (err) {
    // Catch-all — preserves stable JSON error response on any unexpected failure
    error('AI-Gateway Error: ' + err.message);
    await flushDD();
    return res.json({ status: 'error', message: err.message }, 500);
  }
};
