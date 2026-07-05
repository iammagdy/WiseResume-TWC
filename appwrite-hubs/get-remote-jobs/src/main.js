'use strict';

const sdk = require('node-appwrite');
const { Client, Databases, Account, Query } = sdk;

const DB_ID = 'main';
const JOBS_COLLECTION_ID = 'job_feed_items';
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
  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch {
    body = {};
  }

  const auth = await authenticateRequest(body, req);
  const userId = auth.ok ? auth.userId : null;

  const page = Math.max(1, parseInt(body.page || 1, 10));
  const limit = Math.min(100, Math.max(1, parseInt(body.limit || 20, 10)));
  const offset = (page - 1) * limit;

  const sourceFilter = body.source;
  const categoryFilter = body.category;
  const search = body.query ? String(body.query).trim().toLowerCase() : '';

  const db = getDbClient();
  const queries = [
    Query.orderDesc('published_at'),
    Query.limit(limit),
    Query.offset(offset),
  ];

  if (sourceFilter) {
    queries.push(Query.equal('source', sourceFilter));
  }
  if (categoryFilter) {
    queries.push(Query.equal('category', categoryFilter));
  }

  try {
    const response = await db.listDocuments(DB_ID, JOBS_COLLECTION_ID, queries);
    let jobs = response.documents || [];
    const total = response.total || jobs.length;

    // Filter by search query if present
    if (search) {
      jobs = jobs.filter(j =>
        (j.title || '').toLowerCase().includes(search) ||
        (j.company || '').toLowerCase().includes(search) ||
        (j.location || '').toLowerCase().includes(search) ||
        (j.description_excerpt || '').toLowerCase().includes(search)
      );
    }

    // Attach user actions if user is authenticated
    if (userId && jobs.length > 0) {
      try {
        const itemIds = jobs.map(j => j.$id).filter(Boolean);
        const userActionsRes = await db.listDocuments(DB_ID, USER_ACTIONS_COLLECTION_ID, [
          Query.equal('user_id', userId),
          Query.equal('job_feed_item_id', itemIds),
          Query.limit(100),
        ]);

        const actionMap = new Map();
        for (const actionDoc of (userActionsRes.documents || [])) {
          actionMap.set(actionDoc.job_feed_item_id, actionDoc);
        }

        jobs = jobs.map(job => {
          const action = actionMap.get(job.$id);
          return {
            ...job,
            user_action: action
              ? {
                  status: action.status,
                  applied_at: action.applied_at,
                  saved_at: action.saved_at,
                  dismissed_at: action.dismissed_at,
                  notes: action.notes,
                }
              : null,
          };
        });
      } catch (err) {
        log(`Notice: could not load user job actions: ${err.message}`);
      }
    }

    return res.json({
      ok: true,
      jobs,
      total,
      page,
      limit,
    });
  } catch (err) {
    error(`Failed to fetch remote jobs: ${err.message}`);
    return res.json({ ok: false, error: 'Could not fetch remote jobs feed.', jobs: [], total: 0 }, 500);
  }
};
