'use strict';

const sdk = require('node-appwrite');
const { Client, Databases, Account, Query, ID, Permission, Role } = sdk;

const DB_ID = 'main';
const USER_ACTIONS_COLLECTION_ID = 'user_job_actions';

function getDbClient() {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;

  const client = new Client().setEndpoint(endpoint).setProject(projectId);
  if (apiKey) client.setKey(apiKey);
  return new Databases(client);
}

async function authenticateRequest(body, req) {
  const embeddedHeaders = (body && typeof body.__headers === 'object' && body.__headers) || {};
  const authHeader =
    (typeof embeddedHeaders.Authorization === 'string' ? embeddedHeaders.Authorization : '') ||
    (typeof embeddedHeaders['X-Appwrite-JWT'] === 'string' ? `Bearer ${embeddedHeaders['X-Appwrite-JWT']}` : '') ||
    (typeof req.headers?.authorization === 'string' ? req.headers.authorization : '');
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return { ok: false };
  try {
    const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
    const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
    const client = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
    const user = await new Account(client).get();
    return { ok: true, userId: user.$id };
  } catch {
    return { ok: false };
  }
}

module.exports = async ({ req, res, log, error }) => {
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.json({ ok: false, error: 'Invalid request body' }, 400);
  }

  const auth = await authenticateRequest(body, req);
  if (!auth.ok) {
    return res.json({ ok: false, error: 'Authentication required to track job actions.' }, 401);
  }

  const userId = auth.userId;
  const { job_feed_item_id, canonical_url, action, notes, source_resume_id, tailored_resume_id } = body || {};

  if (!job_feed_item_id || !action) {
    return res.json({ ok: false, error: 'job_feed_item_id and action are required' }, 400);
  }

  const allowedActions = ['save', 'mark_applied', 'dismiss', 'undo'];
  if (!allowedActions.includes(action)) {
    return res.json({ ok: false, error: `Invalid action. Must be one of: ${allowedActions.join(', ')}` }, 400);
  }

  const actionKey = `${userId}:${job_feed_item_id}`;
  const db = getDbClient();

  try {
    // Check for existing action document
    const existingRes = await db.listDocuments(DB_ID, USER_ACTIONS_COLLECTION_ID, [
      Query.equal('action_key', actionKey),
      Query.limit(1),
    ]);
    const existingDoc = existingRes.documents?.[0];

    if (action === 'undo') {
      if (existingDoc) {
        await db.deleteDocument(DB_ID, USER_ACTIONS_COLLECTION_ID, existingDoc.$id);
        log(`Deleted job action for ${actionKey}`);
      }
      return res.json({ ok: true, action: 'undo', job_feed_item_id });
    }

    const mapStatus = {
      save: 'saved',
      mark_applied: 'applied',
      dismiss: 'dismissed',
    };

    const targetStatus = mapStatus[action];
    const now = new Date().toISOString();

    const payload = {
      user_id: userId,
      job_feed_item_id,
      canonical_url: canonical_url || '',
      status: targetStatus,
      applied_at: targetStatus === 'applied' ? (existingDoc?.applied_at || now) : (existingDoc?.applied_at || null),
      saved_at: targetStatus === 'saved' ? (existingDoc?.saved_at || now) : (existingDoc?.saved_at || null),
      dismissed_at: targetStatus === 'dismissed' ? (existingDoc?.dismissed_at || now) : (existingDoc?.dismissed_at || null),
      notes: notes || existingDoc?.notes || '',
      source_resume_id: source_resume_id || existingDoc?.source_resume_id || '',
      tailored_resume_id: tailored_resume_id || existingDoc?.tailored_resume_id || '',
      action_key: actionKey,
    };

    const permissions = [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ];

    let doc;
    if (existingDoc) {
      doc = await db.updateDocument(DB_ID, USER_ACTIONS_COLLECTION_ID, existingDoc.$id, payload);
      log(`Updated job action ${existingDoc.$id} to ${targetStatus}`);
    } else {
      doc = await db.createDocument(DB_ID, USER_ACTIONS_COLLECTION_ID, ID.unique(), payload, permissions);
      log(`Created job action ${doc.$id} with status ${targetStatus}`);
    }

    return res.json({
      ok: true,
      action: targetStatus,
      docId: doc.$id,
      status: doc.status,
      applied_at: doc.applied_at,
      saved_at: doc.saved_at,
    });
  } catch (err) {
    error(`Failed to track job action: ${err.message}`);
    return res.json({ ok: false, error: 'Failed to record job action.' }, 500);
  }
};
