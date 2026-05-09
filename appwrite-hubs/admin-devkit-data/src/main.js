/**
 * admin-devkit-data — Appwrite Function
 *
 * Serves four DevKit admin panels:
 *   • Mission Control  (action: 'mission-control')
 *   • Analytics        (action: 'analytics',     range: '7d'|'30d'|'90d'|'today'|'all')
 *   • Observability    (action: 'observability', obs_action: 'get_telemetry'|'get_error_stream'|'mark_reviewed')
 *   • Live Activity    (action: 'live-activity', resource: 'usage_events'|'error_log'|'contact_requests')
 *   • Edge-fn drift    (action: 'edge-fn-drift')
 *
 * Auth: every request must carry  Authorization: Bearer <DEVKIT_PASSWORD>
 *
 * Environment variables (set in Appwrite Console → Functions → admin-devkit-data → Variables):
 *   DEVKIT_PASSWORD         — shared admin password validated on every request
 *   APPWRITE_FUNCTION_API_ENDPOINT  — injected automatically by Appwrite runtime
 *   APPWRITE_FUNCTION_PROJECT_ID    — injected automatically by Appwrite runtime
 *   APPWRITE_API_KEY        — server-side API key with databases.read + databases.write scope
 *   GITHUB_TOKEN            — (optional) PAT for GitHub API calls in mission-control
 *   PRODUCTION_URL          — production site URL to ping (default: https://thewise.cloud)
 *   OPENROUTER_KEY_1        — (optional) used for provider ping
 *   GROQ_KEY_1              — (optional) used for provider ping
 */

const sdk = require('node-appwrite');
const axios = require('axios');

const DB_ID = 'main';

// ─── Appwrite client factory ──────────────────────────────────────────────────

function getClients() {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  return {
    databases: new sdk.Databases(client),
    functions: new sdk.Functions(client),
    users: new sdk.Users(client),
  };
}

// ─── Auth middleware ──────────────────────────────────────────────────────────

