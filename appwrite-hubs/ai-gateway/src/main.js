'use strict';

const axios = require('axios');
const sdk = require('node-appwrite');

// ─── Datadog LLM Observability ────────────────────────────────────────────────
// Initialise dd-trace at module level (once per cold start).
// Agentless mode is required — Appwrite Functions cannot run a Datadog agent sidecar.
// When DD_API_KEY is absent the tracer is still initialised but LLMObs is disabled,
// so all AI calls continue working without observability — no hard dependency.
const ddTrace = require('dd-trace');
const tracer = ddTrace.init({ logInjection: false });
const llmobs = tracer.llmobs;

let _llmobsEnabled = false;

function enableLLMObs() {
  if (_llmobsEnabled) return;
  const ddApiKey = process.env.DD_API_KEY;
  const ddSite = process.env.DD_SITE || 'datadoghq.com';
  if (!ddApiKey) return;
  try {
    llmobs.enable({
      mlApp: 'wiseresumeai',
      agentlessEnabled: true,
      ddApiKey,
      site: ddSite,
    });
    _llmobsEnabled = true;
  } catch (_) {
    // swallow — observability is best-effort
  }
}

/**
 * Flush pending spans before the short-lived Function container exits.
 * Returns a promise that resolves after a brief drain window.
 */
async function flushDD() {
  if (!_llmobsEnabled) return;
  try {
    llmobs.flush();
    await new Promise(resolve => tracer.flush(resolve));
  } catch (_) {
    // swallow flush errors — never block the response
  }
}

// ─── Provider constants ───────────────────────────────────────────────────────

const OPENROUTER_FREE_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
const GROQ_FREE_MODEL = 'llama-3.3-70b-versatile';
const DEEPSEEK_MODEL = 'deepseek-chat';
const NVIDIA_DEFAULT_MODEL = 'nvidia/llama-3.1-nemotron-70b-instruct';

const BASES = {
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  nvidia: 'https://integrate.api.nvidia.com/v1/chat/completions',
};

const DB_ID = 'main';

function getDbClient() {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
  const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new sdk.Databases(client);
}

// ─── Main handler ─────────────────────────────────────────────────────────────

