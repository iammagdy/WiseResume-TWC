/**
 * admin-visitor-analytics — Appwrite Function
 *
 * Serves VisitorsPanel (dashboard, kpis, country-dist, top-pages, click-targets,
 * sections, sessions, cohort, journey, health, export, hourly, referrers,
 * returning, funnel, top-events) and MissionControlPanel (live-count).
 *
 * Auth: Authorization: Bearer <signed DevKit token>
 * Runtime: Node.js 22
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
// Hard cap per analytics request — prevents function timeout on large datasets
const MAX_TOTAL_DOCS = 5000;
// CSV export row cap — prevents function response size issues
const EXPORT_ROW_CAP = 5000;

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

function timingSafeStringEqual(a, b) {
  const nonce = crypto.randomBytes(32);
  const h1 = crypto.createHmac('sha256', nonce).update(String(a)).digest();
  const h2 = crypto.createHmac('sha256', nonce).update(String(b)).digest();
  return crypto.timingSafeEqual(h1, h2);
}

function checkAuth(req, body) {
  const token = bearerToken(req, body);
  if (!token) return false;
  // Raw DEVKIT_PASSWORD bearer fallback removed (security): only short-lived
  // signed DevKit tokens (minted by admin-devkit-data after JWT + admin-label
  // verification) are accepted.
  return verifySignedToken(token);
}

// ─── SDK client ─────────────────────────────────────────────────────────────

function getClients() {
  const client = new sdk.Client();
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY || '');
  return { databases: new sdk.Databases(client) };
}

// ─── runSafe wrapper ──────────────────────────────────────────────────────────

/**
 * Wraps an async aggregation so that one failure returns a default value
 * and collects an error message, rather than breaking the entire dashboard.
 * Mirrors the `runQ` pattern from the personal portfolio analytics system.
 */
function runSafe(name, fn, errors) {
  return fn().catch((e) => {
    errors[name] = String((e && e.message) || e);
    return null;
  });
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

    if (allDocs.length >= MAX_TOTAL_DOCS) break;
    if (docs.length < limit) break;
    cursor = docs[docs.length - 1].$id;
  }

  return allDocs;
}

function todayStartIso() {
  return new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
}

async function fetchTotalEventCount(databases) {
  try {
    const totPage = await databases.listDocuments(DB_ID, COLLECTION_VISITOR_EVENTS, [sdk.Query.limit(1)]);
    return totPage.total ?? 0;
  } catch {
    return 0;
  }
}

