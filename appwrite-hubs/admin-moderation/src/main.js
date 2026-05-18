/**
 * admin-moderation — Appwrite Function
 *
 * Serves ModerationPanel with three modules:
 *   - Bug Inbox    (list_bug_reports, update_bug_report)
 *   - Blocklist    (list_blocklist, add_blocklist, remove_blocklist)
 *   - Mod Queue    (list_moderation_queue, review_queue_item)
 *
 * Auth: Authorization: Bearer <DEVKIT_PASSWORD>
 * Runtime: Node.js 18
 *
 * Required Function Variables:
 *   DEVKIT_PASSWORD       — shared secret matching the frontend DevKit token
 *   APPWRITE_API_KEY      — Appwrite API key with databases.read/write + users.write scopes
 *   APPWRITE_ENDPOINT     — e.g. https://fra.cloud.appwrite.io/v1
 *   APPWRITE_PROJECT_ID   — e.g. 69fd362b001eb325a192
 *
 * Database ID: main
 * Collections used:
 *   bug_reports       — see README for attribute spec
 *   blocklist         — see README for attribute spec
 *   moderation_queue  — see README for attribute spec
 */

'use strict';

const sdk = require('node-appwrite');
const crypto = require('crypto');

// ─── Config ──────────────────────────────────────────────────────────────────

const DB_ID            = 'main';
const COL_BUGS         = 'bug_reports';
const COL_BLOCKLIST    = 'blocklist';
const COL_MOD_QUEUE    = 'moderation_queue';
const DEFAULT_PER_PAGE = 50;
const MAX_PER_PAGE     = 200;

// ─── Auth ─────────────────────────────────────────────────────────────────────

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
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

function bearerToken(req, body) {
  const authHeader = body?.__headers?.Authorization || req.headers?.authorization || req.headers?.Authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
}

function checkAuth(req, body) {
  const token = bearerToken(req, body);
  const password = process.env.DEVKIT_PASSWORD;
  if (!password || !token) return false;
  if (token === password) return true;
  return verifySignedToken(token);
}

// ─── SDK clients ─────────────────────────────────────────────────────────────

function getClients() {
  const client = new sdk.Client();
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192')
    .setKey(process.env.APPWRITE_API_KEY || '');
  return {
    databases: new sdk.Databases(client),
    users:     new sdk.Users(client),
  };
}

// ─── Logging helpers ─────────────────────────────────────────────────────────

function log(msg)   { console.log(msg); }
function error(msg) { console.error(msg); }

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Map an Appwrite document to a BugReport shape. */
function mapBug(doc) {
  return {
    id:                doc.$id,
    user_email:        doc.user_email        ?? null,
    error_message:     doc.error_message     ?? '',
    error_stack:       doc.error_stack       ?? null,
    component_stack:   doc.component_stack   ?? null,
    additional_context: doc.additional_context ?? null,
    session_id:        doc.session_id        ?? null,
    user_agent:        doc.user_agent        ?? null,
    route:             doc.route             ?? null,
    status:            doc.status            ?? 'open',
    private_note:      doc.private_note      ?? null,
    app_version:       doc.app_version       ?? null,
    created_at:        doc.$createdAt        ?? doc.created_at ?? null,
  };
}

/** Map an Appwrite document to a BlocklistEntry shape. */
function mapBlocklistEntry(doc) {
  return {
    id:       doc.$id,
    type:     doc.type      ?? 'email',
    value:    doc.value     ?? '',
    reason:   doc.reason    ?? null,
    added_by: doc.added_by  ?? null,
    added_at: doc.$createdAt ?? doc.added_at ?? null,
  };
}

/** Map an Appwrite document to a QueueItem shape. */
function mapQueueItem(doc) {
  return {
    id:               doc.$id,
    content_type:     doc.content_type     ?? '',
    content_id:       doc.content_id       ?? null,
    snippet:          doc.snippet          ?? null,
    reporter_user_id: doc.reporter_user_id ?? null,
    status:           doc.status           ?? 'pending',
    reviewed_by:      doc.reviewed_by      ?? null,
    reviewed_at:      doc.reviewed_at      ?? null,
    created_at:       doc.$createdAt       ?? doc.created_at ?? null,
  };
}

// ─── Bug reports ─────────────────────────────────────────────────────────────

async function handleListBugReports(databases, body) {
  const statusFilter = body.status_filter || null;
  const perPage  = Math.min(Number(body.per_page) || DEFAULT_PER_PAGE, MAX_PER_PAGE);
  const page     = Math.max(1, Number(body.page) || 1);
  const offset   = (page - 1) * perPage;

  const queries = [
    sdk.Query.limit(perPage),
    sdk.Query.offset(offset),
    sdk.Query.orderDesc('$createdAt'),
  ];

  if (statusFilter && statusFilter !== 'all') {
    queries.push(sdk.Query.equal('status', statusFilter));
  }

  const result = await databases.listDocuments(DB_ID, COL_BUGS, queries);
  return {
    bug_reports: result.documents.map(mapBug),
    total:       result.total,
  };
}

async function handleUpdateBugReport(databases, body) {
  const id = body.report_id;
  if (!id) throw new Error('report_id is required');

  const patch = {};
  if (body.status       !== undefined) patch.status       = body.status;
  if (body.private_note !== undefined) patch.private_note = body.private_note;
  if (Object.keys(patch).length === 0) throw new Error('No fields to update');

  await databases.updateDocument(DB_ID, COL_BUGS, id, patch);
  return { ok: true };
}

