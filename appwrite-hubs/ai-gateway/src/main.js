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

/**
 * Per-feature routing config.
 *
 * Each entry maps a featureName (as sent by the frontend) to a preferred
 * { provider, model }. The gateway picks this pair when a matching key is
 * found AND at least one key for that provider is present in env. If the
 * preferred provider has no configured key, or the featureName is not in
 * this map, the gateway falls back to random selection from the full pool.
 *
 * Principles (from Project Atlas/Routing AI Providers/04-feature-routing-map.md):
 *  • Speed-critical / chat  → groq  (lowest latency)
 *  • Quality-critical / long generation → nvidia (Nemotron 70B excels here)
 *  • Long context / parsing → openrouter (broad free-tier model access)
 *  • Reasoning / analysis   → deepseek
 *  • Lightweight classifier  → groq (llama-3.1-8b-instant)
 */
let FEATURE_ROUTES = {
  'generate-cover-letter':      { provider: 'nvidia', model: 'nvidia/llama-3.1-nemotron-70b-instruct' },
  'tailor-resume':              { provider: 'nvidia', model: 'nvidia/llama-3.1-nemotron-70b-instruct' },
  'recruiter-simulation':       { provider: 'nvidia', model: 'nvidia/llama-3.1-nemotron-70b-instruct' },
  'agentic-chat':               { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'wise-ai-chat':               { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'resume-section-ai':          { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'editor-ai':                  { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'detect-and-humanize':        { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'smart-fit-rewrite':          { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'career-assessment':          { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'generate-portfolio-bio':     { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'generate-resignation-letter':{ provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'validate-tailor':            { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'suggest-template':           { provider: 'groq', model: 'llama-3.1-8b-instant' },
  'analyze-resume':             { provider: 'deepseek', model: 'deepseek-chat' },
  'generate-fix-suggestions':   { provider: 'deepseek', model: 'deepseek-chat' },
  'parse-resume':               { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
  'parse-job':                  { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
  'optimize-for-linkedin':      { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
  'generate-question-bank':     { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
  'company-briefing':           { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
};

async function syncDynamicRoutes(db) {
  try {
    const res = await db.listDocuments(DB_ID, 'ai_routing_config');
    res.documents.forEach(doc => {
      FEATURE_ROUTES[doc.feature_id] = { provider: doc.provider, model: doc.model };
    });
  } catch (e) {
    // Silently fallback to static routes if collection doesn't exist yet
  }
}

function getDbClient() {
  const endpoint  = process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey    = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
  const client    = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new sdk.Databases(client);
}

// ─── Routing helpers ──────────────────────────────────────────────────────────

/**
 * Build the full provider pool from environment variables.
 * Returns an array of { provider, key } entries for every configured key.
 */
function buildPool() {
  const pool = [];
  for (let i = 1; i <= 3; i++) {
    const key = process.env[`GROQ_KEY_${i}`];
    if (key) pool.push({ provider: 'groq', key });
  }
  for (let i = 1; i <= 3; i++) {
    const key = process.env[`OPENROUTER_KEY_${i}`];
    if (key) pool.push({ provider: 'openrouter', key });
  }
  if (process.env.DEEPSEEK_KEY) {
    pool.push({ provider: 'deepseek', key: process.env.DEEPSEEK_KEY });
  }
  for (let i = 1; i <= 3; i++) {
    const key = process.env[`NVIDIA_KEY_${i}`];
    if (key) pool.push({ provider: 'nvidia', key });
  }
  return pool;
}

function getProviderAvailability() {
  return {
    groq:        [1, 2, 3].some(i => !!process.env[`GROQ_KEY_${i}`]),
    openrouter:  [1, 2, 3].some(i => !!process.env[`OPENROUTER_KEY_${i}`]),
    deepseek:    !!process.env.DEEPSEEK_KEY,
    nvidia:      [1, 2, 3].some(i => !!process.env[`NVIDIA_KEY_${i}`]),
  };
}

/**
 * Build an ordered candidate list for a given featureName.
 *
 * The list is tried in sequence by the call loop; the first successful
 * response wins. Order:
 *  1. Preferred provider from FEATURE_ROUTES (if configured and has keys).
 *  2. Remaining pool entries in buildPool() order (groq → openrouter →
 *     deepseek → nvidia), excluding any already used as primary.
 *
 * Returns an array of { provider, key, model, routed } objects, or [] when
 * the pool is empty.
 */
function buildCandidates(featureName, pool) {
  if (pool.length === 0) return [];

  const defaultModelFor = p =>
    p === 'openrouter' ? OPENROUTER_FREE_MODEL :
    p === 'deepseek'   ? DEEPSEEK_MODEL :
    p === 'nvidia'     ? NVIDIA_DEFAULT_MODEL :
    GROQ_FREE_MODEL;

  const candidates = [];
  const usedKeys   = new Set();

  const route = FEATURE_ROUTES[featureName];
  if (route) {
    const preferred = pool.filter(e => e.provider === route.provider);
    if (preferred.length > 0) {
      const entry = preferred[Math.floor(Math.random() * preferred.length)];
      candidates.push({ provider: entry.provider, key: entry.key, model: route.model, routed: true });
      usedKeys.add(entry.key);
    }
  }

  for (const entry of pool) {
    if (usedKeys.has(entry.key)) continue;
    candidates.push({
      provider: entry.provider,
      key:      entry.key,
      model:    defaultModelFor(entry.provider),
      routed:   false,
    });
    usedKeys.add(entry.key);
  }

  return candidates;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

module.exports = async ({ req, res, log, error }) => {
  enableLLMObs();
  const db = getDbClient();
  await syncDynamicRoutes(db);

  // Broad outer catch — preserves the JSON error contract on any unexpected failure.
  try {
    const opts = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { featureName, messages } = opts;

    log(`AI-Gateway Hub: Processing ${featureName || 'general'} request...`);

    // ── 0. SMOKE-TEST SHORT-CIRCUIT ──────────────────────────────────────────
    if (opts['x-smoke-test'] === 'true' || req.headers?.['x-smoke-test'] === 'true') {
      log('Smoke test ping — returning OK');
      await flushDD();
      return res.json({ status: 'ok', _smokeTest: true, providers: getProviderAvailability() });
    }

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
    const pool       = buildPool();
    const candidates = buildCandidates(featureName, pool);

    if (candidates.length === 0) {
      error('No keys found in environment variables.');
      await flushDD();
      return res.json({ status: 'error', message: 'No AI keys found on server.' }, 503);
    }

    const temperature = opts.temperature || 0.7;
    const maxTokens   = opts.maxTokens   || 1000;

    /** Call a single provider candidate. */
    async function callCandidate(candidate) {
      const response = await axios.post(BASES[candidate.provider], {
        model:      opts.model || candidate.model,
        messages:   messages || [{ role: 'user', content: 'hello' }],
        temperature,
        max_tokens: maxTokens,
      }, {
        headers: { 'Authorization': `Bearer ${candidate.key}`, 'Content-Type': 'application/json' },
        timeout: 30000,
      });
      return {
        content: response.data.choices[0].message.content,
        usage:   response.data.usage || {},
      };
    }

    let content      = null;
    let providerUsed = null;
    let modelUsed    = null;
    let routedBy     = false;

    // Try each candidate in priority order; stop at first success.
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      const isFirst   = i === 0;
      const label     = candidate.routed ? 'preferred' : 'fallback';
      log(`Trying ${label} provider: ${candidate.provider} (model: ${opts.model || candidate.model}) for ${featureName || 'general'}${isFirst ? '' : ` [attempt ${i + 1}]`}`);

      try {
        let result;

        if (isFirst && _llmobsEnabled) {
          // Only trace the primary attempt via LLMObs.
          let callbackExecuted = false;
          await llmobs.trace(
            {
              kind:          'llm',
              name:          featureName || 'ai-gateway',
              modelName:     opts.model || candidate.model,
              modelProvider: candidate.provider,
            },
            async (span) => {
              callbackExecuted = true;
              llmobs.annotate(span, {
                inputData: messages || [{ role: 'user', content: 'hello' }],
                metadata: {
                  temperature,
                  max_tokens:        maxTokens,
                  feature_name:      featureName || 'general',
                  routed_by_feature: candidate.routed,
                },
                tags: {
                  feature_name:      featureName || 'general',
                  provider:          candidate.provider,
                  model:             opts.model || candidate.model,
                  routed_by_feature: String(candidate.routed),
                },
              });

              try {
                result = await callCandidate(candidate);
              } catch (providerErr) {
                span.setTag('error', providerErr);
                span.setTag('error.message', providerErr.message);
                throw providerErr;
              }

              llmobs.annotate(span, {
                outputData: [{ role: 'assistant', content: result.content }],
                metrics: {
                  input_tokens:  result.usage.prompt_tokens     || 0,
                  output_tokens: result.usage.completion_tokens || 0,
                  total_tokens:  result.usage.total_tokens      || 0,
                },
              });
            },
          ).catch(async traceErr => {
            if (!callbackExecuted) {
              // trace() setup itself failed (e.g. bad kind value) — fall back
              // to a direct untraced call for this same candidate rather than
              // skipping it entirely and moving to the next fallback.
              error('DD LLMObs trace setup error, retrying untraced: ' + traceErr.message);
              result = await callCandidate(candidate);
            } else {
              // Provider call inside the trace threw — re-throw so the outer
              // catch handles it and moves to the next candidate.
              throw traceErr;
            }
          });
        } else {
          result = await callCandidate(candidate);
        }

        content      = result.content;
        providerUsed = candidate.provider;
        modelUsed    = opts.model || candidate.model;
        routedBy     = candidate.routed;
        break;

      } catch (candidateErr) {
        error(`Provider ${candidate.provider} failed: ${candidateErr.message}`);
        if (i === candidates.length - 1) {
          // All candidates exhausted.
          await flushDD();
          return res.json({ status: 'error', message: candidateErr.message }, 500);
        }
        // Continue to next candidate.
      }
    }

    await flushDD();
    return res.json({
      status: 'success',
      data: {
        content,
        providerUsed,
        modelUsed,
        routedByFeature: routedBy,
      },
    });

  } catch (err) {
    // Catch-all — preserves stable JSON error contract on any unexpected failure
    error('AI-Gateway Error: ' + err.message);
    await flushDD();
    return res.json({ status: 'error', message: err.message }, 500);
  }
};