function checkAuth(req) {
  const password = process.env.DEVKIT_PASSWORD;
  if (!password) return false;
  const header = req.headers['authorization'] || req.headers['Authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  return token === password;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoNow() {
  return new Date().toISOString();
}

/** Safe list — returns [] instead of throwing on collection-not-found */
async function safeList(databases, collectionId, queries = []) {
  try {
    const result = await databases.listDocuments(DB_ID, collectionId, queries);
    return result.documents;
  } catch {
    return [];
  }
}

/** Safe count — returns 0 instead of throwing */
async function safeCount(databases, collectionId, queries = []) {
  try {
    const result = await databases.listDocuments(DB_ID, collectionId, [
      ...queries,
      sdk.Query.limit(1),
    ]);
    return result.total;
  } catch {
    return 0;
  }
}

// ─── MISSION CONTROL ─────────────────────────────────────────────────────────

async function handleMissionControl(log, error) {
  const { databases } = getClients();
  const now = isoNow();

  // 1. Deploy / GitHub
  let deploy = {
    ok: false,
    lastCommitAt: null,
    sha: null,
    branch: 'main',
    repoConfigured: false,
    repoUrl: null,
    productionUrl: process.env.PRODUCTION_URL || 'https://thewise.cloud',
    siteUp: false,
    sitePingedAt: now,
    siteHttpStatus: 0,
  };

  const githubToken = process.env.GITHUB_TOKEN;
  const repoSlug = 'iammagdy/WiseResume-TWC';

  if (githubToken) {
    try {
      const ghRes = await axios.get(
        `https://api.github.com/repos/${repoSlug}/commits/main`,
        {
          headers: { Authorization: `Bearer ${githubToken}`, 'User-Agent': 'WiseCloud-DevKit/1.0' },
          timeout: 6000,
        },
      );
      deploy.repoConfigured = true;
      deploy.repoUrl = `https://github.com/${repoSlug}`;
      deploy.sha = ghRes.data.sha?.slice(0, 7) ?? null;
      deploy.lastCommitAt = ghRes.data.commit?.committer?.date ?? null;
      deploy.ok = true;
    } catch (e) {
      error(`GitHub fetch failed: ${e.message}`);
      deploy.repoConfigured = true;
      deploy.repoUrl = `https://github.com/${repoSlug}`;
    }
  }

  // 2. Site ping
  try {
    const siteRes = await axios.get(deploy.productionUrl, { timeout: 8000, validateStatus: () => true });
    deploy.siteUp = siteRes.status < 400;
    deploy.siteHttpStatus = siteRes.status;
    deploy.sitePingedAt = isoNow();
  } catch (e) {
    error(`Site ping failed: ${e.message}`);
    deploy.siteHttpStatus = 0;
  }

  // 3. AI provider pings
  const providerPings = [];
  const providerConfigs = [
    { key: 'OPENROUTER_KEY_1', provider: 'openrouter', url: 'https://openrouter.ai/api/v1/models', configuredKey: 'openrouterConfigured' },
    { key: 'OPENROUTER_KEY_2', provider: 'openrouter2', url: 'https://openrouter.ai/api/v1/models', configuredKey: 'openrouter2Configured' },
    { key: 'GROQ_KEY_1',       provider: 'groq',        url: 'https://api.groq.com/openai/v1/models', configuredKey: 'groqConfigured' },
  ];

  let openrouterConfigured = false;
  let openrouter2Configured = false;
  let groqConfigured = false;

  for (const cfg of providerConfigs) {
    const apiKey = process.env[cfg.key];
    if (!apiKey) {
      providerPings.push({ provider: cfg.provider, ok: false, latencyMs: null, httpStatus: 0 });
      continue;
    }
    if (cfg.provider === 'openrouter') openrouterConfigured = true;
    if (cfg.provider === 'openrouter2') openrouter2Configured = true;
    if (cfg.provider === 'groq') groqConfigured = true;

    const start = Date.now();
    try {
      const r = await axios.get(cfg.url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 6000,
        validateStatus: () => true,
      });
      providerPings.push({
        provider: cfg.provider,
        ok: r.status >= 200 && r.status < 300,
        latencyMs: Date.now() - start,
        httpStatus: r.status,
      });
    } catch {
      providerPings.push({ provider: cfg.provider, ok: false, latencyMs: null, httpStatus: 0 });
    }
  }

  const anyProviderOk = providerPings.some(p => p.ok);
  const allProvidersOk = providerPings.length > 0 && providerPings.every(p => p.ok);

  // 4. Email (Resend)
  const resendKey = process.env.RESEND_API_KEY;
  let email = {
    resendKeyPresent: !!resendKey,
    reachable: false,
    httpStatus: 0,
    sends24h: null,
    keyInSupabaseVault: false,
    reason: undefined,
  };

  if (resendKey) {
    try {
      const rRes = await axios.get('https://api.resend.com/emails', {
        headers: { Authorization: `Bearer ${resendKey}` },
        timeout: 5000,
        validateStatus: () => true,
      });
      email.reachable = rRes.status < 500;
      email.httpStatus = rRes.status;
      if (rRes.status === 403 && rRes.data?.name === 'restricted_api_key') {
        email.reason = 'restricted_key';
      }
    } catch {
      email.httpStatus = 0;
    }
  } else {
    email.reason = 'missing_key';
  }

  // 5. Database connectivity
  let database = { ok: false, error: null, errorCount1h: null };
  try {
    await databases.listDocuments(DB_ID, 'feature_flags', [sdk.Query.limit(1)]);
    database.ok = true;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    database.errorCount1h = await safeCount(databases, 'error_log', [
      sdk.Query.greaterThanEqual('$createdAt', oneHourAgo),
    ]);
  } catch (e) {
    database.error = e.message;
  }

  // 6. Secrets inventory
  const secretDefs = [
    { key: 'DEVKIT_PASSWORD',   label: 'DevKit password',  envKey: 'DEVKIT_PASSWORD' },
    { key: 'RESEND_API_KEY',    label: 'Resend API key',   envKey: 'RESEND_API_KEY' },
    { key: 'APPWRITE_API_KEY',  label: 'Appwrite API key', envKey: 'APPWRITE_API_KEY' },
    { key: 'OPENROUTER_KEY_1',  label: 'OpenRouter key 1', envKey: 'OPENROUTER_KEY_1' },
    { key: 'GROQ_KEY_1',        label: 'Groq key 1',       envKey: 'GROQ_KEY_1' },
    { key: 'GITHUB_TOKEN',      label: 'GitHub token',     envKey: 'GITHUB_TOKEN' },
  ];

  const secretItems = secretDefs.map(def => ({
    key: def.key,
    label: def.label,
    present: !!process.env[def.envKey],
    source: 'appwrite_function_variable',
    lastRotatedAt: null,
    stale: false,
    daysSinceRotation: null,
  }));

  const missingCount = secretItems.filter(s => !s.present).length;

  // 7. Recent errors
  const recentErrorDocs = await safeList(databases, 'error_log', [
    sdk.Query.orderDesc('$createdAt'),
    sdk.Query.limit(10),
  ]);
  const recentErrors = recentErrorDocs.map(d => ({
    id: d.$id,
    message: d.message || '',
    context: d.context || null,
    created_at: d.$createdAt,
    level: d.level || 'error',
  }));

  // 8. Recent admin actions
  const recentAdminDocs = await safeList(databases, 'admin_audit_logs', [
    sdk.Query.orderDesc('$createdAt'),
    sdk.Query.limit(5),
  ]);
  const recentAdminActions = recentAdminDocs.map(d => ({
    id: d.$id,
    action: d.action || '',
    category: d.category || null,
    metadata: d.metadata || null,
    created_at: d.$createdAt,
    user_id: d.user_id || null,
  }));

  return {
    isDevEnvironment: process.env.NODE_ENV !== 'production',
    checkedAt: now,
    deploy,
    ai: {
      providerPings,
      openrouterConfigured,
      openrouter2Configured,
      groqConfigured,
      anyProviderOk,
      allProvidersOk,
      keysInSupabaseVault: false,
    },
    email,
    database,
    secrets: {
      items: secretItems,
      missingCount,
      staleCount: 0,
    },
    recentErrors,
    recentAdminActions,
  };
}