// ─── Blocklist ────────────────────────────────────────────────────────────────

async function handleListBlocklist(databases) {
  const result = await databases.listDocuments(DB_ID, COL_BLOCKLIST, [
    sdk.Query.limit(500),
    sdk.Query.orderDesc('$createdAt'),
  ]);
  return { entries: result.documents.map(mapBlocklistEntry) };
}

async function handleAddBlocklist(databases, body) {
  const type  = body.type;
  const value = body.value;
  if (!type)  throw new Error('type is required');
  if (!value) throw new Error('value is required');

  const VALID_TYPES = ['email', 'user_id', 'pattern'];
  if (!VALID_TYPES.includes(type)) {
    throw new Error(`type must be one of: ${VALID_TYPES.join(', ')}`);
  }

  const doc = await databases.createDocument(DB_ID, COL_BLOCKLIST, sdk.ID.unique(), {
    type,
    value:  String(value).trim(),
    reason: body.reason ? String(body.reason).trim() : null,
  });
  return { ok: true, id: doc.$id };
}

async function handleRemoveBlocklist(databases, body) {
  const id = body.entry_id;
  if (!id) throw new Error('entry_id is required');
  await databases.deleteDocument(DB_ID, COL_BLOCKLIST, id);
  return { ok: true };
}

// ─── Moderation queue ─────────────────────────────────────────────────────────

async function handleListModerationQueue(databases, body) {
  const statusFilter = body.status_filter || null;
  const perPage  = Math.min(Number(body.per_page) || DEFAULT_PER_PAGE, MAX_PER_PAGE);
  const page     = Math.max(1, Number(body.page) || 1);
  const offset   = (page - 1) * perPage;

  const queries = [
    sdk.Query.limit(perPage),
    sdk.Query.offset(offset),
    sdk.Query.orderDesc('$createdAt'),
  ];

  if (statusFilter && statusFilter !== 'all') {
    queries.push(sdk.Query.equal('status', statusFilter));
  }

  const result = await databases.listDocuments(DB_ID, COL_MOD_QUEUE, queries);
  return {
    items: result.documents.map(mapQueueItem),
    total: result.total,
  };
}

async function handleReviewQueueItem(databases, users, body) {
  const id       = body.item_id;
  const decision = body.decision;
  if (!id)       throw new Error('item_id is required');
  if (!decision) throw new Error('decision is required (approved | removed)');
  if (!['approved', 'removed'].includes(decision)) {
    throw new Error('decision must be "approved" or "removed"');
  }

  // Fetch the item to get the user ID for potential suspension.
  // NOTE: `reporter_user_id` stores whoever filed the report. If your queue
  // schema stores the content-owner ID in a separate field (e.g.
  // `content_owner_user_id`), replace `reporter_user_id` below with that
  // field so the correct account is suspended. Current schema only has one
  // user-ID field, so "Remove + Suspend User" suspends the reporter.
  const item = await databases.getDocument(DB_ID, COL_MOD_QUEUE, id);

  const now = new Date().toISOString();
  await databases.updateDocument(DB_ID, COL_MOD_QUEUE, id, {
    status:      decision,
    reviewed_at: now,
  });

  if (body.suspend_user && item.reporter_user_id) {
    try {
      await users.updateStatus(item.reporter_user_id, false);
    } catch (e) {
      error(`admin-moderation: failed to suspend user ${item.reporter_user_id}: ${e.message}`);
    }
  }

  return { ok: true, decision };
}

// ─── Entry point ──────────────────────────────────────────────────────────────

module.exports = async ({ req, res, log: _log, error: _error }) => {
  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return res.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  if (!checkAuth(req, body)) {
    return res.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const action = body.action;
  log(`admin-moderation: action=${action}`);

  const { databases, users } = getClients();

  try {
    switch (action) {

      // ── Bug reports ───────────────────────────────────────────────────────
      case 'list_bug_reports': {
        const data = await handleListBugReports(databases, body);
        return res.json({ success: true, ...data });
      }
      case 'update_bug_report': {
        const data = await handleUpdateBugReport(databases, body);
        return res.json({ success: true, ...data });
      }

      // ── Blocklist ─────────────────────────────────────────────────────────
      case 'list_blocklist': {
        const data = await handleListBlocklist(databases);
        return res.json({ success: true, ...data });
      }
      case 'add_blocklist': {
        const data = await handleAddBlocklist(databases, body);
        return res.json({ success: true, ...data });
      }
      case 'remove_blocklist': {
        const data = await handleRemoveBlocklist(databases, body);
        return res.json({ success: true, ...data });
      }

      // ── Moderation queue ──────────────────────────────────────────────────
      case 'list_moderation_queue': {
        const data = await handleListModerationQueue(databases, body);
        return res.json({ success: true, ...data });
      }
      case 'review_queue_item': {
        const data = await handleReviewQueueItem(databases, users, body);
        return res.json({ success: true, ...data });
      }

      default:
        error(`admin-moderation: unknown action=${action}`);
        return res.json({ success: false, error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    error(`admin-moderation: error in action=${action}: ${e.message}`);
    return res.json({ success: false, error: e.message }, 500);
  }
};