module.exports = async ({ req, res, log, error }) => {
  // Activate LLMObs on first invocation (idempotent after that)
  enableLLMObs();

  let opts;
  try {
    opts = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
  } catch (_) {
    await flushDD();
    return res.json({ status: 'error', message: 'Invalid JSON body' }, 400);
  }

  const { featureName, messages } = opts;
  log(`AI-Gateway Hub: Processing ${featureName || 'general'} request...`);

  // ── 1. EMAIL ROUTE (not traced as LLM span) ──────────────────────────────
  if (featureName === 'send-email' || featureName === 'send-contact-email') {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      await flushDD();
      return res.json({ status: 'error', message: 'RESEND_API_KEY not found.' }, 500);
    }

    try {
      const emailResponse = await axios.post('https://api.resend.com/emails', {
        from: opts.from || 'WiseResume <notifications@thewise.cloud>',
        to: opts.to || ['contact@thewise.cloud'],
        subject: opts.subject || 'System Notification',
        html: opts.html || '<p>Default notification body</p>',
      }, {
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      });

      await flushDD();
      return res.json({ status: 'success', data: { id: emailResponse.data.id } });
    } catch (err) {
      error('AI-Gateway email error: ' + err.message);
      await flushDD();
      return res.json({ status: 'error', message: err.message }, 500);
    }
  }

  // ── 2. AI ROUTE ──────────────────────────────────────────────────────────
  const pool = [];

  for (let i = 1; i <= 3; i++) {
    const key = process.env[`OPENROUTER_KEY_${i}`];
    if (key) pool.push({ provider: 'openrouter', key });
  }
  for (let i = 1; i <= 3; i++) {
    const key = process.env[`GROQ_KEY_${i}`];
    if (key) pool.push({ provider: 'groq', key });
  }
  if (process.env.DEEPSEEK_KEY) {
    pool.push({ provider: 'deepseek', key: process.env.DEEPSEEK_KEY });
  }
  for (let i = 1; i <= 3; i++) {
    const key = process.env[`NVIDIA_KEY_${i}`];
    if (key) pool.push({ provider: 'nvidia', key });
  }

  if (pool.length === 0) {
    error('No keys found in environment variables.');
    await flushDD();
    return res.json({ status: 'error', message: 'No AI keys found on server.' }, 503);
  }

  const picked = pool[Math.floor(Math.random() * pool.length)];
  const url = BASES[picked.provider];
  const defaultModel =
    picked.provider === 'openrouter' ? OPENROUTER_FREE_MODEL :
    picked.provider === 'deepseek'   ? DEEPSEEK_MODEL :
    picked.provider === 'nvidia'     ? NVIDIA_DEFAULT_MODEL : GROQ_FREE_MODEL;

  const model = opts.model || defaultModel;
  const temperature = opts.temperature || 0.7;
  const maxTokens = opts.maxTokens || 1000;

  log(`Using provider: ${picked.provider}, model: ${model}`);

  // ── Wrap the AI call in a Datadog LLM Observability span ─────────────────
  let aiResult = null;
  let aiError = null;

  if (_llmobsEnabled) {
    try {
      await llmobs.trace(
        {
          kind: 'llm',
          name: featureName || 'ai-gateway',
          modelName: model,
          modelProvider: picked.provider,
        },
        async (span) => {
          // Tag input
          llmobs.annotate(span, {
            inputData: messages || [{ role: 'user', content: 'hello' }],
            metadata: {
              temperature,
              max_tokens: maxTokens,
              feature_name: featureName || 'general',
            },
            tags: {
              feature_name: featureName || 'general',
              provider: picked.provider,
              model,
            },
          });

          try {
            const response = await axios.post(url, {
              model,
              messages: messages || [{ role: 'user', content: 'hello' }],
              temperature,
              max_tokens: maxTokens,
            }, {
              headers: {
                'Authorization': `Bearer ${picked.key}`,
                'Content-Type': 'application/json',
              },
              timeout: 30000,
            });

            const content = response.data.choices[0].message.content;
            const usage = response.data.usage || {};

            // Tag output + token metrics
            llmobs.annotate(span, {
              outputData: [{ content, role: 'assistant' }],
              metrics: {
                input_tokens:  usage.prompt_tokens     || 0,
                output_tokens: usage.completion_tokens || 0,
                total_tokens:  usage.total_tokens      || 0,
              },
            });

            aiResult = { content, providerUsed: picked.provider };
          } catch (err) {
            span.setTag('error', err);
            span.setTag('error.message', err.message);
            aiError = err;
          }
        },
      );
    } catch (traceErr) {
      // llmobs.trace itself threw (e.g. invalid kind); fall through without observability
      error('DD LLMObs trace error: ' + traceErr.message);
      aiError = null; // reset so we still try below if needed
    }
  } else {
    // LLMObs not enabled — call AI directly
    try {
      const response = await axios.post(url, {
        model,
        messages: messages || [{ role: 'user', content: 'hello' }],
        temperature,
        max_tokens: maxTokens,
      }, {
        headers: {
          'Authorization': `Bearer ${picked.key}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      aiResult = {
        content: response.data.choices[0].message.content,
        providerUsed: picked.provider,
      };
    } catch (err) {
      aiError = err;
    }
  }

  // ── Return result ─────────────────────────────────────────────────────────
  await flushDD();

  if (aiError) {
    error('AI-Gateway Error: ' + aiError.message);
    return res.json({ status: 'error', message: aiError.message }, 500);
  }

  return res.json({
    status: 'success',
    data: {
      content: aiResult.content,
      providerUsed: aiResult.providerUsed,
    },
  });
};