// ─── ANALYTICS ───────────────────────────────────────────────────────────────

function getRangeStart(range) {
  const now = new Date();
  if (range === 'today') {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  if (range === '7d')  return new Date(now.getTime() - 7  * 86400000).toISOString();
  if (range === '30d') return new Date(now.getTime() - 30 * 86400000).toISOString();
  if (range === '90d') return new Date(now.getTime() - 90 * 86400000).toISOString();
  return null; // 'all'
}

function getRangeBucket(range) {
  return range === 'today' ? 'hour' : 'day';
}

async function handleAnalytics(range = '7d') {
  const { databases } = getClients();
  const rangeStart = getRangeStart(range);
  const prevStart = range !== 'all' ? new Date(new Date(rangeStart).getTime() - (new Date().getTime() - new Date(rangeStart).getTime())).toISOString() : null;
  const bucket = getRangeBucket(range);

  const rangeQueries = rangeStart ? [sdk.Query.greaterThanEqual('$createdAt', rangeStart)] : [];
  const prevQueries = prevStart ? [
    sdk.Query.greaterThanEqual('$createdAt', prevStart),
    sdk.Query.lessThan('$createdAt', rangeStart),
  ] : [];

  // Fetch usage events for current range
  const usageEvents = await safeList(databases, 'usage_events', [
    ...rangeQueries,
    sdk.Query.orderDesc('$createdAt'),
    sdk.Query.limit(1000),
  ]);

  const prevUsageEvents = prevStart ? await safeList(databases, 'usage_events', [
    ...prevQueries,
    sdk.Query.limit(500),
  ]) : [];

  // Portfolio visits
  const portfolioVisits = await safeList(databases, 'portfolio_visits', [
    ...rangeQueries,
    sdk.Query.limit(500),
  ]);
  const prevPortfolioVisits = prevStart ? await safeList(databases, 'portfolio_visits', [
    ...prevQueries,
    sdk.Query.limit(200),
  ]) : [];

  // AI credits (ai_usage_logs)
  const aiUsage = await safeList(databases, 'ai_usage_logs', [
    ...rangeQueries,
    sdk.Query.limit(500),
  ]);
  const prevAiUsage = prevStart ? await safeList(databases, 'ai_usage_logs', [
    ...prevQueries,
    sdk.Query.limit(200),
  ]) : [];

  // Active users (distinct user_ids from usage_events)
  const activeUserIds = new Set(usageEvents.map(e => e.user_id).filter(Boolean));
  const prevActiveUserIds = new Set(prevUsageEvents.map(e => e.user_id).filter(Boolean));

  // DAU / WAU
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const dauEvents = await safeList(databases, 'usage_events', [
    sdk.Query.greaterThanEqual('$createdAt', oneDayAgo),
    sdk.Query.limit(500),
  ]);
  const wauEvents = await safeList(databases, 'usage_events', [
    sdk.Query.greaterThanEqual('$createdAt', sevenDaysAgo),
    sdk.Query.limit(500),
  ]);
  const dau = new Set(dauEvents.map(e => e.user_id).filter(Boolean)).size;
  const wau = new Set(wauEvents.map(e => e.user_id).filter(Boolean)).size;
  const stickiness = wau > 0 ? Math.round((dau / wau) * 100) : 0;

  // AI credits total
  const aiCredits = aiUsage.reduce((sum, d) => sum + (d.tokens_used || d.credits_used || 1), 0);
  const prevAiCredits = prevAiUsage.reduce((sum, d) => sum + (d.tokens_used || d.credits_used || 1), 0);

  // Build time series
  const seriesMap = {};
  const now = new Date();
  if (bucket === 'hour') {
    for (let h = 23; h >= 0; h--) {
      const d = new Date(now.getTime() - h * 3600000);
      const key = d.toISOString().slice(0, 13) + ':00:00.000Z';
      seriesMap[key] = { views: 0, users: new Set() };
    }
  } else {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 14;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      seriesMap[key] = { views: 0, users: new Set() };
    }
  }

  for (const e of usageEvents) {
    const ts = e.$createdAt;
    const key = bucket === 'hour' ? ts.slice(0, 13) + ':00:00.000Z' : ts.slice(0, 10);
    if (seriesMap[key]) {
      seriesMap[key].views++;
      if (e.user_id) seriesMap[key].users.add(e.user_id);
    }
  }

  const activitySeries = Object.entries(seriesMap).map(([date, v]) => ({
    date,
    views: v.views,
    users: v.users.size,
  }));

  // DAU rolling (7-point rolling average of users)
  const dauRollingSeries = activitySeries.map((p, i) => {
    const window = activitySeries.slice(Math.max(0, i - 6), i + 1);
    const avg = window.reduce((s, w) => s + w.users, 0) / window.length;
    return { date: p.date, value: Math.round(avg) };
  });

  // New vs returning
  const profileDocs = await safeList(databases, 'profiles', [
    ...rangeQueries,
    sdk.Query.limit(500),
  ]);
  const newUserIds = new Set(profileDocs.map(d => d.user_id || d.$id));
  const newVsReturning = activitySeries.map(p => {
    const dayUsers = usageEvents
      .filter(e => e.$createdAt.slice(0, 10) === p.date.slice(0, 10) && e.user_id)
      .map(e => e.user_id);
    let newU = 0, retU = 0;
    for (const uid of new Set(dayUsers)) {
      if (newUserIds.has(uid)) newU++;
      else retU++;
    }
    return { date: p.date, newUsers: newU, returningUsers: retU };
  });

  // Heatmap (7 days × 24 hours)
  const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const e of usageEvents) {
    const d = new Date(e.$createdAt);
    const dow = d.getUTCDay();
    const hour = d.getUTCHours();
    heatmap[dow][hour]++;
  }

  // Top features
  const featureCounts = {};
  for (const e of usageEvents) {
    const name = e.event_type || e.feature || 'unknown';
    featureCounts[name] = (featureCounts[name] || 0) + 1;
  }
  const topFeaturesRaw = Object.entries(featureCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const topFeaturesRanged = topFeaturesRaw.map(([name, count]) => {
    const trend = activitySeries.map(p => ({
      date: p.date,
      value: usageEvents.filter(e =>
        (e.event_type || e.feature) === name &&
        e.$createdAt.slice(0, 10) === p.date.slice(0, 10)
      ).length,
    }));
    return { name, count, trend };
  });

  const topFeatures = topFeaturesRaw.map(([name, count]) => ({ name, count }));

  // Referrers
  const referrerCounts = {};
  for (const v of portfolioVisits) {
    const ref = v.referrer || v.utm_source || 'direct';
    referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
  }
  const topReferrers = Object.entries(referrerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Device breakdown
  const deviceCounts = {};
  for (const v of portfolioVisits) {
    const dev = v.device_type || 'unknown';
    deviceCounts[dev] = (deviceCounts[dev] || 0) + 1;
  }
  const deviceBreakdown = Object.entries(deviceCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // Country ranking
  const countryCounts = {};
  for (const v of portfolioVisits) {
    const c = v.country || v.country_code;
    if (c) countryCounts[c] = (countryCounts[c] || 0) + 1;
  }
  const countryRanking = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([country, count]) => ({ country, count }));

  // ── Signups over time (last 14 days from profiles collection) ────────────
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
  const recentProfiles = await safeList(databases, 'profiles', [
    sdk.Query.greaterThanEqual('$createdAt', fourteenDaysAgo),
    sdk.Query.orderAsc('$createdAt'),
    sdk.Query.limit(500),
  ]);
  // Build a day-keyed map for last 14 days
  const signupDayMap = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    signupDayMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const p of recentProfiles) {
    const day = p.$createdAt.slice(0, 10);
    if (signupDayMap[day] !== undefined) signupDayMap[day]++;
  }
  const signupsLast14Days = Object.entries(signupDayMap).map(([date, count]) => ({ date, count }));

  // ── Plan distribution from subscriptions ─────────────────────────────────
  const subscriptionDocs = await safeList(databases, 'subscriptions', [
    sdk.Query.limit(1000),
  ]);
  const planCounts = {};
  for (const sub of subscriptionDocs) {
    const plan = sub.plan || sub.plan_id || 'free';
    planCounts[plan] = (planCounts[plan] || 0) + 1;
  }
  const planDistribution = Object.entries(planCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([plan, count]) => ({ plan, count }));

  // ── Revenue metrics (MRR proxy from active paid subscriptions) ───────────
  // We don't have price data in the DB, so we return subscription counts per plan
  // scoped to range for trend purposes. Actual $MRR is calculated outside DB.
  const rangeSubDocs = rangeStart ? await safeList(databases, 'subscriptions', [
    sdk.Query.greaterThanEqual('$createdAt', rangeStart),
    sdk.Query.limit(500),
  ]) : subscriptionDocs;

  const paidSubsInRange = rangeSubDocs.filter(s => s.plan && s.plan !== 'free').length;
  const revenueMetrics = {
    paidSubscriptionsInRange: paidSubsInRange,
    totalPaidSubscriptions: subscriptionDocs.filter(s => s.plan && s.plan !== 'free').length,
    planDistribution,
    note: 'MRR in $ requires price data not stored in Appwrite — use plan counts as proxy',
  };

  // ── Cohort data: week-0 retention proxy ──────────────────────────────────
  // Group new users by signup week, then check if they had activity in the
  // following week (simple D7 retention proxy using usage_events).
  const cohortMap = {};
  for (const p of recentProfiles) {
    const uid = p.user_id || p.$id;
    const signupWeek = p.$createdAt.slice(0, 10);
    cohortMap[uid] = { signupDate: p.$createdAt, signupWeek, hadActivity: false };
  }
  for (const e of usageEvents) {
    if (cohortMap[e.user_id]) {
      const signupTs = new Date(cohortMap[e.user_id].signupDate).getTime();
      const eventTs  = new Date(e.$createdAt).getTime();
      const daysDiff = (eventTs - signupTs) / 86400000;
      if (daysDiff >= 1 && daysDiff <= 7) {
        cohortMap[e.user_id].hadActivity = true;
      }
    }
  }
  // Aggregate by signup week: cohort size and D7-retained count
  const cohortWeekMap = {};
  for (const { signupWeek, hadActivity } of Object.values(cohortMap)) {
    if (!cohortWeekMap[signupWeek]) cohortWeekMap[signupWeek] = { week: signupWeek, cohortSize: 0, retained: 0 };
    cohortWeekMap[signupWeek].cohortSize++;
    if (hadActivity) cohortWeekMap[signupWeek].retained++;
  }
  const cohortData = Object.values(cohortWeekMap)
    .sort((a, b) => a.week.localeCompare(b.week))
    .map(c => ({
      week: c.week,
      cohortSize: c.cohortSize,
      retained: c.retained,
      retentionRate: c.cohortSize > 0 ? Math.round((c.retained / c.cohortSize) * 100) : 0,
    }));

  // ── Resume creates in range ───────────────────────────────────────────────
  const resumeCreates = await safeCount(databases, 'resumes', rangeStart ? [
    sdk.Query.greaterThanEqual('$createdAt', rangeStart),
  ] : []);

  return {
    // Back-compat
    pageViewsAllTime: usageEvents.length,
    pageViewsToday: dauEvents.length,
    activeUsersToday: dau,
    activeUsersYesterday: 0,
    topFeatures,
    portfolioViewsTotal: portfolioVisits.length,
    signupsLast14Days,
    aiCreditsToday: aiCredits,
    aiCreditsYesterday: prevAiCredits,
    countryDistribution: countryRanking,
    // New
    range,
    bucket,
    rangeKpis: {
      views: { current: usageEvents.length, previous: prevUsageEvents.length },
      activeUsers: { current: activeUserIds.size, previous: prevActiveUserIds.size },
      aiCredits: { current: aiCredits, previous: prevAiCredits },
      portfolioViews: { current: portfolioVisits.length, previous: prevPortfolioVisits.length },
      stickiness,
      dau,
      wau,
    },
    activitySeries,
    dauRollingSeries,
    newVsReturning,
    heatmap,
    topFeaturesRanged,
    topReferrers,
    deviceBreakdown,
    topPages: [],
    countryRanking,
    totalCountries: Object.keys(countryCounts).length,
    lastUpdatedAt: new Date().toISOString(),
    // Extended business metrics
    signupsLast14Days,
    planDistribution,
    revenueMetrics,
    cohortData,
    resumeCreatesInRange: resumeCreates,
  };
}

