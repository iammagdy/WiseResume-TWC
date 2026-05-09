/**
 * inspect-ai-keys — Appwrite Function
 *
 * DevKit admin panel: inspect per-slot AI provider key status and manage
 * per-slot test model overrides stored in app_settings.ai_test_slot_models.
 *
 * Actions:
 *   GET  (no body)             → return key hints, default models, saved overrides
 *   POST { provider, slot, model } → save model override for that slot, then return
 *
 * Auth: every request must carry  Authorization: Bearer <DEVKIT_PASSWORD>
 *
 * Environment variables:
 *   DEVKIT_PASSWORD     — shared admin password validated on every request
 *   APPWRITE_API_KEY    — server-side key with databases.read + databases.write
 *   OPENROUTER_KEY_1..3 — OpenRouter API keys
 *   GROQ_KEY_1..3       — Groq API keys
 *   DEEPSEEK_KEY        — DeepSeek API key
 *   NVIDIA_KEY_1..3     — NVIDIA NIM API keys
 */

const sdk = require('node-appwrite');

const DB_ID = 'main';
const SETTINGS_COLLECTION = 'app_settings';
const SETTINGS_DOC_ID = 'global';

const DEFAULT_MODELS = {
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  groq: 'llama-3.3-70b-versatile',
  deepseek: 'deepseek-v4-flash',
  nvidia: 'nvidia/llama-3.1-nemotron-70b-instruct',
};

const PROVIDERS = ['openrouter', 'groq', 'deepseek', 'nvidia'];
const SLOTS = [1, 2, 3];

function getDb() {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
  const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new sdk.Databases(client);
}

function checkAuth(req) {
  const password = process.env.DEVKIT_PASSWORD;
  if (!password) return false;
  const header = req.headers['authorization'] || req.headers['Authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  return token === password;
}

function maskKey(key) {
  if (!key || key.length < 4) return key ? '••••' : null;
  return '••••' + key.slice(-4);
}

function getEnvKey(provider, slot) {
  if (provider === 'openrouter') return process.env[`OPENROUTER_KEY_${slot}`] || null;
  if (provider === 'groq') return process.env[`GROQ_KEY_${slot}`] || null;
  if (provider === 'deepseek') return slot === 1 ? (process.env.DEEPSEEK_KEY || null) : null;
  if (provider === 'nvidia') return process.env[`NVIDIA_KEY_${slot}`] || null;
  return null;
}

async function readSlotModels(databases) {
  try {
    const doc = await databases.getDocument(DB_ID, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    const raw = doc.ai_test_slot_models;
    if (typeof raw === 'string' && raw.trim()) {
      return JSON.parse(raw);
    }
    if (typeof raw === 'object' && raw !== null) {
      return raw;
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Write slot models to the app_settings doc. Tries update first, falls back
 * to create when the document doesn't exist yet. Throws on any real failure
 * so the caller can return a 5xx rather than silently succeeding.
 */
async function writeSlotModels(databases, slotModels) {
  const payload = { ai_test_slot_models: JSON.stringify(slotModels) };
  try {
    await databases.updateDocument(DB_ID, SETTINGS_COLLECTION, SETTINGS_DOC_ID, payload);
    return;
  } catch (updateErr) {
    if (
      updateErr &&
      typeof updateErr.code === 'number' &&
      updateErr.code === 404
    ) {
      await databases.createDocument(DB_ID, SETTINGS_COLLECTION, SETTINGS_DOC_ID, payload);
      return;
    }
    throw updateErr;
  }
}

module.exports = async ({ req, res, log }) => {
  if (!checkAuth(req)) {
    return res.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const databases = getDb();

  const body = typeof req.body === 'string'
    ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })()
    : (req.body || {});

  const { provider, slot, model } = body;

  if (provider && slot && model) {
    if (!PROVIDERS.includes(provider)) {
      return res.json({ success: false, error: `Unknown provider: ${provider}` }, 400);
    }
    const slotNum = Number(slot);
    if (![1, 2, 3].includes(slotNum)) {
      return res.json({ success: false, error: `Slot must be 1, 2, or 3` }, 400);
    }
    if (typeof model !== 'string' || !model.trim()) {
      return res.json({ success: false, error: 'model must be a non-empty string' }, 400);
    }

    log(`Saving model override: ${provider}:${slotNum} = ${model.trim()}`);
    const slotModelsBeforeSave = await readSlotModels(databases);
    slotModelsBeforeSave[`${provider}:${slotNum}`] = model.trim();
    try {
      await writeSlotModels(databases, slotModelsBeforeSave);
    } catch (writeErr) {
      const msg = writeErr instanceof Error ? writeErr.message : String(writeErr);
      return res.json({ success: false, error: `Failed to save model override: ${msg}` }, 500);
    }
  }

  const slotModels = await readSlotModels(databases);

  const keys = [];
  for (const p of PROVIDERS) {
    for (const s of SLOTS) {
      const rawKey = getEnvKey(p, s);
      const savedModel = slotModels[`${p}:${s}`];
      const activeModel = savedModel || DEFAULT_MODELS[p];
      keys.push({
        provider: p,
        slot: s,
        hint: rawKey ? maskKey(rawKey) : null,
        present: !!rawKey,
        model: activeModel,
      });
    }
  }

  return res.json({
    success: true,
    keys,
    defaultModels: DEFAULT_MODELS,
    slotModels,
    modelCatalogRefreshedAt: null,
  });
};
