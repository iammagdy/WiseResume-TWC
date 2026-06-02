/**
 * admin-portfolio-usernames — Appwrite Function
 *
 * Serves PortfolioUsernamesPanel with five sections:
 *   - Directory  (directory_list, directory_rename, directory_toggle_enabled,
 *                 directory_release, directory_bulk_disable)
 *   - Rules      (rules_get, rules_update, rules_override_upsert, rules_override_delete)
 *   - Reserved   (reserved_list, reserved_add, reserved_delete)
 *   - Exclusive  (exclusive_list, exclusive_add, exclusive_delete)
 *   - Premium    (premium_list, premium_add, premium_delete, premium_assign)
 *   - Shared     (user_search)
 *
 * Auth: Authorization: Bearer <DEVKIT_PASSWORD>
 * Runtime: Node.js 18
 *
 * Required Function Variables:
 *   DEVKIT_PASSWORD       — shared secret matching the frontend DevKit token
 *   APPWRITE_API_KEY      — Appwrite API key with databases.read/write scopes
 *   APPWRITE_ENDPOINT     — e.g. https://fra.cloud.appwrite.io/v1
 *   APPWRITE_PROJECT_ID   — e.g. 69fd362b001eb325a192
 *
 * Database ID: main
 * Collections used:
 *   profiles                 — user_id ($id), username, portfolio_enabled, full_name, email
 *   username_rules           — single-row config; $id = "global"
 *   username_rules_overrides — user_id ($id), min_length, max_length, allow_hyphens, note
 *   username_reserved        — username ($id), reason
 *   username_exclusive       — username ($id), user_id, note
 *   username_premium         — username ($id), price_cents, currency, status,
 *                              assigned_to_user_id, assigned_at, note
 *
 * See README for full attribute specs and collection setup instructions.
 */

'use strict';

const sdk = require('node-appwrite');
const crypto = require('crypto');

// ─── Config ──────────────────────────────────────────────────────────────────

const DB_ID               = 'main';
const COL_PROFILES        = 'profiles';
const COL_RULES           = 'username_rules';
const COL_RULES_OVERRIDES = 'username_rules_overrides';
const COL_RESERVED        = 'username_reserved';
const COL_EXCLUSIVE       = 'username_exclusive';
const COL_PREMIUM         = 'username_premium';
const RULES_DOC_ID        = 'global';
const DEFAULT_PER_PAGE    = 50;
const MAX_PER_PAGE        = 200;
const USER_SEARCH_LIMIT   = 50;

// ─── Auth ─────────────────────────────────────────────────────────────────────

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
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

function bearerToken(req, body) {
  const authHeader = body?.__headers?.Authorization || req.headers?.authorization || req.headers?.Authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
}

function checkAuth(req, body) {
  const token = bearerToken(req, body);
  const password = process.env.DEVKIT_PASSWORD;
  if (!token) return false;
  if (password && token === password) return true;
  return verifySignedToken(token);
}

// ─── SDK clients ─────────────────────────────────────────────────────────────

function getClients() {
  const client = new sdk.Client();
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192')
    .setKey(process.env.APPWRITE_API_KEY || '');
  return { databases: new sdk.Databases(client) };
}

// ─── Logging helpers ─────────────────────────────────────────────────────────

function log(msg)   { console.log(msg); }
function error(msg) { console.error(msg); }

// ─── Profile helpers ─────────────────────────────────────────────────────────

function mapProfile(doc) {
  return {
    user_id:           doc.$id,
    username:          doc.username          ?? null,
    full_name:         doc.full_name         ?? null,
    email:             doc.email             ?? null,
    portfolio_enabled: doc.portfolio_enabled ?? null,
    updated_at:        doc.$updatedAt        ?? doc.updated_at ?? null,
    created_at:        doc.$createdAt        ?? doc.created_at ?? null,
  };
}