// ─── OBSERVABILITY ────────────────────────────────────────────────────────────

async function handleObservability(body) {
  const { databases } = getClients();
  const obsAction = body.obs_action;

  if (obsAction === 'get_telemetry') {
    const docs = await safeList(databases, 'edge_function_logs', [
      sdk.Query.orderDesc('$createdAt'),
      sdk.Query.limit(500),
    ]);

    if (docs.length === 0) {
      // Check if the collection truly exists (safeList returns [] on both
      // "no documents" and "collection not found"). Try a direct count.
      try {
        await databases.listDocuments(DB_ID, 'edge_function_logs', [sdk.Query.limit(1)]);
      } catch {
        return { missing_table: true };
      }
    }

    // Aggregate by function_name
    const oneHourAgo = new Date(Date.now() - 3600000);
    const oneDayAgo  = new Date(Date.now() - 86400000);

    const fnMap = {};
    for (const doc of docs) {
      const name = doc.function_name || 'unknown';
      if (!fnMap[name]) {
        fnMap[name] = {
          function_name: name,
          total_count: 0,
          last_1h_count: 0,
          error_count: 0,
          latencies: [],
          hourlyBuckets: Array(24).fill(0),
        };
      }
      const entry = fnMap[name];
      const ts = new Date(doc.$createdAt);
      if (ts >= oneDayAgo) {
        entry.total_count++;
        if (doc.duration_ms) entry.latencies.push(doc.duration_ms);
        if (ts >= oneHourAgo) entry.last_1h_count++;
        if (doc.level === 'error' || doc.status >= 500) entry.error_count++;
        const hIdx = 23 - Math.floor((Date.now() - ts.getTime()) / 3600000);
        if (hIdx >= 0 && hIdx < 24) entry.hourlyBuckets[hIdx]++;
      }
    }

    const telemetry = Object.values(fnMap).map(f => {
      const sorted = [...f.latencies].sort((a, b) => a - b);
      const p = (pct) => sorted.length ? sorted[Math.floor(sorted.length * pct)] ?? 0 : 0;
      return {
        function_name: f.function_name,
        total_count: f.total_count,
        last_1h_count: f.last_1h_count,
        error_count: f.error_count,
        error_rate: f.total_count ? Math.round((f.error_count / f.total_count) * 100) : 0,
        p50_ms: p(0.5),
        p95_ms: p(0.95),
        sparkline: f.hourlyBuckets,
      };
    });

    return { telemetry };
  }

  if (obsAction === 'get_error_stream') {
    const since = body.since || new Date(Date.now() - 86400000).toISOString();
    const queries = [
      sdk.Query.greaterThanEqual('$createdAt', since),
      sdk.Query.orderDesc('$createdAt'),
      sdk.Query.limit(100),
    ];

    if (body.function_name) {
      queries.push(sdk.Query.equal('source', body.function_name));
    }
    if (body.severity && body.severity !== 'all') {
      queries.push(sdk.Query.equal('level', body.severity));
    }

    let errDocs;
    try {
      const result = await databases.listDocuments(DB_ID, 'error_log', queries);
      errDocs = result.documents;
    } catch {
      return { missing_table: true };
    }

    const errors = errDocs.map(d => ({
      id: d.$id,
      message: d.message || '',
      context: d.context || null,
      source: d.source || null,
      level: d.level || 'error',
      user_id: d.user_id || null,
      resolved: d.resolved || false,
      reviewed_at: d.reviewed_at || null,
      created_at: d.$createdAt,
    }));

    return { errors };
  }

  if (obsAction === 'mark_reviewed') {
    const errorId = body.error_id;
    if (!errorId) return { success: false, error: 'error_id is required' };

    const { databases: db } = getClients();
    await db.updateDocument(DB_ID, 'error_log', errorId, {
      resolved: true,
      reviewed_at: isoNow(),
    });
    return { success: true };
  }

  return { success: false, error: `Unknown obs_action: ${obsAction}` };
}

