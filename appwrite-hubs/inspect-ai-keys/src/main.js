'use strict';

const sdk = require('node-appwrite');
const crypto = require('crypto');

const DB_ID = 'main';
const SETTINGS_COLLECTION = 'app_settings';
const SETTINGS_DOC_ID = 'global';

const DEFAULT_MODELS = {
  openrouter: 'openrouter/free',
  groq: 'openai/gpt-oss-120b',
  deepseek: 'deepseek-chat',
  nvidia: 'stepfun-ai/step-3.7-flash',
};

const NVIDIA_VALID_MODELS = [
  'stepfun-ai/step-3.7-flash',
  'nvidia/nemotron-3-ultra-550b-a55b',
  'minimaxai/minimax-m3',
  'nvidia/nemotron-3-super-120b-a12b',
  'stepfun-ai/step-3.5-flash',
  'mistralai/mistral-nemotron',
  'mistralai/mistral-large-3-675b-instruct-2512',
  'openai/gpt-oss-120b',
  'meta/llama-3.3-70b-instruct',
  'mistralai/mixtral-8x7b-instruct-v0.1',
];

const PROVIDERS = ['openrouter', 'groq', 'deepseek', 'nvidia'];
const PROVIDER_SLOTS = {
  openrouter: [1, 2, 3],
  groq: [1, 2, 3],
  nvidia: [1, 2, 3],
  deepseek: [1],
};

const PROVIDER_ENDPOINTS = {
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/chat/completions',
  nvidia: 'https://integrate.api.nvidia.com/v1/chat/completions',
};

function getDb() {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
  const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey || '');
  return new sdk.Databases(client);
}

function verifySignedToken(token) {
  const secrets = [
    process.env.APPWRITE_API_KEY,
    process.env.APPWRITE_FUNCTION_API_KEY,
    process.env.DEVKIT_PASSWORD,
  ].filter(Boolean);
  if (!secrets.length || !token || !token.includes('.')) return false;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return false;
  const signed = secrets.some(secret => {
    const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
    const actualBuffer = Buffer.from(sig);
    const expectedBuffer = Buffer.from(expected);
    return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
  });
  if (!signed) return false;
  let payload;
  try { payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); } catch { return false; }
  return payload.purpose === 'devkit' && typeof payload.exp === 'number' && Date.now() < payload.exp;
}