function profileSnippet(doc) {
  if (!doc) return null;
  return {
    email:     doc.email     ?? null,
    full_name: doc.full_name ?? null,
    username:  doc.username  ?? null,
  };
}

// ─── DIRECTORY ────────────────────────────────────────────────────────────────

async function handleDirectoryList(databases, body) {
  const search  = body.search  || '';
  const sort    = body.sort    || 'newest';
  const perPage = Math.min(Number(body.per_page) || DEFAULT_PER_PAGE, MAX_PER_PAGE);
  const page    = Math.max(1, Number(body.page) || 1);
  const offset  = (page - 1) * perPage;

  const queries = [sdk.Query.limit(perPage), sdk.Query.offset(offset)];

  // Ordering
  switch (sort) {
    case 'oldest':       queries.push(sdk.Query.orderAsc('$createdAt')); break;
    case 'username_asc': queries.push(sdk.Query.orderAsc('username'));   break;
    case 'username_desc':queries.push(sdk.Query.orderDesc('username'));  break;
    default:             queries.push(sdk.Query.orderDesc('$createdAt'));
  }

  // Only return profiles that have a username set
  queries.push(sdk.Query.isNotNull('username'));

  // Search filter — try each text field separately and merge
  if (search.trim()) {
    const q = search.trim();
    // Appwrite Query.search works on full-text-indexed attributes.
    // Use three separate requests and merge by user_id to avoid missing hits.
    const [byEmail, byName, byUsername] = await Promise.allSettled([
      databases.listDocuments(DB_ID, COL_PROFILES, [
        sdk.Query.limit(MAX_PER_PAGE),
        sdk.Query.isNotNull('username'),
        sdk.Query.search('email', q),
      ]),
      databases.listDocuments(DB_ID, COL_PROFILES, [
        sdk.Query.limit(MAX_PER_PAGE),
        sdk.Query.isNotNull('username'),
        sdk.Query.search('full_name', q),
      ]),
      databases.listDocuments(DB_ID, COL_PROFILES, [
        sdk.Query.limit(MAX_PER_PAGE),
        sdk.Query.isNotNull('username'),
        sdk.Query.search('username', q),
      ]),
    ]);

    const seen = new Set();
    const merged = [];
    for (const r of [byEmail, byName, byUsername]) {
      if (r.status !== 'fulfilled') continue;
      for (const doc of r.value.documents) {
        if (!seen.has(doc.$id)) { seen.add(doc.$id); merged.push(doc); }
      }
    }

    // Apply sort and pagination in memory for the merged result
    merged.sort((a, b) => {
      switch (sort) {
        case 'oldest':       return new Date(a.$createdAt) - new Date(b.$createdAt);
        case 'username_asc': return (a.username ?? '').localeCompare(b.username ?? '');
        case 'username_desc':return (b.username ?? '').localeCompare(a.username ?? '');
        default:             return new Date(b.$createdAt) - new Date(a.$createdAt);
      }
    });

    const total = merged.length;
    const rows  = merged.slice(offset, offset + perPage).map(mapProfile);
    return { rows, total };
  }

  const result = await databases.listDocuments(DB_ID, COL_PROFILES, queries);
  return { rows: result.documents.map(mapProfile), total: result.total };
}

/**
 * Resolve effective username rules for a user (global merged with per-user override).
 * Override fields that are non-null take priority over the global rule.
 */
async function resolveEffectiveRules(databases, userId) {
  const [globalRules, overrideDoc] = await Promise.allSettled([
    getGlobalRules(databases),
    databases.getDocument(DB_ID, COL_RULES_OVERRIDES, userId),
  ]);

  const base = globalRules.status === 'fulfilled' ? globalRules.value : DEFAULT_RULES;
  if (overrideDoc.status !== 'fulfilled' || overrideDoc.value.code === 404) {
    return base;
  }
  const ov = overrideDoc.value;
  return {
    id:            base.id,
    min_length:    ov.min_length    !== null && ov.min_length    !== undefined ? ov.min_length    : base.min_length,
    max_length:    ov.max_length    !== null && ov.max_length    !== undefined ? ov.max_length    : base.max_length,
    allow_hyphens: ov.allow_hyphens !== null && ov.allow_hyphens !== undefined ? ov.allow_hyphens : base.allow_hyphens,
  };
}