// ─── LIVE ACTIVITY ────────────────────────────────────────────────────────────

async function handleLiveActivity(body) {
  const { databases } = getClients();
  const resource = body.resource;

  if (resource === 'usage_events') {
    const docs = await safeList(databases, 'usage_events', [
      sdk.Query.orderDesc('$createdAt'),
      sdk.Query.limit(50),
    ]);
    const data = docs.map(d => ({
      id: d.$id,
      user_id: d.user_id || null,
      event_type: d.event_type || d.feature || 'unknown',
      metadata: d.metadata || null,
      created_at: d.$createdAt,
    }));
    return { data };
  }

  if (resource === 'error_log') {
    let docs;
    try {
      const result = await databases.listDocuments(DB_ID, 'error_log', [
        sdk.Query.orderDesc('$createdAt'),
        sdk.Query.limit(20),
      ]);
      docs = result.documents;
    } catch {
      return { missing: true, data: [] };
    }
    const data = docs.map(d => ({
      id: d.$id,
      message: d.message || '',
      context: d.context || null,
      created_at: d.$createdAt,
      level: d.level || 'error',
    }));
    return { data };
  }

  if (resource === 'contact_requests') {
    const docs = await safeList(databases, 'contact_requests', [
      sdk.Query.orderDesc('$createdAt'),
      sdk.Query.limit(20),
    ]);
    const data = docs.map(d => ({
      id: d.$id,
      type: d.type || 'contact',
      email: d.email || '',
      created_at: d.$createdAt,
      metadata: d.metadata || null,
    }));
    return { data };
  }

  return { success: false, error: `Unknown resource: ${resource}` };
}

