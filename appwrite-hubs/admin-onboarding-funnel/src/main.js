/**
 * admin-onboarding-funnel — Appwrite Function
 *
 * Serves OnboardingFunnelPanel with step-by-step funnel drop-off metrics.
 * Data source: audit_logs collection (category = 'onboarding') + optional
 * usage_events for richer step coverage.
 *
 * Auth: Authorization: Bearer <DEVKIT_PASSWORD>
 * Runtime: Node.js 18
 *
 * Required Function Variables:
 *   DEVKIT_PASSWORD        — shared secret matching the frontend DevKit token
 *   APPWRITE_API_KEY       — Appwrite API key with databases.read scope
 *   APPWRITE_ENDPOINT      — e.g. https://fra.cloud.appwrite.io/v1
 *   APPWRITE_PROJECT_ID    — e.g. 69fd362b001eb325a192
 *
 * Database ID: main
 * Collections: audit_logs, admin_audit_logs (fallback)
 *
 * Expected audit_log document shape:
 *   {
 *     user_id: string,
 *     category: 'onboarding',
 *     action: 'started' | 'path_selected' | 'review_opened' | 'completed'
 *           | 'skipped'  | 'save_failed',
 *     metadata: { method?: string; step?: string; message?: string },
 *     $createdAt: ISO string,
 *   }
 */

'use strict';

const sdk = require('node-appwrite');

// ─── Config ─────────────────────────────────────────────────────────────────

const DB_ID       = 'main';
const AUDIT_COLL  = 'audit_logs';

// Funnel steps in order — must match STEP_LABELS in OnboardingFunnelPanel.tsx
const FUNNEL_STEPS = ['started', 'path_selected', 'review_opened', 'completed'];

// If the audit_logs table returns > this many documents, mark result truncated
const TRUNCATION_LIMIT = 9999;

// Max docs per paginated fetch
const FETCH_LIMIT = 500;

// ─── Auth ────────────────────────────────────────────────────────────────────

function checkAuth(req) {
  const expected = process.env.DEVKIT_PASSWORD;
  if (!expected) return false;
  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) return false;
  return authHeader.slice(7) === expected;
}

// ─── SDK client ──────────────────────────────────────────────────────────────