/** Validate a username slug against effective rules; throws a user-readable error on violation. */
function validateUsernameSlug(slug, rules) {
  if (slug.length < rules.min_length) {
    throw new Error(`Username must be at least ${rules.min_length} characters`);
  }
  if (slug.length > rules.max_length) {
    throw new Error(`Username must be at most ${rules.max_length} characters`);
  }
  if (!rules.allow_hyphens && slug.includes('-')) {
    throw new Error('Hyphens are not allowed in usernames');
  }
  // Only lowercase letters, digits, hyphens, and underscores
  if (!/^[a-z0-9_-]+$/.test(slug)) {
    throw new Error('Username may only contain lowercase letters, numbers, hyphens, and underscores');
  }
}

async function handleDirectoryRename(databases, body) {
  const userId      = body.user_id;
  const newUsername = body.new_username;
  if (!userId)      throw new Error('user_id is required');
  if (!newUsername) throw new Error('new_username is required');

  const slug = String(newUsername).trim().toLowerCase();

  // Enforce global + per-user rules
  const rules = await resolveEffectiveRules(databases, userId);
  validateUsernameSlug(slug, rules);

  // Check username is not reserved — Appwrite returns 404 when the doc doesn't exist
  try {
    await databases.getDocument(DB_ID, COL_RESERVED, slug);
    // If we reach here, the doc exists → it IS reserved
    throw new Error(`@${slug} is a reserved username`);
  } catch (e) {
    // 404 = not reserved (good); anything else with our own message re-throws cleanly
    if (e.code !== 404) throw e;
  }

  // Check username is not already taken by someone else
  const existing = await databases.listDocuments(DB_ID, COL_PROFILES, [
    sdk.Query.equal('username', slug),
    sdk.Query.limit(1),
  ]);
  if (existing.total > 0 && existing.documents[0].$id !== userId) {
    throw new Error(`@${slug} is already taken by another user`);
  }

  await databases.updateDocument(DB_ID, COL_PROFILES, userId, { username: slug });
  return { ok: true, username: slug };
}

async function handleDirectoryToggleEnabled(databases, body) {
  const userId  = body.user_id;
  const enabled = body.enabled;
  if (!userId)             throw new Error('user_id is required');
  if (enabled === undefined) throw new Error('enabled is required');

  await databases.updateDocument(DB_ID, COL_PROFILES, userId, {
    portfolio_enabled: !!enabled,
  });
  return { ok: true, portfolio_enabled: !!enabled };
}

async function handleDirectoryRelease(databases, body) {
  // Single: { user_id }  — Bulk: { user_ids: string[] }
  const userIds = body.user_ids
    ? (Array.isArray(body.user_ids) ? body.user_ids : [body.user_ids])
    : body.user_id ? [body.user_id] : [];

  if (userIds.length === 0) throw new Error('user_id or user_ids is required');

  let released = 0;
  await Promise.allSettled(
    userIds.map(async (uid) => {
      try {
        await databases.updateDocument(DB_ID, COL_PROFILES, uid, {
          username:          null,
          portfolio_enabled: false,
        });
        released++;
      } catch (e) {
        error(`admin-portfolio-usernames: release failed for ${uid}: ${e.message}`);
      }
    }),
  );

  return { ok: true, released };
}