// ─── EDGE-FN DRIFT ────────────────────────────────────────────────────────────

async function handleEdgeFnDrift() {
  const { functions } = getClients();
  const now = isoNow();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  let deployedCount = 0;
  let oldestDeployedAt = null;
  let newestDeployedAt = null;
  let olderThan30d = 0;

  // Functions that are intentionally public (execute: ['any']) — these are
  // expected to allow unauthenticated calls and should not be flagged as drift.
  const KNOWN_PUBLIC_FUNCTIONS = new Set([
    'ai-gateway',
    'auth-master',
  ]);

  // Expected default: admin-* functions should NOT have 'any' or 'guests' execute access.
  const PUBLIC_PRINCIPALS = new Set(['any', 'guests', 'guest']);

  const failures = [];
  const knownDrifts = [];
  let passCount = 0;
  let failCount = 0;
  let fnList = [];

  try {
    const fns = await functions.list();
    deployedCount = fns.total;
    fnList = fns.functions || [];

    for (const fn of fnList) {
      const updatedAt = fn.$updatedAt;
      if (updatedAt) {
        if (!oldestDeployedAt || updatedAt < oldestDeployedAt) oldestDeployedAt = updatedAt;
        if (!newestDeployedAt || updatedAt > newestDeployedAt) newestDeployedAt = updatedAt;
        if (updatedAt < thirtyDaysAgo) olderThan30d++;
      }

      // Inspect execute permissions for unexpected public access.
      // Appwrite stores execute as an array of role strings, e.g. ["users", "any"].
      const executePerms = fn.execute || [];
      const hasPublicAccess = executePerms.some(p => {
        const lower = (typeof p === 'string' ? p : '').toLowerCase();
        return PUBLIC_PRINCIPALS.has(lower) || lower.startsWith('any') || lower.startsWith('guests');
      });

      if (hasPublicAccess) {
        const entry = {
          name: fn.$id || fn.name || 'unknown',
          expected: 0, // 0 = restricted (no public execute)
          got: 1,      // 1 = public execute found
          note: `execute permissions include public role: [${executePerms.join(', ')}]`,
        };

        if (KNOWN_PUBLIC_FUNCTIONS.has(fn.$id) || KNOWN_PUBLIC_FUNCTIONS.has(fn.name)) {
          knownDrifts.push(entry);
        } else {
          failures.push(entry);
          failCount++;
        }
      } else {
        passCount++;
      }
    }
  } catch (e) {
    // Listing functions may fail if key lacks functions.read scope.
    // Return a degraded but structurally valid response.
  }

  const total = fnList.length;

  return {
    checkedAt: now,
    projectRef: process.env.APPWRITE_FUNCTION_PROJECT_ID || '69fd362b001eb325a192',
    deployedCount,
    freshness: {
      oldestDeployedAt,
      newestDeployedAt,
      olderThan30d,
    },
    authPosture: {
      total,
      pass: passCount,
      fail: failCount,
      knownDriftCount: knownDrifts.length,
      failures,
      knownDrifts,
      defaultExpected: 0, // admin functions default: no public execute access
    },
  };
}

// ─── Main entry point ─────────────────────────────────────────────────────────

module.exports = async ({ req, res, log, error }) => {
  // Auth check
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
  log(`admin-devkit-data: action=${action}`);

  try {
    if (action === 'mission-control') {
      const data = await handleMissionControl(log, error);
      return res.json(data);
    }

    if (action === 'analytics') {
      const data = await handleAnalytics(body.range || '7d');
      return res.json({ data });
    }

    if (action === 'observability') {
      const data = await handleObservability(body);
      return res.json(data);
    }

    if (action === 'live-activity') {
      const data = await handleLiveActivity(body);
      return res.json(data);
    }

    if (action === 'edge-fn-drift') {
      const data = await handleEdgeFnDrift();
      return res.json(data);
    }

    return res.json({ success: false, error: `Unknown action: ${action}` }, 400);

  } catch (e) {
    error(`admin-devkit-data error (action=${action}): ${e.message}`);
    return res.json({ success: false, error: e.message || 'Internal error' }, 500);
  }
};
