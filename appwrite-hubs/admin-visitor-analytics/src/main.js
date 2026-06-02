/**
 * admin-visitor-analytics — Appwrite Function
 *
 * Serves VisitorsPanel (kpis, country-dist, top-pages, click-targets,
 * sections, sessions, cohort, journey) and MissionControlPanel (live-count).
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
 * Collections: visitor_events
 */

'use strict';

const sdk = require('node-appwrite');
const crypto = require('crypto');

// ─── Config ────────────────────────────────────────────────────────────────

const DB_ID = 'main';
const COLLECTION_VISITOR_EVENTS = 'visitor_events';

// "Live" means active within this many milliseconds
const LIVE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// Sessions page size
const SESSION_PAGE_SIZE = 50;

// Max events to fetch per query (Appwrite cap is 500 per request)
const MAX_FETCH = 500;

// ─── Auth ───────────────────────────────────────────────────────────────────

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

// ─── SDK client ─────────────────────────────────────────────────────────────

function getClients() {
  const client = new sdk.Client();
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192')
    .setKey(process.env.APPWRITE_API_KEY || '');
  return { databases: new sdk.Databases(client) };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Fetch all documents from a collection up to a cap, absorbing
 * "collection not found" / permission errors gracefully.
 */
async function fetchAll(databases, collectionId, queries = []) {
  const allDocs = [];
  let cursor = null;
  const limit = MAX_FETCH;

  while (true) {
    const q = [...queries, sdk.Query.limit(limit)];
    if (cursor) q.push(sdk.Query.cursorAfter(cursor));

    let page;
    try {
      page = await databases.listDocuments(DB_ID, collectionId, q);
    } catch {
      break;
    }

    const docs = page.documents || [];
    allDocs.push(...docs);

    if (docs.length < limit) break;
    cursor = docs[docs.length - 1].$id;
  }

  return allDocs;
}

/** ISO string for `now - ms` */
function ago(ms) {
  return new Date(Date.now() - ms).toISOString();
}

/** ISO boundary for range string */
function rangeStart(range) {
  const map = {
    today: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
    '7d':  ago(7  * 86400000),
    '30d': ago(30 * 86400000),
    '90d': ago(90 * 86400000),
  };
  return map[range] ?? map['7d'];
}

/** Normalize device_type string → 'mobile' | 'tablet' | 'desktop' */
function normalizeDevice(raw) {
  if (!raw) return 'desktop';
  const v = raw.toLowerCase();
  if (v.includes('mobile') || v.includes('phone') || v.includes('android')) return 'mobile';
  if (v.includes('tablet') || v.includes('ipad')) return 'tablet';
  return 'desktop';
}

/** Build a ranked-count map from an array of string values */
function countBy(arr, key) {
  const map = {};
  for (const item of arr) {
    const v = item[key] || 'unknown';
    map[v] = (map[v] || 0) + 1;
  }
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/** Build a ranked list keyed by country string */
function countByCountry(arr) {
  const map = {};
  for (const item of arr) {
    const c = item.country || '??';
    map[c] = (map[c] || 0) + 1;
  }
  return Object.entries(map)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);
}

// ─── Action: live-count ──────────────────────────────────────────────────────

async function handleLiveCount(databases) {
  const since = ago(LIVE_WINDOW_MS);
  const docs = await fetchAll(databases, COLLECTION_VISITOR_EVENTS, [
    sdk.Query.greaterThanEqual('$createdAt', since),
  ]);

  const anonIds = new Set(docs.map(d => d.anon_id || d.session_id).filter(Boolean));
  const topCountries = countByCountry(docs).slice(0, 5);

  // Fetch all-time total for diagnostic purposes (VisitorsPanel empty state)
  let totalEvents = 0;
  try {
    const totPage = await databases.listDocuments(DB_ID, COLLECTION_VISITOR_EVENTS, [sdk.Query.limit(1)]);
    totalEvents = totPage.total ?? 0;
  } catch { /* ignore */ }

  return { liveCount: anonIds.size, topCountries, totalEvents };
}

// ─── Action: kpis ───────────────────────────────────────────────────────────

async function handleKpis(databases, range) {
  const sincePrimary = rangeStart(range);
  const sinceToday   = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

  const [primaryDocs, todayDocs] = await Promise.all([
    fetchAll(databases, COLLECTION_VISITOR_EVENTS, [
      sdk.Query.greaterThanEqual('$createdAt', sincePrimary),
    ]),
    fetchAll(databases, COLLECTION_VISITOR_EVENTS, [
      sdk.Query.greaterThanEqual('$createdAt', sinceToday),
    ]),
  ]);

  // Today KPIs
  const todayPageViews = todayDocs.filter(d => d.event_type === 'page_view');
  const todayAnonIds = new Set(todayDocs.map(d => d.anon_id).filter(Boolean));

  // Range KPIs
  const pageViews = primaryDocs.filter(d => d.event_type === 'page_view');
  const anonIds   = new Set(primaryDocs.map(d => d.anon_id).filter(Boolean));

  // New vs returning: anon_id seen before sinceToday that also appear in range
  const anonIdList = [...anonIds];
  const newVisitors = anonIdList.length; // can't reliably distinguish without a separate lookup

  // Device breakdown
  const deviceCounts = {};
  for (const d of primaryDocs) {
    const dev = normalizeDevice(d.device_type);
    deviceCounts[dev] = (deviceCounts[dev] || 0) + 1;
  }
  const deviceBreakdown = Object.entries(deviceCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const totalPrimary = primaryDocs.length;
  const mobileCount  = deviceCounts['mobile'] || 0;
  const desktopCount = deviceCounts['desktop'] || 0;
  const mobilePct  = totalPrimary > 0 ? Math.round((mobileCount  / totalPrimary) * 100) : 0;
  const desktopPct = totalPrimary > 0 ? Math.round((desktopCount / totalPrimary) * 100) : 0;

  // Browser breakdown
  const browserBreakdown = countBy(primaryDocs, 'browser').slice(0, 8);

  // Top country
  const countryCounts = countByCountry(primaryDocs);
  const topCountryEntry = countryCounts[0] ?? null;

  return {
    totalVisitsToday:    todayPageViews.length,
    uniqueVisitorsToday: todayAnonIds.size,
    totalVisits:    pageViews.length,
    uniqueVisitors: anonIds.size,
    newVisitors,
    returningVisitors: 0, // would require a cross-range check — returned as 0 to avoid false data
    topCountry:      topCountryEntry ? topCountryEntry.country : null,
    topCountryCount: topCountryEntry ? topCountryEntry.count   : 0,
    mobilePct,
    desktopPct,
    deviceBreakdown,
    browserBreakdown,
  };
}

// ─── Action: country-dist ────────────────────────────────────────────────────

async function handleCountryDist(databases, range) {
  const since = rangeStart(range);
  const docs = await fetchAll(databases, COLLECTION_VISITOR_EVENTS, [
    sdk.Query.greaterThanEqual('$createdAt', since),
  ]);
  return countByCountry(docs);
}

// ─── Action: top-pages ──────────────────────────────────────────────────────

async function handleTopPages(databases, range) {
  const since = rangeStart(range);
  const docs = await fetchAll(databases, COLLECTION_VISITOR_EVENTS, [
    sdk.Query.greaterThanEqual('$createdAt', since),
    sdk.Query.equal('event_type', 'page_view'),
  ]);

  const pageCounts = {};
  const pageSessions = {};
  for (const d of docs) {
    const page = d.page || '/';
    pageCounts[page] = (pageCounts[page] || 0) + 1;
    if (d.session_id) {
      if (!pageSessions[page]) pageSessions[page] = new Set();
      pageSessions[page].add(d.session_id);
    }
  }

  return Object.entries(pageCounts)
    .map(([name, count]) => ({ name, count, sessions: pageSessions[name]?.size ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);
}

// ─── Action: click-targets ───────────────────────────────────────────────────

async function handleClickTargets(databases, range, page) {
  const since = rangeStart(range);
  const queries = [
    sdk.Query.greaterThanEqual('$createdAt', since),
    sdk.Query.equal('event_type', 'click'),
  ];
  if (page) queries.push(sdk.Query.equal('page', page));

  const docs = await fetchAll(databases, COLLECTION_VISITOR_EVENTS, queries);

  const targetCounts = {};
  for (const d of docs) {
    const t = d.target || 'unknown';
    targetCounts[t] = (targetCounts[t] || 0) + 1;
  }

  return Object.entries(targetCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);
}

// ─── Action: sections ────────────────────────────────────────────────────────

async function handleSections(databases, range) {
  const since = rangeStart(range);
  const docs = await fetchAll(databases, COLLECTION_VISITOR_EVENTS, [
    sdk.Query.greaterThanEqual('$createdAt', since),
    sdk.Query.equal('event_type', 'section_view'),
  ]);

  const sectionCounts = {};
  const sectionVisitors = {};
  for (const d of docs) {
    const sec = d.section || 'unknown';
    sectionCounts[sec] = (sectionCounts[sec] || 0) + 1;
    if (d.anon_id) {
      if (!sectionVisitors[sec]) sectionVisitors[sec] = new Set();
      sectionVisitors[sec].add(d.anon_id);
    }
  }

  return Object.entries(sectionCounts)
    .map(([name, count]) => ({
      name,
      count,
      uniqueVisitors: sectionVisitors[name]?.size ?? 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);
}

// ─── Action: sessions ────────────────────────────────────────────────────────

async function handleSessions(databases, range, pageNum) {
  const since = rangeStart(range);
  const docs = await fetchAll(databases, COLLECTION_VISITOR_EVENTS, [
    sdk.Query.greaterThanEqual('$createdAt', since),
  ]);

  // Group events by session_id (fall back to anon_id if no session_id)
  const sessionMap = {};
  for (const d of docs) {
    const sid = d.session_id || d.anon_id || 'unknown';
    if (!sessionMap[sid]) {
      sessionMap[sid] = {
        session_id:    d.session_id || sid,
        anon_id:       d.anon_id   || sid,
        user_id:       d.user_id   || null,
        country:       d.country   || null,
        device_type:   normalizeDevice(d.device_type),
        browser:       d.browser   || null,
        firstSeen:     d.$createdAt,
        lastSeen:      d.$createdAt,
        pageCount:     0,
        eventCount:    0,
        durationSeconds: 0,
        events: [],
      };
    }
    const sess = sessionMap[sid];
    sess.eventCount++;
    if (d.event_type === 'page_view') sess.pageCount++;
    if (d.$createdAt < sess.firstSeen) sess.firstSeen = d.$createdAt;
    if (d.$createdAt > sess.lastSeen)  sess.lastSeen  = d.$createdAt;
    sess.events.push(d.$createdAt);
  }

  // Compute duration
  const allSessions = Object.values(sessionMap).map(s => {
    const ms = new Date(s.lastSeen).getTime() - new Date(s.firstSeen).getTime();
    const { events: _events, ...rest } = s;
    return { ...rest, durationSeconds: Math.round(ms / 1000) };
  });

  // Sort by lastSeen desc
  allSessions.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));

  const total  = allSessions.length;
  const offset = (pageNum || 0) * SESSION_PAGE_SIZE;
  const page   = allSessions.slice(offset, offset + SESSION_PAGE_SIZE);

  return { sessions: page, total, page: pageNum || 0 };
}

// ─── Action: cohort ──────────────────────────────────────────────────────────

async function handleCohort(databases, range) {
  const since = rangeStart(range);
  const docs = await fetchAll(databases, COLLECTION_VISITOR_EVENTS, [
    sdk.Query.greaterThanEqual('$createdAt', since),
  ]);

  // Group by week label (YYYY-Www) and count unique anon_ids
  const weekMap = {};
  for (const d of docs) {
    if (!d.anon_id) continue;
    const date = new Date(d.$createdAt);
    const week = getISOWeekLabel(date);
    if (!weekMap[week]) weekMap[week] = new Set();
    weekMap[week].add(d.anon_id);
  }

  return Object.entries(weekMap)
    .map(([name, set]) => ({ name, count: set.size }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getISOWeekLabel(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// ─── Action: journey ─────────────────────────────────────────────────────────

async function handleJourney(databases, sessionId, anonId) {
  const queries = [];
  if (sessionId) {
    queries.push(sdk.Query.equal('session_id', sessionId));
  } else if (anonId) {
    queries.push(sdk.Query.equal('anon_id', anonId));
  } else {
    return [];
  }
  queries.push(sdk.Query.orderAsc('$createdAt'));

  const docs = await fetchAll(databases, COLLECTION_VISITOR_EVENTS, queries);

  return docs.map(d => ({
    id:          d.$id,
    session_id:  d.session_id  || null,
    anon_id:     d.anon_id     || null,
    user_id:     d.user_id     || null,
    event_type:  d.event_type  || 'unknown',
    page:        d.page        || null,
    target:      d.target      || null,
    section:     d.section     || null,
    country:     d.country     || null,
    device_type: normalizeDevice(d.device_type),
    browser:     d.browser     || null,
    created_at:  d.$createdAt,
  }));
}

// ─── Main entry point ────────────────────────────────────────────────────────

module.exports = async ({ req, res, log, error }) => {
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
  const range  = body.range || '7d';
  log(`admin-visitor-analytics: action=${action} range=${range}`);

  const { databases } = getClients();

  try {
    switch (action) {
      case 'live-count': {
        const data = await handleLiveCount(databases);
        return res.json({ success: true, ...data });
      }

      case 'kpis': {
        const data = await handleKpis(databases, range);
        return res.json({ success: true, data });
      }

      case 'country-dist': {
        const data = await handleCountryDist(databases, range);
        return res.json({ success: true, data });
      }

      case 'top-pages': {
        const data = await handleTopPages(databases, range);
        return res.json({ success: true, data });
      }

      case 'click-targets': {
        const data = await handleClickTargets(databases, range, body.page || null);
        return res.json({ success: true, data });
      }

      case 'sections': {
        const data = await handleSections(databases, range);
        return res.json({ success: true, data });
      }

      case 'sessions': {
        const data = await handleSessions(databases, range, body.page_num || 0);
        return res.json({ success: true, data });
      }

      case 'cohort': {
        const data = await handleCohort(databases, range);
        return res.json({ success: true, data });
      }

      case 'journey': {
        const data = await handleJourney(databases, body.session_id || null, body.anon_id || null);
        return res.json({ success: true, data });
      }

      default:
        error(`admin-visitor-analytics: unknown action=${action}`);
        return res.json({ success: false, error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    error(`admin-visitor-analytics: unhandled error action=${action}: ${e}`);
    return res.json({ success: false, error: String(e) }, 500);
  }
};
