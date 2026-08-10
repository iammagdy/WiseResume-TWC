'use strict';

const crypto = require('crypto');
const sdk = require('node-appwrite');

const DB_ID = 'main';
const COLLECTION_ID = 'ai_runtime_receipts';
const RETENTION_DAYS = 30;
const MAX_RECEIPTS = 500;

function text(value, max = 128) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function createRequestId() { return `air_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`; }
function classifyError(err) {
  const status = Number(err?.httpStatus || err?.response?.status || err?.status || 0);
  if (err?.code === 'ECONNABORTED' || /timeout/i.test(text(err?.message))) return 'timeout';
  if (status === 401 || status === 403) return 'provider_auth';
  if (status === 429) return 'provider_rate_limit';
  if (status >= 500) return 'provider_5xx';
  return 'request_failed';
}
function buildReceipt(input = {}) {
  const now = new Date(); const startedAt = input.startedAt instanceof Date ? input.startedAt : now;
  return { request_id: text(input.requestId, 64) || createRequestId(), execution_id: text(process.env.APPWRITE_FUNCTION_EXECUTION_ID, 64) || null, hub: text(input.hub, 64) || 'unknown', feature_id: text(input.feature, 64) || 'unknown', provider: text(input.provider, 32) || 'not_invoked', model: text(input.model, 128) || 'not_invoked', status: text(input.status, 24) || 'completed', http_status: Math.max(0, Math.min(599, Number(input.httpStatus) || 200)), latency_ms: Math.max(0, Math.min(999999, Math.round(Number(input.latencyMs) || 0))), is_fallback: input.fallback === true, is_admin_test: input.adminTest === true, user_id: text(input.userId, 64) || 'unknown', credits_charged: Math.max(0, Math.min(999999, Number(input.credits) || 0)), idempotency_state: text(input.idempotencyState, 24) || 'not_applicable', error_class: text(input.errorClass, 64) || null, started_at: startedAt.toISOString(), completed_at: now.toISOString(), expires_at: new Date(now.getTime() + RETENTION_DAYS * 86400000).toISOString() };
}
async function pruneReceipts(db) {
  try {
    const expired = await db.listDocuments(DB_ID, COLLECTION_ID, [sdk.Query.lessThanEqual('expires_at', new Date().toISOString()), sdk.Query.limit(25)]);
    await Promise.all((expired.documents || []).map(doc => db.deleteDocument(DB_ID, COLLECTION_ID, doc.$id).catch(() => {})));
    const oldest = await db.listDocuments(DB_ID, COLLECTION_ID, [sdk.Query.orderAsc('$createdAt'), sdk.Query.limit(MAX_RECEIPTS + 25)]);
    const overflow = Math.max(0, (oldest.total || 0) - MAX_RECEIPTS);
    await Promise.all((oldest.documents || []).slice(0, overflow).map(doc => db.deleteDocument(DB_ID, COLLECTION_ID, doc.$id).catch(() => {})));
  } catch {}
}
async function writeReceipt(db, input, log) {
  const receipt = buildReceipt(input);
  try { await db.createDocument(DB_ID, COLLECTION_ID, sdk.ID.unique(), receipt); void pruneReceipts(db); }
  catch (err) { log?.(`[ai-runtime-receipts] write skipped: ${text(err?.code || 'unavailable', 48)}`); }
  return receipt.request_id;
}
module.exports = { COLLECTION_ID, RETENTION_DAYS, MAX_RECEIPTS, createRequestId, classifyError, buildReceipt, pruneReceipts, writeReceipt };