async function handleDirectoryBulkDisable(databases, body) {
  const userIds = Array.isArray(body.user_ids) ? body.user_ids : [];
  if (userIds.length === 0) throw new Error('user_ids is required and must be a non-empty array');

  let disabled = 0;
  await Promise.allSettled(
    userIds.map(async (uid) => {
      try {
        await databases.updateDocument(DB_ID, COL_PROFILES, uid, { portfolio_enabled: false });
        disabled++;
      } catch (e) {
        error(`admin-portfolio-usernames: bulk-disable failed for ${uid}: ${e.message}`);
      }
    }),
  );

  return { ok: true, disabled };
}

// ─── RULES ────────────────────────────────────────────────────────────────────

const DEFAULT_RULES = { id: 1, min_length: 3, max_length: 30, allow_hyphens: true };

async function getGlobalRules(databases) {
  try {
    const doc = await databases.getDocument(DB_ID, COL_RULES, RULES_DOC_ID);
    return { id: 1, min_length: doc.min_length ?? 3, max_length: doc.max_length ?? 30, allow_hyphens: doc.allow_hyphens ?? true };
  } catch {
    return DEFAULT_RULES;
  }
}

async function fetchOverrides(databases) {
  try {
    const result = await databases.listDocuments(DB_ID, COL_RULES_OVERRIDES, [
      sdk.Query.limit(500),
      sdk.Query.orderDesc('$updatedAt'),
    ]);

    // Batch-fetch profiles for each override
    const profileIds = result.documents.map(d => d.$id);
    const profiles   = await batchGetProfiles(databases, profileIds);

    return result.documents.map(d => ({
      user_id:      d.$id,
      min_length:   d.min_length   ?? null,
      max_length:   d.max_length   ?? null,
      allow_hyphens: d.allow_hyphens ?? null,
      note:         d.note         ?? null,
      updated_at:   d.$updatedAt   ?? null,
      profile:      profileSnippet(profiles[d.$id]),
    }));
  } catch {
    return [];
  }
}

async function handleRulesGet(databases) {
  const [rules, overrides] = await Promise.all([
    getGlobalRules(databases),
    fetchOverrides(databases),
  ]);
  return { rules, overrides };
}

async function handleRulesUpdate(databases, body) {
  const patch = {};
  if (body.min_length    !== undefined) patch.min_length    = Number(body.min_length);
  if (body.max_length    !== undefined) patch.max_length    = Number(body.max_length);
  if (body.allow_hyphens !== undefined) patch.allow_hyphens = !!body.allow_hyphens;
  if (Object.keys(patch).length === 0) throw new Error('No rule fields provided');

  // Upsert — create if missing, update if exists
  let doc;
  try {
    doc = await databases.updateDocument(DB_ID, COL_RULES, RULES_DOC_ID, patch);
  } catch {
    doc = await databases.createDocument(DB_ID, COL_RULES, RULES_DOC_ID, {
      min_length:    patch.min_length    ?? 3,
      max_length:    patch.max_length    ?? 30,
      allow_hyphens: patch.allow_hyphens ?? true,
    });
  }

  return {
    rules: { id: 1, min_length: doc.min_length, max_length: doc.max_length, allow_hyphens: doc.allow_hyphens },
  };
}

async function handleRulesOverrideUpsert(databases, body) {
  const userId = body.user_id;
  if (!userId) throw new Error('user_id is required');

  const patch = {
    min_length:    body.min_length    !== undefined ? (body.min_length === null ? null : Number(body.min_length)) : null,
    max_length:    body.max_length    !== undefined ? (body.max_length === null ? null : Number(body.max_length)) : null,
    allow_hyphens: body.allow_hyphens !== undefined ? (body.allow_hyphens === null ? null : !!body.allow_hyphens) : null,
    note:          body.note          || null,
  };

  try {
    await databases.updateDocument(DB_ID, COL_RULES_OVERRIDES, userId, patch);
  } catch {
    await databases.createDocument(DB_ID, COL_RULES_OVERRIDES, userId, patch);
  }

  return { ok: true };
}

