'use strict';

const sdk = require('node-appwrite');
const crypto = require('crypto');

const DB_ID = 'main';
const SETTINGS_COLLECTION = 'app_settings';
const SETTINGS_DOC_ID = 'global';

const DEFAULT_MODELS = {
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  groq: 'llama-3.3-70b-versatile',
  deepseek: 'deepseek-v4-flash',
  nvidia: 'mistral-medium-3-instruct',
};

const NVIDIA_VALID_MODELS = [
  'mistral-medium-3-instruct',
  'mistral-large-3-675b-instruct-2512',
  'mistral-nemotron',
  'gemma-3n-e4b-it',
  'gemma-3n-e2b-it',
];

const PROVIDERS = ['openrouter', 'groq', 'deepseek', 'nvidia'];
const SLOTS = [1, 2, 3];

function getDb() {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
  const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey || '');
  return new sdk.Databases(client);
}

function verifySignedToken(token) {
  const secret = process.env.DEVKIT_PASSWORD;
  if (!secret || !token || !token.includes('.')) return false;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return false;
  const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  const actualBuffer = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  if (!crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return false;
  let payload;
  try { payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); } catch { return false; }
  return payload.purpose === 'devkit' && typeof payload.exp === 'number' && Date.now() < payload.exp;
}

function checkAuth(req, body) {
  const password = process.env.DEVKIT_PASSWORD;
  if (!password) return false;
  const authHeader = body?.__headers?.Authorization || req.headers['authorization'] || req.headers['Authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  return token === password || verifySignedToken(token);
}

function maskKey(key) {
  if (!key || key.length < 4) return key ? '****' : null;
  return '****' + key.slice(-4);
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
    if (typeof raw === 'string' && raw.trim()) return JSON.parse(raw);
    if (typeof raw === 'object' && raw !== null) return raw;
    return {};
  } catch { return {}; }
}

async function writeSlotModels(databases, slotModels) {
  const payload = { ai_test_slot_models: JSON.stringify(slotModels) };
  try {
    await databases.updateDocument(DB_ID, SETTINGS_COLLECTION, SETTINGS_DOC_ID, payload);
  } catch (updateErr) {
    if (updateErr && typeof updateErr.code === 'number' && updateErr.code === 404) {
      await databases.createDocument(DB_ID, SETTINGS_COLLECTION, SETTINGS_DOC_ID, payload);
      return;
    }
    throw updateErr;
  }
}

module.exports = async ({ req, res, log }) => {
  const body = typeof req.body === 'string'
    ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })()
    : (req.body || {});

  if (!checkAuth(req, body)) {
    return res.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const databases = getDb();
  const { provider, slot, model } = body;

  if (provider && slot && model) {
    if (!PROVIDERS.includes(provider)) return res.json({ success: false, error: `Unknown provider: ${provider}` }, 400);
    const slotNum = Number(slot);
    if (![1, 2, 3].includes(slotNum)) return res.json({ success: false, error: 'Slot must be 1, 2, or 3' }, 400);
    if (typeof model !== 'string' || !model.trim()) return res.json({ success: false, error: 'model must be a non-empty string' }, 400);

    log(`Saving model override: ${provider}:${slotNum}`);
    const slotModelsBeforeSave = await readSlotModels(databases);
    slotModelsBeforeSave[`${provider}:${slotNum}`] = model.trim();
    try { await writeSlotModels(databases, slotModelsBeforeSave); }
    catch (writeErr) {
      const msg = writeErr instanceof Error ? writeErr.message : String(writeErr);
      return res.json({ success: false, error: `Failed to save model override: ${msg}` }, 500);
    }
  }

  const slotModels = await readSlotModels(databases);
  const keys = [];
  for (const p of PROVIDERS) {
    for (const s of SLOTS) {
      const rawKey = getEnvKey(p, s);
      const rawSaved = slotModels[`${p}:${s}`];
      const savedModel = (p === 'nvidia' && rawSaved && !NVIDIA_VALID_MODELS.includes(rawSaved)) ? null : rawSaved;
      keys.push({ provider: p, slot: s, hint: rawKey ? maskKey(rawKey) : null, present: !!rawKey, model: savedModel || DEFAULT_MODELS[p] });
    }
  }

  return res.json({ success: true, keys, defaultModels: DEFAULT_MODELS, slotModels, modelCatalogRefreshedAt: null });
};