function checkAuth(req, body) {
  const authHeader = body?.__headers?.Authorization || req.headers['authorization'] || req.headers['Authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return false;
  return verifySignedToken(token);
}

function maskKey(key) {
  if (!key || key.length < 4) return key ? '****' : null;
  return '****' + key.slice(-4);
}

function getEnvKey(provider, slot) {
  if (provider === 'openrouter') return process.env[`OPENROUTER_KEY_${slot}`] || null;
  if (provider === 'groq') return process.env[`GROQ_KEY_${slot}`] || null;
  if (provider === 'deepseek') return Number(slot) === 1 ? (process.env.DEEPSEEK_KEY || null) : null;
  if (provider === 'nvidia') return process.env[`NVIDIA_KEY_${slot}`] || null;
  return null;
}

async function readSlotModels(databases) {
  try {
    const list = await databases.listDocuments(DB_ID, SETTINGS_COLLECTION, [
      sdk.Query.equal('key', 'ai_test_slot_models'),
      sdk.Query.limit(1)
    ]);
    if (list.documents && list.documents.length > 0) {
      const val = list.documents[0].value;
      if (typeof val === 'string' && val.trim()) return JSON.parse(val);
    }
  } catch {}
  try {
    const doc = await databases.getDocument(DB_ID, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    const raw = doc.ai_test_slot_models;
    if (typeof raw === 'string' && raw.trim()) return JSON.parse(raw);
    if (typeof raw === 'object' && raw !== null) return raw;
  } catch {}
  return {};
}

async function writeSlotModels(databases, slotModels) {
  const valueStr = JSON.stringify(slotModels);
  const payload = {
    key: 'ai_test_slot_models',
    value: valueStr,
    ai_test_slot_models: valueStr
  };
  try {
    const list = await databases.listDocuments(DB_ID, SETTINGS_COLLECTION, [
      sdk.Query.equal('key', 'ai_test_slot_models'),
      sdk.Query.limit(1)
    ]);
    if (list.documents && list.documents.length > 0) {
      const docId = list.documents[0].$id;
      await databases.updateDocument(DB_ID, SETTINGS_COLLECTION, docId, payload);
    } else {
      await databases.createDocument(DB_ID, SETTINGS_COLLECTION, sdk.ID.unique(), payload);
    }
  } catch (err) {
    throw err;
  }
}

async function readTestResults(databases) {
  try {
    const list = await databases.listDocuments(DB_ID, SETTINGS_COLLECTION, [
      sdk.Query.equal('key', 'ai_key_test_results'),
      sdk.Query.limit(1)
    ]);
    if (list.documents && list.documents.length > 0) {
      const val = list.documents[0].value;
      if (typeof val === 'string' && val.trim()) return JSON.parse(val);
    }
  } catch {}
  try {
    const doc = await databases.getDocument(DB_ID, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    const raw = doc.ai_key_test_results;
    if (typeof raw === 'string' && raw.trim()) return JSON.parse(raw);
    if (typeof raw === 'object' && raw !== null) return raw;
  } catch {}
  return {};
}

async function writeTestResults(databases, testResults, logFn) {
  const valueStr = JSON.stringify(testResults);
  const payload = {
    key: 'ai_key_test_results',
    value: valueStr,
    ai_key_test_results: valueStr
  };
  try {
    const list = await databases.listDocuments(DB_ID, SETTINGS_COLLECTION, [
      sdk.Query.equal('key', 'ai_key_test_results'),
      sdk.Query.limit(1)
    ]);
    if (list.documents && list.documents.length > 0) {
      const docId = list.documents[0].$id;
      await databases.updateDocument(DB_ID, SETTINGS_COLLECTION, docId, payload);
    } else {
      await databases.createDocument(DB_ID, SETTINGS_COLLECTION, sdk.ID.unique(), payload);
    }
    return { ok: true };
  } catch (err) {
    if (logFn) logFn(`[inspect-ai-keys] Persistence warning (write): ${err?.message || String(err)}`);
    return { ok: false, warning: 'persistence_failed' };
  }
}

function sanitizeText(text) {
  if (!text) return '';
  return String(text)
    .replace(/Bearer\s+[A-Za-z0-9_\-.]+/gi, 'Bearer [MASKED]')
    .replace(/sk-[A-Za-z0-9_\-]+/gi, 'sk-[MASKED]')
    .slice(0, 400);
}

async function pingSlot({ provider, slot, model }) {
  const testedAt = new Date().toISOString();
  const slotNum = Number(slot);
  const apiKey = getEnvKey(provider, slotNum);
  const keyPreview = apiKey ? maskKey(apiKey) : null;

  if (!apiKey) {
    return {
      ok: false,
      provider,
      slot: slotNum,
      model,
      status: 'missing_key',
      testedAt,
      keyPreview: null,
      message: 'API key is not configured in environment',
    };
  }

  const endpoint = PROVIDER_ENDPOINTS[provider];
  if (!endpoint) {
    return {
      ok: false,
      provider,
      slot: slotNum,
      model,
      status: 'provider_error',
      testedAt,
      keyPreview,
      message: `Unknown provider: ${provider}`,
    };
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://wiseresume.app';
    headers['X-Title'] = 'WiseResume DevKit';
  }

  const startTime = Date.now();
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 12000) : null;

  try {
    const fetchOptions = {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with only OK.' }],
        max_tokens: 10,
        temperature: 0.1,
        stream: false,
      }),
    };
    if (controller) fetchOptions.signal = controller.signal;

    const response = await fetch(endpoint, fetchOptions);
    if (timeoutId) clearTimeout(timeoutId);

    const latencyMs = Date.now() - startTime;
    const httpStatus = response.status;

    let responseText = '';
    try { responseText = await response.text(); } catch { responseText = ''; }
    const safeText = sanitizeText(responseText);

    if (response.ok) {
      let jsonPayload = null;
      try { jsonPayload = JSON.parse(responseText); } catch { jsonPayload = null; }

      const firstChoice = jsonPayload?.choices?.[0];
      const content = firstChoice?.message?.content || firstChoice?.text;

      if (!jsonPayload || typeof content !== 'string') {
        return {
          ok: false,
          provider,
          slot: slotNum,
          model,
          status: 'provider_error',
          httpStatus,
          latencyMs,
          testedAt,
          keyPreview,
          message: 'Provider returned HTTP 200 but response structure was invalid or empty',
        };
      }

      return {
        ok: true,
        provider,
        slot: slotNum,
        model,
        status: 'success',
        httpStatus,
        latencyMs,
        testedAt,
        keyPreview,
        message: 'Model responded successfully',
      };
    }

    if (httpStatus === 401 || httpStatus === 403) {
      return {
        ok: false,
        provider,
        slot: slotNum,
        model,
        status: 'invalid_key',
        httpStatus,
        latencyMs,
        testedAt,
        keyPreview,
        message: `Authentication failed (HTTP ${httpStatus})`,
        errorExcerpt: safeText || undefined,
      };
    }

    if (httpStatus === 429) {
      return {
        ok: false,
        provider,
        slot: slotNum,
        model,
        status: 'rate_limited',
        httpStatus,
        latencyMs,
        testedAt,
        keyPreview,
        message: 'Provider rate limit exceeded (HTTP 429)',
        errorExcerpt: safeText || undefined,
      };
    }

    const isModelErr = (httpStatus === 400 || httpStatus === 404) &&
      /model|not found|does not exist|invalid model|unknown model|unsupported/i.test(safeText);

    if (isModelErr) {
      return {
        ok: false,
        provider,
        slot: slotNum,
        model,
        status: 'model_not_found',
        httpStatus,
        latencyMs,
        testedAt,
        keyPreview,
        message: `Model '${model}' not found or unsupported by provider (HTTP ${httpStatus})`,
        errorExcerpt: safeText || undefined,
      };
    }

    return {
      ok: false,
      provider,
      slot: slotNum,
      model,
      status: 'provider_error',
      httpStatus,
      latencyMs,
      testedAt,
      keyPreview,
      message: `Provider request failed (HTTP ${httpStatus})`,
      errorExcerpt: safeText || undefined,
    };
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (err && (err.name === 'AbortError' || /abort|timeout/i.test(err.message || ''))) {
      return {
        ok: false,
        provider,
        slot: slotNum,
        model,
        status: 'timeout',
        latencyMs,
        testedAt,
        keyPreview,
        message: 'Request timed out after 12s',
      };
    }

    return {
      ok: false,
      provider,
      slot: slotNum,
      model,
      status: 'provider_error',
      latencyMs,
      testedAt,
      keyPreview,
      message: 'Network error connecting to provider',
      errorExcerpt: err instanceof Error ? err.message : String(err),
    };
  }
}