async function handleRulesOverrideDelete(databases, body) {
  const userId = body.user_id;
  if (!userId) throw new Error('user_id is required');
  await databases.deleteDocument(DB_ID, COL_RULES_OVERRIDES, userId);
  return { ok: true };
}

// ─── RESERVED ────────────────────────────────────────────────────────────────

async function handleReservedList(databases) {
  const result = await databases.listDocuments(DB_ID, COL_RESERVED, [
    sdk.Query.limit(1000),
    sdk.Query.orderAsc('$id'),
  ]);
  return {
    rows: result.documents.map(d => ({
      username:   d.$id,
      reason:     d.reason     ?? null,
      created_at: d.$createdAt ?? null,
    })),
  };
}

async function handleReservedAdd(databases, body) {
  const username = String(body.username || '').trim().toLowerCase();
  if (!username) throw new Error('username is required');

  try {
    await databases.createDocument(DB_ID, COL_RESERVED, username, {
      reason: body.reason ? String(body.reason).trim() : null,
    });
  } catch (e) {
    if (e.code === 409) throw new Error(`@${username} is already in the reserved list`);
    throw e;
  }

  return { ok: true, username };
}

async function handleReservedDelete(databases, body) {
  const username = String(body.username || '').trim().toLowerCase();
  if (!username) throw new Error('username is required');
  await databases.deleteDocument(DB_ID, COL_RESERVED, username);
  return { ok: true };
}

// ─── EXCLUSIVE ───────────────────────────────────────────────────────────────

async function handleExclusiveList(databases) {
  const result = await databases.listDocuments(DB_ID, COL_EXCLUSIVE, [
    sdk.Query.limit(500),
    sdk.Query.orderDesc('$createdAt'),
  ]);

  const profileIds = result.documents.map(d => d.user_id).filter(Boolean);
  const profiles   = await batchGetProfiles(databases, profileIds);

  return {
    rows: result.documents.map(d => ({
      username:   d.$id,
      user_id:    d.user_id    ?? null,
      note:       d.note       ?? null,
      created_at: d.$createdAt ?? null,
      profile:    profileSnippet(profiles[d.user_id]),
    })),
  };
}

async function handleExclusiveAdd(databases, body) {
  const username = String(body.username || '').trim().toLowerCase();
  const userId   = body.user_id;
  if (!username) throw new Error('username is required');
  if (!userId)   throw new Error('user_id is required');

  try {
    await databases.createDocument(DB_ID, COL_EXCLUSIVE, username, {
      user_id: userId,
      note:    body.note ? String(body.note).trim() : null,
    });
  } catch (e) {
    if (e.code === 409) throw new Error(`@${username} already has an exclusive assignment`);
    throw e;
  }

  return { ok: true, username };
}

async function handleExclusiveDelete(databases, body) {
  const username = String(body.username || '').trim().toLowerCase();
  if (!username) throw new Error('username is required');
  await databases.deleteDocument(DB_ID, COL_EXCLUSIVE, username);
  return { ok: true };
}

// ─── PREMIUM ──────────────────────────────────────────────────────────────────

async function handlePremiumList(databases) {
  const result = await databases.listDocuments(DB_ID, COL_PREMIUM, [
    sdk.Query.limit(500),
    sdk.Query.orderDesc('$createdAt'),
  ]);

  const profileIds = result.documents
    .map(d => d.assigned_to_user_id)
    .filter(Boolean);
  const profiles = await batchGetProfiles(databases, profileIds);

  return {
    rows: result.documents.map(d => ({
      username:              d.$id,
      price_cents:           d.price_cents           ?? 0,
      currency:              d.currency              ?? 'usd',
      status:                d.status                ?? 'available',
      assigned_to_user_id:   d.assigned_to_user_id   ?? null,
      assigned_at:           d.assigned_at           ?? null,
      note:                  d.note                  ?? null,
      created_at:            d.$createdAt            ?? null,
      updated_at:            d.$updatedAt            ?? null,
      profile:               profileSnippet(profiles[d.assigned_to_user_id]),
    })),
  };
}