function computeKpis(primaryDocs, todayDocs) {
  const todayPageViews = todayDocs.filter(d => d.event_type === 'page_view');
  const todayAnonIds = new Set(todayDocs.map(d => d.anon_id).filter(Boolean));

  const pageViews = primaryDocs.filter(d => d.event_type === 'page_view');
  const anonIds = new Set(primaryDocs.map(d => d.anon_id).filter(Boolean));
  const anonIdList = [...anonIds];

  const deviceCounts = {};
  for (const d of primaryDocs) {
    const dev = normalizeDevice(d.device_type);
    deviceCounts[dev] = (deviceCounts[dev] || 0) + 1;
  }
  const deviceBreakdown = Object.entries(deviceCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const totalPrimary = primaryDocs.length;
  const mobileCount = deviceCounts.mobile || 0;
  const desktopCount = deviceCounts.desktop || 0;
  const mobilePct = totalPrimary > 0 ? Math.round((mobileCount / totalPrimary) * 100) : 0;
  const desktopPct = totalPrimary > 0 ? Math.round((desktopCount / totalPrimary) * 100) : 0;

  const browserBreakdown = countBy(primaryDocs, 'browser').slice(0, 8);
  const countryCounts = countByCountry(primaryDocs);
  const topCountryEntry = countryCounts[0] ?? null;

  return {
    totalVisitsToday: todayPageViews.length,
    uniqueVisitorsToday: todayAnonIds.size,
    totalVisits: pageViews.length,
    uniqueVisitors: anonIds.size,
    newVisitors: anonIdList.length,
    returningVisitors: 0,
    topCountry: topCountryEntry ? topCountryEntry.country : null,
    topCountryCount: topCountryEntry ? topCountryEntry.count : 0,
    mobilePct,
    desktopPct,
    deviceBreakdown,
    browserBreakdown,
  };
}

function computeTopPages(docs) {
  const pageCounts = {};
  const pageSessions = {};
  for (const d of docs) {
    if (d.event_type !== 'page_view') continue;
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

function computeClickTargets(docs, page) {
  const targetCounts = {};
  for (const d of docs) {
    if (d.event_type !== 'click') continue;
    if (page && d.page !== page) continue;
    const t = d.target || 'unknown';
    targetCounts[t] = (targetCounts[t] || 0) + 1;
  }
  return Object.entries(targetCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);
}

function computeSections(docs) {
  const sectionCounts = {};
  const sectionVisitors = {};
  for (const d of docs) {
    if (d.event_type !== 'section_view') continue;
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

function computeSessions(docs, pageNum) {
  const sessionMap = {};
  for (const d of docs) {
    const sid = d.session_id || d.anon_id || 'unknown';
    if (!sessionMap[sid]) {
      sessionMap[sid] = {
        session_id: d.session_id || sid,
        anon_id: d.anon_id || sid,
        user_id: d.user_id || null,
        country: d.country || null,
        device_type: normalizeDevice(d.device_type),
        browser: d.browser || null,
        firstSeen: d.$createdAt,
        lastSeen: d.$createdAt,
        pageCount: 0,
        eventCount: 0,
        durationSeconds: 0,
      };
    }
    const sess = sessionMap[sid];
    sess.eventCount++;
    if (d.event_type === 'page_view') sess.pageCount++;
    if (d.$createdAt < sess.firstSeen) sess.firstSeen = d.$createdAt;
    if (d.$createdAt > sess.lastSeen) sess.lastSeen = d.$createdAt;
  }

  const allSessions = Object.values(sessionMap).map(s => {
    const ms = new Date(s.lastSeen).getTime() - new Date(s.firstSeen).getTime();
    return { ...s, durationSeconds: Math.round(ms / 1000) };
  });
  allSessions.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));

  const total = allSessions.length;
  const offset = (pageNum || 0) * SESSION_PAGE_SIZE;
  const page = allSessions.slice(offset, offset + SESSION_PAGE_SIZE);
  return { sessions: page, total, page: pageNum || 0 };
}

function computeCohort(docs) {
  const weekMap = {};
  for (const d of docs) {
    if (!d.anon_id) continue;
    const week = getISOWeekLabel(new Date(d.$createdAt));
    if (!weekMap[week]) weekMap[week] = new Set();
    weekMap[week].add(d.anon_id);
  }
  return Object.entries(weekMap)
    .map(([name, set]) => ({ name, count: set.size }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ─── New computation helpers ─────────────────────────────────────────────────

function computeDaily(docs) {
  const dayMap = {};
  for (const d of docs) {
    if (d.event_type !== 'page_view') continue;
    const date = d.$createdAt.slice(0, 10);
    if (!dayMap[date]) dayMap[date] = { pageviews: 0, uniqueVisitors: new Set() };
    dayMap[date].pageviews++;
    if (d.anon_id) dayMap[date].uniqueVisitors.add(d.anon_id);
  }
  return Object.entries(dayMap)
    .map(([date, v]) => ({ date, pageviews: v.pageviews, uniqueVisitors: v.uniqueVisitors.size }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function computeHourly(docs) {
  const hours = new Array(24).fill(0);
  for (const d of docs) {
    if (d.event_type !== 'page_view') continue;
    const h = new Date(d.$createdAt).getHours();
    hours[h]++;
  }
  return hours;
}

function computeHeatmap(docs) {
  const matrix = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const d of docs) {
    if (d.event_type !== 'page_view') continue;
    const dt = new Date(d.$createdAt);
    const dow = dt.getDay();
    const hod = dt.getHours();
    matrix[dow][hod]++;
  }
  return matrix;
}

function computeReferrers(docs) {
  const map = {};
  for (const d of docs) {
    if (d.event_type !== 'page_view') continue;
    const ref = d.referrer || '';
    if (!ref || ref === 'null' || ref === 'undefined') continue;
    map[ref] = (map[ref] || 0) + 1;
  }
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

function computeReturning(docs) {
  const anonSessions = {};
  for (const d of docs) {
    if (!d.anon_id) continue;
    const sid = d.session_id || d.anon_id;
    if (!anonSessions[d.anon_id]) anonSessions[d.anon_id] = new Set();
    anonSessions[d.anon_id].add(sid);
  }
  let newCount = 0;
  let returningCount = 0;
  for (const sessions of Object.values(anonSessions)) {
    if (sessions.size > 1) returningCount++;
    else newCount++;
  }
  return { newCount, returningCount };
}

function computeFunnel(docs) {
  const sessionEvents = {};
  for (const d of docs) {
    const sid = d.session_id || d.anon_id;
    if (!sid) continue;
    if (!sessionEvents[sid]) sessionEvents[sid] = new Set();
    sessionEvents[sid].add(d.event_type);
  }
  let pageview = 0, sectionView = 0, click = 0, featureUse = 0;
  for (const types of Object.values(sessionEvents)) {
    if (types.has('page_view')) pageview++;
    if (types.has('section_view')) sectionView++;
    if (types.has('click')) click++;
    if (types.has('feature_use')) featureUse++;
  }
  return { pageview, sectionView, click, featureUse };
}

function computeTopEvents(docs) {
  const map = {};
  for (const d of docs) {
    if (d.event_type === 'page_view') continue;
    const label = d.target || d.section || d.event_type;
    const key = `${d.event_type}:${label}`;
    map[key] = (map[key] || 0) + 1;
  }
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 25);
}

function computeOsBreakdown(docs) {
  const map = {};
  for (const d of docs) {
    const os = d.os || 'Unknown';
    map[os] = (map[os] || 0) + 1;
  }
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function computePerfMetrics(docs) {
  const perfDocs = docs.filter(d => d.event_type === 'perf');
  if (perfDocs.length === 0) {
    return { avgLoadMs: null, avgFcpMs: null, p75LoadMs: null, fast: 0, ok: 0, slow: 0, count: 0 };
  }
  const loadTimes = [];
  const fcpTimes = [];
  for (const d of perfDocs) {
    try {
      const raw = d.metadata || d.label || '{}';
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed.load_ms != null) loadTimes.push(Number(parsed.load_ms));
      if (parsed.fcp_ms != null) fcpTimes.push(Number(parsed.fcp_ms));
    } catch { /* ignore parse errors */ }
  }
  loadTimes.sort((a, b) => a - b);
  fcpTimes.sort((a, b) => a - b);
  const avg = (arr) => arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null;
  const p75 = (arr) => arr.length > 0 ? arr[Math.floor(arr.length * 0.75)] : null;
  let fast = 0, ok = 0, slow = 0;
  for (const lt of loadTimes) {
    if (lt < 2000) fast++;
    else if (lt < 5000) ok++;
    else slow++;
  }
  return {
    avgLoadMs: avg(loadTimes),
    avgFcpMs: avg(fcpTimes),
    p75LoadMs: p75(loadTimes),
    fast, ok, slow,
    count: loadTimes.length,
  };
}

function computeTrends(docs, range) {
  const rangeMs = { '7d': 7, '30d': 30, '90d': 90 };
  const days = rangeMs[range];
  if (!days) return { visits: { current: 0, previous: 0, pct: null }, uniques: { current: 0, previous: 0, pct: null } };
  const now = Date.now();
  const midpoint = now - (days / 2) * 86400000;
  let currentVisits = 0, previousVisits = 0;
  const currentAnons = new Set();
  const previousAnons = new Set();
  for (const d of docs) {
    if (d.event_type !== 'page_view') continue;
    const ts = new Date(d.$createdAt).getTime();
    if (ts >= midpoint) {
      currentVisits++;
      if (d.anon_id) currentAnons.add(d.anon_id);
    } else {
      previousVisits++;
      if (d.anon_id) previousAnons.add(d.anon_id);
    }
  }
  const pct = (curr, prev) => {
    if (prev === 0) return curr > 0 ? 100 : null;
    return Math.round(((curr - prev) / prev) * 100);
  };
  return {
    visits: { current: currentVisits, previous: previousVisits, pct: pct(currentVisits, previousVisits) },
    uniques: { current: currentAnons.size, previous: previousAnons.size, pct: pct(currentAnons.size, previousAnons.size) },
  };
}

function computeWindows(docs) {
  const now = Date.now();
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const h24 = now - 24 * 3600000;
  const d7 = now - 7 * 86400000;
  const d30 = now - 30 * 86400000;
  const d90 = now - 90 * 86400000;
  const win = (sinceMs) => {
    let visits = 0;
    const anons = new Set();
    const sessions = new Set();
    for (const d of docs) {
      if (d.event_type !== 'page_view') continue;
      const ts = new Date(d.$createdAt).getTime();
      if (ts < sinceMs) continue;
      visits++;
      if (d.anon_id) anons.add(d.anon_id);
      if (d.session_id) sessions.add(d.session_id);
    }
    return { visits, uniques: anons.size, sessions: sessions.size };
  };
  return {
    today: win(todayStart),
    '24h': win(h24),
    '7d': win(d7),
    '30d': win(d30),
    '90d': win(d90),
  };
}

function computeTotals(docs) {
  const pageviews = docs.filter(d => d.event_type === 'page_view').length;
  const clicks = docs.filter(d => d.event_type === 'click').length;
  const sectionViews = docs.filter(d => d.event_type === 'section_view').length;
  const featureUses = docs.filter(d => d.event_type === 'feature_use').length;
  const uniqueVisitors = new Set(docs.map(d => d.anon_id).filter(Boolean)).size;
  const sessions = new Set(docs.map(d => d.session_id).filter(Boolean)).size;
  return { pageviews, uniqueVisitors, sessions, clicks, sectionViews, featureUses };
}

function computeMeta(docs, totalEvents, range, truncated) {
  let latestEventAt = null;
  let oldestEventAt = null;
  for (const d of docs) {
    const ts = d.$createdAt;
    if (!latestEventAt || ts > latestEventAt) latestEventAt = ts;
    if (!oldestEventAt || ts < oldestEventAt) oldestEventAt = ts;
  }
  return { totalEvents, eventsInRange: docs.length, latestEventAt, oldestEventAt, range, truncated };
}

async function loadRangeDocs(databases, range) {
  const since = rangeStart(range);
  const docs = await fetchAll(databases, COLLECTION_VISITOR_EVENTS, [
    sdk.Query.greaterThanEqual('$createdAt', since),
  ]);
  const sinceToday = todayStartIso();
  const todayDocs = range === 'today'
    ? docs
    : docs.filter(d => d.$createdAt >= sinceToday);
  return { docs, todayDocs, truncated: docs.length >= MAX_TOTAL_DOCS };
}

/** ISO string for `now - ms` */
function ago(ms) {
  return new Date(Date.now() - ms).toISOString();
}

/** ISO boundary for range string */
function rangeStart(range) {
  const map = {
    today: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
    '24h': ago(24 * 3600000),
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
    const c = item.country || 'Unknown';
    map[c] = (map[c] || 0) + 1;
  }
  return Object.entries(map)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);
}

// ─── Action: live-count ──────────────────────────────────────────────────────

async function handleLiveCount(databases) {
  const since = ago(LIVE_WINDOW_MS);

  // Single bounded query — no need to paginate for a live-count.
  // 500 events in a 5-minute window is more than enough for any real-time
  // counter; using fetchAll here was spending most of the function budget
  // iterating pages when the collection is large.
  let docs = [];
  try {
    const page = await databases.listDocuments(DB_ID, COLLECTION_VISITOR_EVENTS, [
      sdk.Query.greaterThanEqual('$createdAt', since),
      sdk.Query.limit(500),
    ]);
    docs = page.documents || [];
  } catch { /* ignore — collection may not exist yet */ }

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
  const { docs, todayDocs } = await loadRangeDocs(databases, range);
  return computeKpis(docs, todayDocs);
}

// ─── Action: country-dist ────────────────────────────────────────────────────

async function handleCountryDist(databases, range) {
  const { docs } = await loadRangeDocs(databases, range);
  return countByCountry(docs);
}

// ─── Action: top-pages ──────────────────────────────────────────────────────

async function handleTopPages(databases, range) {
  const { docs } = await loadRangeDocs(databases, range);
  return computeTopPages(docs);
}

// ─── Action: click-targets ───────────────────────────────────────────────────

async function handleClickTargets(databases, range, page) {
  const { docs } = await loadRangeDocs(databases, range);
  return computeClickTargets(docs, page);
}

// ─── Action: sections ────────────────────────────────────────────────────────

async function handleSections(databases, range) {
  const { docs } = await loadRangeDocs(databases, range);
  return computeSections(docs);
}

// ─── Action: sessions ────────────────────────────────────────────────────────

async function handleSessions(databases, range, pageNum) {
  const { docs } = await loadRangeDocs(databases, range);
  return computeSessions(docs, pageNum);
}

// ─── Action: cohort ──────────────────────────────────────────────────────────

async function handleCohort(databases, range) {
  const { docs } = await loadRangeDocs(databases, range);
  return computeCohort(docs);
}

// ─── Action: dashboard — single fetch, all panels ───────────────────────────

async function handleDashboard(databases, range, pageNum) {
  const { docs, todayDocs, truncated } = await loadRangeDocs(databases, range);
  const totalEvents = await fetchTotalEventCount(databases);
  const errors = {};

  // Backward-compat kpis (always compute — it's cheap)
  const kpis = computeKpis(docs, todayDocs);

  // Live data (bounded query, separate from range docs)
  const liveData = await runSafe('live', () => handleLiveCount(databases), errors);

  // All metrics wrapped in runSafe — one failure doesn't break the dashboard
  const [countryDist, daily, hourly, heatmap, referrers, returning, funnel, topEvents, oses, perfMetrics, trends, windows, totals] = await Promise.all([
    runSafe('countries', () => Promise.resolve(countByCountry(docs)), errors),
    runSafe('daily', () => Promise.resolve(computeDaily(docs)), errors),
    runSafe('hourly', () => Promise.resolve(computeHourly(docs)), errors),
    runSafe('heatmap', () => Promise.resolve(computeHeatmap(docs)), errors),
    runSafe('referrers', () => Promise.resolve(computeReferrers(docs)), errors),
    runSafe('returning', () => Promise.resolve(computeReturning(docs)), errors),
    runSafe('funnel', () => Promise.resolve(computeFunnel(docs)), errors),
    runSafe('topEvents', () => Promise.resolve(computeTopEvents(docs)), errors),
    runSafe('oses', () => Promise.resolve(computeOsBreakdown(docs)), errors),
    runSafe('perfMetrics', () => Promise.resolve(computePerfMetrics(docs)), errors),
    runSafe('trends', () => Promise.resolve(computeTrends(docs, range)), errors),
    runSafe('windows', () => Promise.resolve(computeWindows(docs)), errors),
    runSafe('totals', () => Promise.resolve(computeTotals(docs)), errors),
  ]);

  const metaV2 = computeMeta(docs, totalEvents, range, truncated);

  return {
    // Backward-compat fields
    kpis,
    countryDist: countryDist || [],
    topPages: computeTopPages(docs),
    clickTargets: computeClickTargets(docs, null),
    sections: computeSections(docs),
    sessions: computeSessions(docs, pageNum || 0),
    cohort: computeCohort(docs),
    meta: { eventsInRange: docs.length, totalEvents, truncated },
    // New enriched payload
    metaV2,
    live: liveData || { liveCount: 0, topCountries: [], totalEvents },
    totals: totals || { pageviews: 0, uniqueVisitors: 0, sessions: 0, clicks: 0, sectionViews: 0, featureUses: 0 },
    windows: windows || {},
    trends: trends || {},
    daily: daily || [],
    countries: (countryDist || []).map(c => ({ ...c, uniqueVisitors: 0 })),
    devices: kpis.deviceBreakdown || [],
    browsers: kpis.browserBreakdown || [],
    oses: oses || [],
    topEvents: topEvents || [],
    referrers: referrers || [],
    hourly: hourly || new Array(24).fill(0),
    heatmap: heatmap || Array.from({ length: 7 }, () => new Array(24).fill(0)),
    returning: returning || { newCount: 0, returningCount: 0 },
    funnel: funnel || { pageview: 0, sectionView: 0, click: 0, featureUse: 0 },
    perfMetrics: perfMetrics || { avgLoadMs: null, avgFcpMs: null, p75LoadMs: null, fast: 0, ok: 0, slow: 0, count: 0 },
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };
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
    // PORT-P3-10: do not surface the internal Appwrite user_id in analytics
    // output — it correlates an anonymous browsing session to an account.
    event_type:  d.event_type  || 'unknown',
    page:        d.page        || null,
    target:      d.target      || null,
    section:     d.section     || null,
    country:     d.country     || null,
    device_type: normalizeDevice(d.device_type),
    browser:     d.browser     || null,
    os:          d.os          || null,
    created_at:  d.$createdAt,
  }));
}

// ─── Action: health ──────────────────────────────────────────────────────────

async function handleHealth(databases) {
  const envFlags = {
    APPWRITE_API_KEY: !!process.env.APPWRITE_API_KEY,
    APPWRITE_ENDPOINT: !!process.env.APPWRITE_ENDPOINT,
    APPWRITE_PROJECT_ID: !!process.env.APPWRITE_PROJECT_ID,
    DEVKIT_PASSWORD: !!process.env.DEVKIT_PASSWORD,
  };

  let collectionExists = false;
  let docCount = 0;
  let latestEventAt = null;
  let attributes = [];

  try {
    const page = await databases.listDocuments(DB_ID, COLLECTION_VISITOR_EVENTS, [
      sdk.Query.orderDesc('$createdAt'),
      sdk.Query.limit(1),
    ]);
    docCount = page.total ?? 0;
    collectionExists = true;
    if (page.documents && page.documents.length > 0) {
      latestEventAt = page.documents[0].$createdAt;
    }
  } catch {
    collectionExists = false;
  }

  const expectedAttrs = [
    'user_id', 'session_id', 'anon_id', 'event_type', 'page', 'target',
    'section', 'country', 'device_type', 'browser', 'metadata',
    'referrer', 'os', 'duration_ms', 'label', 'utm_source', 'utm_medium',
    'utm_campaign', 'is_returning',
  ];
  try {
    const attrList = await databases.listAttributes(DB_ID, COLLECTION_VISITOR_EVENTS);
    attributes = (attrList.attributes || []).map(a => a.key);
  } catch { /* ignore */ }
  const missingSchemaFields = expectedAttrs.filter(a => !attributes.includes(a));

  return {
    envFlags,
    collectionExists,
    docCount,
    latestEventAt,
    missingSchemaFields,
    attributesFound: attributes,
  };
}

// ─── Action: export ──────────────────────────────────────────────────────────

async function handleExport(databases, range) {
  const { docs } = await loadRangeDocs(databases, range);
  const capped = docs.slice(0, EXPORT_ROW_CAP);
  const headers = [
    'created_at', 'event_type', 'session_id', 'anon_id', 'page',
    'target', 'section', 'country', 'device_type', 'browser', 'os',
    'referrer', 'duration_ms', 'label', 'utm_source', 'utm_medium',
    'utm_campaign', 'is_returning',
  ];
  const escapeCsv = (val) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const rows = capped.map(d => [
    d.$createdAt, d.event_type, d.session_id, d.anon_id, d.page,
    d.target, d.section, d.country, normalizeDevice(d.device_type),
    d.browser, d.os, d.referrer, d.duration_ms, d.label,
    d.utm_source, d.utm_medium, d.utm_campaign, d.is_returning,
  ].map(escapeCsv).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  return {
    csv,
    rowsExported: capped.length,
    totalInRange: docs.length,
    truncated: docs.length > EXPORT_ROW_CAP,
    cap: EXPORT_ROW_CAP,
  };
}

// ─── Action: hourly ──────────────────────────────────────────────────────────

async function handleHourly(databases, range) {
  const { docs } = await loadRangeDocs(databases, range);
  return computeHourly(docs);
}

// ─── Action: referrers ───────────────────────────────────────────────────────

async function handleReferrers(databases, range) {
  const { docs } = await loadRangeDocs(databases, range);
  return computeReferrers(docs);
}

// ─── Action: returning ───────────────────────────────────────────────────────

async function handleReturning(databases, range) {
  const { docs } = await loadRangeDocs(databases, range);
  return computeReturning(docs);
}

// ─── Action: funnel ──────────────────────────────────────────────────────────

async function handleFunnel(databases, range) {
  const { docs } = await loadRangeDocs(databases, range);
  return computeFunnel(docs);
}

// ─── Action: top-events ──────────────────────────────────────────────────────

async function handleTopEvents(databases, range) {
  const { docs } = await loadRangeDocs(databases, range);
  return computeTopEvents(docs);
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

      case 'dashboard': {
        const data = await handleDashboard(databases, range, body.page_num || 0);
        return res.json({ success: true, data });
      }

      case 'journey': {
        const data = await handleJourney(databases, body.session_id || null, body.anon_id || null);
        return res.json({ success: true, data });
      }

      case 'health': {
        const data = await handleHealth(databases);
        return res.json({ success: true, data });
      }

      case 'export': {
        const data = await handleExport(databases, range);
        return res.json({ success: true, data });
      }

      case 'hourly': {
        const data = await handleHourly(databases, range);
        return res.json({ success: true, data });
      }

      case 'referrers': {
        const data = await handleReferrers(databases, range);
        return res.json({ success: true, data });
      }

      case 'returning': {
        const data = await handleReturning(databases, range);
        return res.json({ success: true, data });
      }

      case 'funnel': {
        const data = await handleFunnel(databases, range);
        return res.json({ success: true, data });
      }

      case 'top-events': {
        const data = await handleTopEvents(databases, range);
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