function getClients() {
  const client = new sdk.Client();
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192')
    .setKey(process.env.APPWRITE_API_KEY || '');
  return { databases: new sdk.Databases(client) };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchAll(databases, collectionId, queries = []) {
  const allDocs = [];
  let cursor = null;

  while (true) {
    const q = [...queries, sdk.Query.limit(FETCH_LIMIT)];
    if (cursor) q.push(sdk.Query.cursorAfter(cursor));

    let page;
    try {
      page = await databases.listDocuments(DB_ID, collectionId, q);
    } catch {
      break;
    }

    const docs = page.documents || [];
    allDocs.push(...docs);
    if (docs.length < FETCH_LIMIT) break;
    cursor = docs[docs.length - 1].$id;
  }

  return allDocs;
}

/** Format a Date as YYYY-MM-DD (UTC) */
function toDateStr(date) {
  return date.toISOString().slice(0, 10);
}

/** Build a series of date buckets between two ISO strings */
function buildDateBuckets(fromIso, toIso, granularity) {
  const buckets = [];
  const start = new Date(fromIso);
  const end   = new Date(toIso);

  // Snap start to day boundary (UTC)
  start.setUTCHours(0, 0, 0, 0);

  const stepMs = granularity === 'week' ? 7 * 86400000 : 86400000;

  const cur = new Date(start);
  while (cur <= end) {
    buckets.push(toDateStr(cur));
    cur.setTime(cur.getTime() + stepMs);
  }

  return buckets;
}

/** Snap a date to the bucket key for the given granularity */
function bucketKey(isoString, granularity) {
  const d = new Date(isoString);
  if (granularity === 'week') {
    // Snap to Monday of the week (UTC)
    const day = d.getUTCDay(); // 0=Sun
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
    monday.setUTCHours(0, 0, 0, 0);
    return toDateStr(monday);
  }
  return toDateStr(d);
}

// ─── Main funnel computation ──────────────────────────────────────────────────

async function computeFunnel(databases, days, granularity) {
  const rangeTo   = new Date();
  const rangeFrom = new Date(Date.now() - days * 86400000);

  const fromIso = rangeFrom.toISOString();
  const toIso   = rangeTo.toISOString();

  // Fetch all onboarding audit events in range
  const docs = await fetchAll(databases, AUDIT_COLL, [
    sdk.Query.equal('category', 'onboarding'),
    sdk.Query.greaterThanEqual('$createdAt', fromIso),
    sdk.Query.lessThanEqual('$createdAt', toIso),
    sdk.Query.orderAsc('$createdAt'),
  ]);

  const totalEvents = docs.length;
  const truncated   = totalEvents >= TRUNCATION_LIMIT;

  // ── Funnel: unique users per step (a user is counted at a step if they have
  //    at least one event with that action, regardless of order) ──────────────
  const stepUsers = {};
  for (const step of FUNNEL_STEPS) stepUsers[step] = new Set();

  // Method breakdown: action=path_selected, metadata.method
  const methodCounts = {};

  // Skip events: action=skipped, metadata.step
  const skipCounts = {};     // step → count
  const skipDenoms = {};     // step → Set<user_id> (users that reached the step)

  // Save failures: action=save_failed, metadata.message
  const saveFailCounts = {};

  // Series: per bucket, per step counts (by event, not unique users)
  const seriesBuckets = {};

  for (const doc of docs) {
    const userId = doc.user_id || doc.anon_id || null;
    const action  = (doc.action || '').toLowerCase();
    const meta    = doc.metadata || {};
    const ts      = doc.$createdAt;
    const bKey    = bucketKey(ts, granularity);

    if (!seriesBuckets[bKey]) {
      seriesBuckets[bKey] = { started: 0, path_selected: 0, review_opened: 0, completed: 0 };
    }

    // Funnel step tracking
    if (FUNNEL_STEPS.includes(action)) {
      if (userId) stepUsers[action].add(userId);
      if (seriesBuckets[bKey][action] !== undefined) seriesBuckets[bKey][action]++;
    }

    // Method breakdown
    if (action === 'path_selected') {
      const method = meta.method || 'unknown';
      methodCounts[method] = (methodCounts[method] || 0) + 1;
    }

    // Skip rates
    if (action === 'skipped') {
      const step = meta.step || 'unknown';
      skipCounts[step] = (skipCounts[step] || 0) + 1;
    }

    // Track users per step for skip denominators
    if (FUNNEL_STEPS.includes(action) && userId) {
      if (!skipDenoms[action]) skipDenoms[action] = new Set();
      skipDenoms[action].add(userId);
    }

    // Save failures
    if (action === 'save_failed') {
      const msg = meta.message || 'unknown error';
      saveFailCounts[msg] = (saveFailCounts[msg] || 0) + 1;
    }
  }

  // ── Build output shapes ────────────────────────────────────────────────────

  const funnel = FUNNEL_STEPS.map(step => ({
    step,
    users: stepUsers[step].size,
  }));

  const methodBreakdown = Object.entries(methodCounts)
    .map(([method, count]) => ({ method, count }))
    .sort((a, b) => b.count - a.count);

  const skipRates = Object.entries(skipCounts).map(([step, count]) => {
    const denominator = (skipDenoms[step] || new Set()).size + count; // reached + skipped
    return {
      step,
      count,
      denominator,
      rate: denominator > 0 ? count / denominator : 0,
    };
  }).sort((a, b) => b.rate - a.rate);

  const saveFailures = Object.entries(saveFailCounts)
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count);

  // Build time series with all buckets, filling gaps with 0
  const allBuckets = buildDateBuckets(fromIso, toIso, granularity);
  const series = allBuckets.map(date => ({
    date,
    started:       seriesBuckets[date]?.started       ?? 0,
    path_selected: seriesBuckets[date]?.path_selected ?? 0,
    review_opened: seriesBuckets[date]?.review_opened ?? 0,
    completed:     seriesBuckets[date]?.completed     ?? 0,
  }));

  return {
    rangeFrom: fromIso,
    rangeTo:   toIso,
    totalEvents,
    truncated,
    methodBreakdown,
    funnel,
    skipRates,
    saveFailures,
    series,
  };
}

// ─── Main entry point ────────────────────────────────────────────────────────

module.exports = async ({ req, res, log, error }) => {
  if (!checkAuth(req)) {
    return res.json({ success: false, error: 'Unauthorized' }, 401);
  }

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return res.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const days        = Number(body.days)        || 14;
  const granularity = body.granularity === 'week' ? 'week' : 'day';
  log(`admin-onboarding-funnel: days=${days} granularity=${granularity}`);

  const { databases } = getClients();

  try {
    const data = await computeFunnel(databases, days, granularity);
    return res.json({ success: true, data });
  } catch (e) {
    error(`admin-onboarding-funnel: unhandled error: ${e}`);
    return res.json({ success: false, error: String(e) }, 500);
  }
};
