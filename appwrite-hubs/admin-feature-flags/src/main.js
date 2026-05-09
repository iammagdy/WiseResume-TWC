/**
 * admin-feature-flags — Appwrite Function
 *
 * CRUD for feature flags stored in Appwrite Databases.
 * Serves FeatureFlagsPanel (list / upsert / delete).
 *
 * Auth: Authorization: Bearer <DEVKIT_PASSWORD>
 * Runtime: Node.js 18
 *
 * Required Function Variables:
 *   DEVKIT_PASSWORD        — shared secret matching the frontend DevKit token
 *   APPWRITE_API_KEY       — Appwrite API key with databases.read + databases.write scope
 *   APPWRITE_ENDPOINT      — e.g. https://fra.cloud.appwrite.io/v1
 *   APPWRITE_PROJECT_ID    — e.g. 69fd362b001eb325a192
 *
 * Database ID: main
 * Collection: feature_flags
 *
 * Expected document attributes:
 *   name                 string    (required, unique slug — indexed)
 *   description          string
 *   enabled_globally     boolean
 *   enabled_plans        string[]
 *   enabled_user_ids     string[]
 *   percentage_rollout   integer   (0–100)
 *   kill_switch_function string    (nullable)
 *   updated_by           string
 *   updated_at           string    (ISO timestamp)
 */

'use strict';

const sdk = require('node-appwrite');

// ─── Config ──────────────────────────────────────────────────────────────────

const DB_ID         = 'main';
const FLAGS_COLL    = 'feature_flags';

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

// ─── Shape helpers ────────────────────────────────────────────────────────────

/** Map an Appwrite document to the FeatureFlag shape the frontend expects. */
function docToFlag(doc) {
  return {
    id:                   doc.$id,
    name:                 doc.name                 ?? '',
    description:          doc.description          ?? '',
    enabled_globally:     doc.enabled_globally     ?? false,
    enabled_plans:        doc.enabled_plans        ?? [],
    enabled_user_ids:     doc.enabled_user_ids     ?? [],
    percentage_rollout:   doc.percentage_rollout   ?? 0,
    kill_switch_function: doc.kill_switch_function ?? null,
    updated_by:           doc.updated_by           ?? '',
    updated_at:           doc.updated_at           ?? doc.$updatedAt ?? new Date().toISOString(),
  };
}

/** Normalise flag name to slug form. */
function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

// ─── Action: list ────────────────────────────────────────────────────────────

async function handleList(databases) {
  const allFlags = [];
  let cursor = null;

  while (true) {
    const q = [sdk.Query.limit(500), sdk.Query.orderAsc('name')];
    if (cursor) q.push(sdk.Query.cursorAfter(cursor));

    let page;
    try {
      page = await databases.listDocuments(DB_ID, FLAGS_COLL, q);
    } catch (e) {
      // If collection doesn't exist yet return an empty list rather than
      // crashing — the admin can create the collection first.
      const msg = String(e);
      if (msg.includes('not found') || msg.includes('Collection with the requested ID')) {
        return { flags: [] };
      }
      throw e;
    }

    const docs = page.documents || [];
    allFlags.push(...docs);
    if (docs.length < 500) break;
    cursor = docs[docs.length - 1].$id;
  }

  return { flags: allFlags.map(docToFlag).sort((a, b) => a.name.localeCompare(b.name)) };
}

// ─── Action: upsert ──────────────────────────────────────────────────────────

async function handleUpsert(databases, body) {
  const rawName = body.name;
  if (!rawName) throw new Error('name is required for upsert');

  const name = slugify(rawName);

  const payload = {
    name,
    description:          String(body.description          ?? ''),
    enabled_globally:     Boolean(body.enabled_globally    ?? false),
    enabled_plans:        Array.isArray(body.enabled_plans)    ? body.enabled_plans    : [],
    enabled_user_ids:     Array.isArray(body.enabled_user_ids) ? body.enabled_user_ids : [],
    percentage_rollout:   Math.max(0, Math.min(100, Number(body.percentage_rollout ?? 0))),
    kill_switch_function: body.kill_switch_function || null,
    updated_by:           body.updated_by || 'admin',
    updated_at:           new Date().toISOString(),
  };

  // Look up existing document by name
  let existingId = null;
  try {
    const found = await databases.listDocuments(DB_ID, FLAGS_COLL, [
      sdk.Query.equal('name', name),
      sdk.Query.limit(1),
    ]);
    if (found.documents.length > 0) existingId = found.documents[0].$id;
  } catch {
    // Collection may not exist yet — will throw on create below with a clear error
  }

  let doc;
  if (existingId) {
    doc = await databases.updateDocument(DB_ID, FLAGS_COLL, existingId, payload);
  } else {
    doc = await databases.createDocument(
      DB_ID,
      FLAGS_COLL,
      sdk.ID.unique(),
      payload,
    );
  }

  return { flag: docToFlag(doc) };
}

// ─── Action: delete ──────────────────────────────────────────────────────────

async function handleDelete(databases, name) {
  if (!name) throw new Error('name is required for delete');

  // Find the document by name
  let docId = null;
  try {
    const found = await databases.listDocuments(DB_ID, FLAGS_COLL, [
      sdk.Query.equal('name', name),
      sdk.Query.limit(1),
    ]);
    if (found.documents.length > 0) docId = found.documents[0].$id;
  } catch {
    throw new Error(`Could not find flag "${name}"`);
  }

  if (!docId) throw new Error(`Flag "${name}" not found`);

  await databases.deleteDocument(DB_ID, FLAGS_COLL, docId);
  return { deleted: name };
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

  const action = body.action;
  log(`admin-feature-flags: action=${action}`);

  const { databases } = getClients();

  try {
    switch (action) {
      case 'list': {
        const data = await handleList(databases);
        return res.json({ success: true, ...data });
      }

      case 'upsert': {
        const data = await handleUpsert(databases, body);
        return res.json({ success: true, ...data });
      }

      case 'delete': {
        const data = await handleDelete(databases, body.name);
        return res.json({ success: true, ...data });
      }

      default:
        error(`admin-feature-flags: unknown action=${action}`);
        return res.json({ success: false, error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    error(`admin-feature-flags: unhandled error action=${action}: ${e}`);
    return res.json({ success: false, error: String(e) }, 500);
  }
};