async function runConcurrently(tasks, limit = 2) {
  const results = [];
  for (let i = 0; i < tasks.length; i += limit) {
    const chunk = tasks.slice(i, i + limit);
    const chunkResults = await Promise.all(chunk.map(fn => fn()));
    results.push(...chunkResults);
  }
  return results;
}

module.exports = async ({ req, res, log }) => {
  const body = typeof req.body === 'string'
    ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })()
    : (req.body || {});

  if (!checkAuth(req, body)) {
    return res.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const databases = getDb();
  const { action, provider, slot, model, modelOverrides } = body;

  // --- ACTION: test-ai-key-slot ----------------------------------------------
  if (action === 'test-ai-key-slot') {
    if (!provider || !PROVIDERS.includes(provider)) {
      return res.json({ success: false, error: `Invalid or missing provider: ${provider}` }, 400);
    }
    const slotNum = Number(slot);
    if (!(PROVIDER_SLOTS[provider] || []).includes(slotNum)) {
      return res.json({ success: false, error: `Slot ${slotNum} is invalid for provider ${provider}` }, 400);
    }

    const slotModels = await readSlotModels(databases);
    const targetModel = (typeof model === 'string' && model.trim())
      ? model.trim()
      : (slotModels[`${provider}:${slotNum}`] || DEFAULT_MODELS[provider]);

    log(`[inspect-ai-keys] Testing slot ${provider}:${slotNum} model=${targetModel}`);
    const result = await pingSlot({ provider, slot: slotNum, model: targetModel });

    const storedResults = await readTestResults(databases);
    storedResults[`${provider}:${slotNum}`] = result;
    const persistRes = await writeTestResults(databases, storedResults, log);

    return res.json({
      success: true,
      result,
      testResults: storedResults,
      ...(persistRes.warning ? { warning: persistRes.warning } : {}),
    });
  }

  // --- ACTION: test-ai-provider ----------------------------------------------
  if (action === 'test-ai-provider') {
    if (!provider || !PROVIDERS.includes(provider)) {
      return res.json({ success: false, error: `Invalid or missing provider: ${provider}` }, 400);
    }

    const slotModels = await readSlotModels(databases);
    const slots = PROVIDER_SLOTS[provider] || [];
    const overrides = (typeof modelOverrides === 'object' && modelOverrides !== null) ? modelOverrides : {};

    const tasks = slots.map(s => async () => {
      const k = `${provider}:${s}`;
      const targetModel = overrides[k] || slotModels[k] || DEFAULT_MODELS[provider];
      return pingSlot({ provider, slot: s, model: targetModel });
    });

    log(`[inspect-ai-keys] Testing provider ${provider} (${tasks.length} slots)`);
    const results = await runConcurrently(tasks, 2);

    const storedResults = await readTestResults(databases);
    for (const r of results) {
      storedResults[`${r.provider}:${r.slot}`] = r;
    }
    const persistRes = await writeTestResults(databases, storedResults, log);

    return res.json({
      success: true,
      results,
      testResults: storedResults,
      ...(persistRes.warning ? { warning: persistRes.warning } : {}),
    });
  }

  // --- ACTION: test-all-ai-keys ----------------------------------------------
  if (action === 'test-all-ai-keys') {
    const slotModels = await readSlotModels(databases);
    const overrides = (typeof modelOverrides === 'object' && modelOverrides !== null) ? modelOverrides : {};

    const tasks = [];
    for (const p of PROVIDERS) {
      for (const s of (PROVIDER_SLOTS[p] || [])) {
        const k = `${p}:${s}`;
        const targetModel = overrides[k] || slotModels[k] || DEFAULT_MODELS[p];
        tasks.push(async () => pingSlot({ provider: p, slot: s, model: targetModel }));
      }
    }

    log(`[inspect-ai-keys] Testing all AI keys (${tasks.length} slots)`);
    const results = await runConcurrently(tasks, 2);

    const storedResults = await readTestResults(databases);
    for (const r of results) {
      storedResults[`${r.provider}:${r.slot}`] = r;
    }
    const persistRes = await writeTestResults(databases, storedResults, log);

    return res.json({
      success: true,
      results,
      testResults: storedResults,
      ...(persistRes.warning ? { warning: persistRes.warning } : {}),
    });
  }

  // --- EXISTING ACTION: Save model override if provider + slot + model without test action ---
  if (provider && slot && model && !action) {
    if (!PROVIDERS.includes(provider)) return res.json({ success: false, error: `Unknown provider: ${provider}` }, 400);
    const slotNum = Number(slot);
    if (!(PROVIDER_SLOTS[provider] || []).includes(slotNum)) {
      return res.json({ success: false, error: `Slot ${slotNum} is not valid for ${provider}` }, 400);
    }
    if (typeof model !== 'string' || !model.trim()) return res.json({ success: false, error: 'model must be a non-empty string' }, 400);

    log(`Saving model override: ${provider}:${slotNum}`);
    const slotModelsBeforeSave = await readSlotModels(databases);
    slotModelsBeforeSave[`${provider}:${slotNum}`] = model.trim();
    try {
      await writeSlotModels(databases, slotModelsBeforeSave);
      return res.json({ success: true, slotModels: slotModelsBeforeSave });
    }
    catch (writeErr) {
      const msg = writeErr instanceof Error ? writeErr.message : String(writeErr);
      return res.json({ success: false, error: `Failed to save model override: ${msg}` }, 500);
    }
  }

  // --- DEFAULT ACTION: Return key slot info, models, and last test results ----
  const slotModels = await readSlotModels(databases);
  const testResults = await readTestResults(databases);
  const keys = [];
  for (const p of PROVIDERS) {
    for (const s of (PROVIDER_SLOTS[p] || [])) {
      const rawKey = getEnvKey(p, s);
      const rawSaved = slotModels[`${p}:${s}`];
      const savedModel = (p === 'nvidia' && rawSaved && !NVIDIA_VALID_MODELS.includes(rawSaved)) ? null : rawSaved;
      keys.push({ provider: p, slot: s, hint: rawKey ? maskKey(rawKey) : null, present: !!rawKey, model: savedModel || DEFAULT_MODELS[p] });
    }
  }

  return res.json({
    success: true,
    keys,
    defaultModels: DEFAULT_MODELS,
    slotModels,
    testResults,
    modelCatalogRefreshedAt: null,
  });
};

// Export internal functions for unit testing
module.exports._internal = {
  maskKey,
  sanitizeText,
  pingSlot,
  runConcurrently,
};