async function handlePremiumAdd(databases, body) {
  const username   = String(body.username || '').trim().toLowerCase();
  const priceCents = Number(body.price_cents ?? 0);
  const currency   = String(body.currency || 'usd').toLowerCase();
  if (!username) throw new Error('username is required');
  if (isNaN(priceCents) || priceCents < 0) throw new Error('price_cents must be a non-negative number');

  try {
    await databases.createDocument(DB_ID, COL_PREMIUM, username, {
      price_cents:         priceCents,
      currency,
      status:              'available',
      assigned_to_user_id: null,
      assigned_at:         null,
      note:                body.note ? String(body.note).trim() : null,
    });
  } catch (e) {
    if (e.code === 409) throw new Error(`@${username} is already in the premium marketplace`);
    throw e;
  }

  return { ok: true, username };
}

async function handlePremiumDelete(databases, body) {
  const username = String(body.username || '').trim().toLowerCase();
  if (!username) throw new Error('username is required');
  await databases.deleteDocument(DB_ID, COL_PREMIUM, username);
  return { ok: true };
}

async function handlePremiumAssign(databases, body) {
  const username = String(body.username || '').trim().toLowerCase();
  const userId   = body.user_id;
  if (!username) throw new Error('username is required');
  if (!userId)   throw new Error('user_id is required');

  const now = new Date().toISOString();

  // Update premium record
  await databases.updateDocument(DB_ID, COL_PREMIUM, username, {
    status:              'assigned',
    assigned_to_user_id: userId,
    assigned_at:         now,
    note:                body.note ? String(body.note).trim() : null,
  });

  // Also set it as the user's portfolio username in profiles
  try {
    await databases.updateDocument(DB_ID, COL_PROFILES, userId, {
      username,
      portfolio_enabled: true,
    });
  } catch (e) {
    error(`admin-portfolio-usernames: premium_assign — could not update profile for ${userId}: ${e.message}`);
  }

  return { ok: true, username, assigned_to_user_id: userId };
}

// ─── USER SEARCH ──────────────────────────────────────────────────────────────

async function handleUserSearch(databases, body) {
  const query = String(body.query || '').trim();
  if (query.length < 2) return { rows: [] };

  // Run three parallel searches and merge by user_id
  const [byEmail, byName, byUsername] = await Promise.allSettled([
    databases.listDocuments(DB_ID, COL_PROFILES, [
      sdk.Query.limit(USER_SEARCH_LIMIT),
      sdk.Query.search('email', query),
    ]),
    databases.listDocuments(DB_ID, COL_PROFILES, [
      sdk.Query.limit(USER_SEARCH_LIMIT),
      sdk.Query.search('full_name', query),
    ]),
    databases.listDocuments(DB_ID, COL_PROFILES, [
      sdk.Query.limit(USER_SEARCH_LIMIT),
      sdk.Query.search('username', query),
    ]),
  ]);

  const seen = new Set();
  const merged = [];
  for (const r of [byEmail, byName, byUsername]) {
    if (r.status !== 'fulfilled') continue;
    for (const doc of r.value.documents) {
      if (!seen.has(doc.$id)) {
        seen.add(doc.$id);
        merged.push({
          user_id:   doc.$id,
          email:     doc.email     ?? null,
          full_name: doc.full_name ?? null,
          username:  doc.username  ?? null,
        });
      }
    }
  }

  return { rows: merged.slice(0, USER_SEARCH_LIMIT) };
}

// ─── Batch profile fetch helper ───────────────────────────────────────────────

/**
 * Fetches up to N profiles by their $id in one list query.
 * Returns a map of { [userId]: profileDoc }.
 */
async function batchGetProfiles(databases, userIds) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return {};

  const map = {};
  try {
    // Appwrite's Query.equal supports array values for an IN query
    const result = await databases.listDocuments(DB_ID, COL_PROFILES, [
      sdk.Query.limit(ids.length > MAX_PER_PAGE ? MAX_PER_PAGE : ids.length),
      sdk.Query.equal('$id', ids),
    ]);
    for (const doc of result.documents) {
      map[doc.$id] = doc;
    }
  } catch (e) {
    error(`admin-portfolio-usernames: batchGetProfiles error: ${e.message}`);
  }
  return map;
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
  log(`admin-portfolio-usernames: action=${action}`);

  const { databases } = getClients();

  try {
    switch (action) {

      // ── Directory ─────────────────────────────────────────────────────────
      case 'directory_list': {
        const data = await handleDirectoryList(databases, body);
        return res.json({ success: true, ...data });
      }
      case 'directory_rename': {
        const data = await handleDirectoryRename(databases, body);
        return res.json({ success: true, ...data });
      }
      case 'directory_toggle_enabled': {
        const data = await handleDirectoryToggleEnabled(databases, body);
        return res.json({ success: true, ...data });
      }
      case 'directory_release': {
        const data = await handleDirectoryRelease(databases, body);
        return res.json({ success: true, ...data });
      }
      case 'directory_bulk_disable': {
        const data = await handleDirectoryBulkDisable(databases, body);
        return res.json({ success: true, ...data });
      }

      // ── Rules ─────────────────────────────────────────────────────────────
      case 'rules_get': {
        const data = await handleRulesGet(databases);
        return res.json({ success: true, ...data });
      }
      case 'rules_update': {
        const data = await handleRulesUpdate(databases, body);
        return res.json({ success: true, ...data });
      }
      case 'rules_override_upsert': {
        const data = await handleRulesOverrideUpsert(databases, body);
        return res.json({ success: true, ...data });
      }
      case 'rules_override_delete': {
        const data = await handleRulesOverrideDelete(databases, body);
        return res.json({ success: true, ...data });
      }

      // ── Reserved ──────────────────────────────────────────────────────────
      case 'reserved_list': {
        const data = await handleReservedList(databases);
        return res.json({ success: true, ...data });
      }
      case 'reserved_add': {
        const data = await handleReservedAdd(databases, body);
        return res.json({ success: true, ...data });
      }
      case 'reserved_delete': {
        const data = await handleReservedDelete(databases, body);
        return res.json({ success: true, ...data });
      }

      // ── Exclusive ─────────────────────────────────────────────────────────
      case 'exclusive_list': {
        const data = await handleExclusiveList(databases);
        return res.json({ success: true, ...data });
      }
      case 'exclusive_add': {
        const data = await handleExclusiveAdd(databases, body);
        return res.json({ success: true, ...data });
      }
      case 'exclusive_delete': {
        const data = await handleExclusiveDelete(databases, body);
        return res.json({ success: true, ...data });
      }

      // ── Premium ───────────────────────────────────────────────────────────
      case 'premium_list': {
        const data = await handlePremiumList(databases);
        return res.json({ success: true, ...data });
      }
      case 'premium_add': {
        const data = await handlePremiumAdd(databases, body);
        return res.json({ success: true, ...data });
      }
      case 'premium_delete': {
        const data = await handlePremiumDelete(databases, body);
        return res.json({ success: true, ...data });
      }
      case 'premium_assign': {
        const data = await handlePremiumAssign(databases, body);
        return res.json({ success: true, ...data });
      }

      // ── User search ───────────────────────────────────────────────────────
      case 'user_search': {
        const data = await handleUserSearch(databases, body);
        return res.json({ success: true, ...data });
      }

      default:
        error(`admin-portfolio-usernames: unknown action=${action}`);
        return res.json({ success: false, error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    error(`admin-portfolio-usernames: error in action=${action}: ${e.message}`);
    return res.json({ success: false, error: e.message }, 500);
  }
};
