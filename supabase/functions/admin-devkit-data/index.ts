import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
// ── admin-analytics types & helpers ──────────────────────────────────────────
type Range = 'today' | '7d' | '30d' | '90d' | 'all';

interface RangeWindow {
  start: Date;
  end: Date;
  prevStart: Date | null;
  prevEnd: Date | null;
  bucket: 'hour' | 'day';
  bucketCount: number;
}

const DAY_MS = 86_400_000;

function computeWindow(range: Range): RangeWindow {
  const now = new Date();
  const todayMidnightUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tomorrowMidnightUtc = new Date(todayMidnightUtc.getTime() + DAY_MS);

  if (range === 'today') {
    return {
      start: todayMidnightUtc,
      end: tomorrowMidnightUtc,
      prevStart: new Date(todayMidnightUtc.getTime() - DAY_MS),
      prevEnd: todayMidnightUtc,
      bucket: 'hour',
      bucketCount: 24,
    };
  }
  if (range === 'all') {
    return {
      start: new Date('2024-01-01T00:00:00Z'),
      end: tomorrowMidnightUtc,
      prevStart: null,
      prevEnd: null,
      bucket: 'day',
      bucketCount: 0,
    };
  }
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const end = tomorrowMidnightUtc;
  const start = new Date(end.getTime() - days * DAY_MS);
  return {
    start,
    end,
    prevStart: new Date(start.getTime() - days * DAY_MS),
    prevEnd: start,
    bucket: 'day',
    bucketCount: days,
  };
}

function buildEmptyDailySeries(start: Date, end: Date): { date: string; value: number }[] {
  const out: { date: string; value: number }[] = [];
  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  for (let t = startUtc; t < endUtc; t += DAY_MS) {
    out.push({ date: new Date(t).toISOString().slice(0, 10), value: 0 });
  }
  return out;
}

function buildEmptyHourlySeries(start: Date, end: Date): { date: string; value: number }[] {
  const out: { date: string; value: number }[] = [];
  const startH = new Date(Date.UTC(
    start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), start.getUTCHours(),
  ));
  for (let t = startH.getTime(); t < end.getTime(); t += 3_600_000) {
    out.push({ date: new Date(t).toISOString().slice(0, 13) + ':00', value: 0 });
  }
  return out;
}

// ── admin-observability types & helpers ───────────────────────────────────────
interface LogRow {
  function_name: string;
  latency_ms: number;
  error: boolean;
  created_at: string;
  status_code: number;
}

interface TelemetryRow {
  function_name: string;
  total_count: number;
  last_1h_count: number;
  error_count: number;
  error_rate: number;
  p50_ms: number;
  p95_ms: number;
  sparkline: number[];
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function buildSparkline(rows: LogRow[], functionName: string, nowMs: number): number[] {
  const hourMs = 60 * 60 * 1000;
  const cutoff = nowMs - 24 * hourMs;
  const buckets = new Array(24).fill(0) as number[];
  for (const row of rows) {
    if (row.function_name !== functionName) continue;
    const ts = new Date(row.created_at).getTime();
    if (ts < cutoff) continue;
    const hoursAgo = Math.floor((nowMs - ts) / hourMs);
    const slot = 23 - hoursAgo;
    if (slot >= 0 && slot < 24) buckets[slot]++;
  }
  return buckets;
}

function computeTelemetry(rows: LogRow[], nowMs: number): TelemetryRow[] {
  const byFn = new Map<string, LogRow[]>();
  for (const row of rows) {
    const arr = byFn.get(row.function_name) ?? [];
    arr.push(row);
    byFn.set(row.function_name, arr);
  }
  const oneHourAgo = nowMs - 60 * 60 * 1000;
  const result: TelemetryRow[] = [];
  for (const [fnName, fnRows] of byFn) {
    const latencies = fnRows.map(r => r.latency_ms).sort((a, b) => a - b);
    const errorCount = fnRows.filter(r => r.error).length;
    const last1hCount = fnRows.filter(r => new Date(r.created_at).getTime() >= oneHourAgo).length;
    result.push({
      function_name: fnName,
      total_count: fnRows.length,
      last_1h_count: last1hCount,
      error_count: errorCount,
      error_rate: fnRows.length > 0 ? Math.round((errorCount / fnRows.length) * 100) : 0,
      p50_ms: percentile(latencies, 50),
      p95_ms: percentile(latencies, 95),
      sparkline: buildSparkline(rows, fnName, nowMs),
    });
  }
  return result.sort((a, b) => b.total_count - a.total_count);
}

// ── admin-mission-control helpers ─────────────────────────────────────────────
const REQUIRED_ENV_VARS: { key: string; label: string }[] = [
  { key: 'SUPABASE_URL', label: 'Supabase URL' },
  { key: 'SUPABASE_ANON_KEY', label: 'Supabase Anon Key' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Role Key' },
  { key: 'DEV_KIT_PASSWORD', label: 'DevKit Password' },
  { key: 'KINDE_DOMAIN', label: 'Kinde Domain' },
  { key: 'OPENROUTER_KEY_1', label: 'OpenRouter Key 1' },
  { key: 'OPENROUTER_KEY_2', label: 'OpenRouter Key 2' },
  { key: 'OPENROUTER_KEY_3', label: 'OpenRouter Key 3' },
  { key: 'GROQ_KEY_1', label: 'Groq Key 1' },
  { key: 'GROQ_KEY_2', label: 'Groq Key 2' },
  { key: 'GROQ_KEY_3', label: 'Groq Key 3' },
  { key: 'DEEPSEEK_KEY', label: 'DeepSeek Key 1' },
  { key: 'GITHUB_TOKEN', label: 'GitHub Token' },
  { key: 'GITHUB_OWNER', label: 'GitHub Owner' },
  { key: 'GITHUB_REPO', label: 'GitHub Repo' },
  { key: 'RESEND_API_KEY', label: 'Resend API Key' },
  { key: 'KINDE_WEBHOOK_SECRET', label: 'Kinde Webhook Secret' },
  { key: 'KINDE_M2M_CLIENT_ID', label: 'Kinde M2M Client ID' },
  { key: 'KINDE_M2M_CLIENT_SECRET', label: 'Kinde M2M Client Secret' },
  { key: 'ADMIN_EMAILS', label: 'Admin Emails Allowlist' },
];

const STALE_DAYS = 90;

async function checkGitHub(owner: string, repo: string, token: string) {
  try {
    const resp = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'WiseResume-DevKit/1.0',
        },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!resp.ok) return { ok: false, lastCommitAt: null, sha: null, branch: 'main' };
    const commits = await resp.json() as Array<{
      sha: string;
      commit: { author: { date: string } };
    }>;
    const first = commits[0];
    return {
      ok: true,
      lastCommitAt: first?.commit?.author?.date ?? null,
      sha: first?.sha?.slice(0, 7) ?? null,
      branch: 'main',
    };
  } catch {
    return { ok: false, lastCommitAt: null, sha: null, branch: 'main' };
  }
}

async function checkProductionSite(url: string) {
  try {
    const resp = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    return { up: resp.ok || resp.status < 500, httpStatus: resp.status };
  } catch {
    return { up: false, httpStatus: 0 };
  }
}

async function checkAIProvider(
  name: string,
  modelsUrl: string,
  apiKey: string,
): Promise<{ provider: string; ok: boolean; latencyMs: number | null; httpStatus: number }> {
  if (!apiKey) return { provider: name, ok: false, latencyMs: null, httpStatus: 0 };
  const start = Date.now();
  try {
    const resp = await fetch(modelsUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(6000),
    });
    const latencyMs = Date.now() - start;
    return { provider: name, ok: resp.ok, latencyMs, httpStatus: resp.status };
  } catch {
    return { provider: name, ok: false, latencyMs: null, httpStatus: 0 };
  }
}

async function checkResend(apiKey: string) {
  if (!apiKey) return { reachable: false, httpStatus: 0, sends24h: null as number | null };
  try {
    const resp = await fetch('https://api.resend.com/emails?limit=100', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return { reachable: false, httpStatus: resp.status, sends24h: null };
    const body = await resp.json() as { data?: Array<{ created_at: string }> };
    const cutoff = Date.now() - 86400_000;
    const sends24h = (body.data ?? []).filter(
      (e) => new Date(e.created_at).getTime() > cutoff,
    ).length;
    return { reachable: true, httpStatus: resp.status, sends24h };
  } catch {
    return { reachable: false, httpStatus: 0, sends24h: null };
  }
}

// ── admin-github-status types ─────────────────────────────────────────────────
interface GitHubCommitResponse {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  author: { login: string } | null;
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(wrapHandler("admin-devkit-data", async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch { /* empty body ok */ }

  const action = (body.action as string | undefined);

  if (!action) {
    return new Response(
      JSON.stringify({ success: false, error: 'action is required: analytics | observability | live-activity | mission-control | github-status | ai-cost' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ── ACTION: ai-cost ───────────────────────────────────────────────────────
  // Read-only AI usage attribution dashboard. Aggregates ai_usage_logs into
  // totals + top users + per-feature + per-provider breakdowns for a given
  // window. "Cost" is expressed as invocation count because the schema does
  // not store USD or token counts today (out-of-scope item #4 — re-modelling
  // cost recording is intentionally excluded). The panel labels this honestly.
  if (action === 'ai-cost') {
    try {
      const { range: rawRange } = body as { range?: Range };
      const range: Range = (['today', '7d', '30d', '90d', 'all'] as const).includes(rawRange as Range)
        ? (rawRange as Range)
        : '30d';

      try {
        await requireAdminAuth(req);
      } catch (authErr) {
        if (authErr instanceof Response) return authErr;
        throw authErr;
      }

      const supabase = getServiceClient();
      const win = computeWindow(range);

      // Run the 5 aggregate RPCs in parallel — each is server-side, returns
      // already-aggregated rows, so the round-trip stays well under 1.5s.
      const [
        dailyTotalsResult,
        topUsersResult,
        byFeatureResult,
        byProviderResult,
        prevTotalResult,
      ] = await Promise.all([
        supabase.rpc('get_ai_usage_daily_totals', {
          p_start: win.start.toISOString(), p_end: win.end.toISOString(),
        }),
        supabase.rpc('get_ai_usage_top_users', {
          p_start: win.start.toISOString(), p_end: win.end.toISOString(), p_top_n: 10,
        }),
        supabase.rpc('get_ai_usage_by_feature', {
          p_start: win.start.toISOString(), p_end: win.end.toISOString(),
        }),
        supabase.rpc('get_ai_usage_by_provider', {
          p_start: win.start.toISOString(), p_end: win.end.toISOString(),
        }),
        win.prevStart && win.prevEnd
          ? supabase.rpc('get_ai_usage_window_total', {
              p_start: win.prevStart.toISOString(), p_end: win.prevEnd.toISOString(),
            })
          : Promise.resolve({ data: 0, error: null }),
      ]);

      // Build a dense daily series (zero-fills missing days so the sparkline
      // doesn't lie about gaps).
      type DailyRow = { bucket_date: string; invocations: number; distinct_users: number };
      const dailyRows = (dailyTotalsResult.data ?? []) as DailyRow[];
      const dailyMap = new Map<string, { invocations: number; distinct_users: number }>();
      for (const r of dailyRows) {
        const k = (r.bucket_date ?? '').slice(0, 10);
        if (k) dailyMap.set(k, {
          invocations: Number(r.invocations),
          distinct_users: Number(r.distinct_users),
        });
      }
      const dailySeries = win.bucket === 'day'
        ? buildEmptyDailySeries(win.start, win.end).map(e => ({
            date: e.date,
            value: dailyMap.get(e.date)?.invocations ?? 0,
          }))
        : dailyRows.map(r => ({
            date: (r.bucket_date ?? '').slice(0, 10),
            value: Number(r.invocations),
          }));

      const currentTotal = dailyRows.reduce((s, r) => s + Number(r.invocations), 0);
      // Distinct users across the full window — RPC reports per-day distincts,
      // so we union the contributing user_ids approximately by max-of-day.
      // For an exact distinct, fetch from a single aggregate; for top-of-list
      // accuracy this approximation is fine (and matches Analytics' approach).
      const distinctUsersInWindow = dailyRows.reduce(
        (m, r) => Math.max(m, Number(r.distinct_users)), 0,
      );

      const prevTotal = Number(prevTotalResult.data ?? 0);

      // Resolve email for top users via auth.admin.getUserById. The 10 calls
      // run in parallel so worst-case adds <300ms to the response.
      type TopUserRow = { user_id: string; invocations: number };
      const topUserRows = (topUsersResult.data ?? []) as TopUserRow[];
      const topUsersWithEmail = await Promise.all(
        topUserRows.map(async (row) => {
          let email: string | null = null;
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(row.user_id);
            const candidate = authUser?.user?.email ?? null;
            // Hide synthetic placeholder emails used for legacy Kinde shadows.
            email = candidate && !candidate.endsWith('@kinde.placeholder') ? candidate : null;
          } catch {
            email = null;
          }
          return {
            user_id: row.user_id,
            email,
            invocations: Number(row.invocations),
          };
        }),
      );

      type FeatureRow = { action_type: string; invocations: number };
      const byFeature = ((byFeatureResult.data ?? []) as FeatureRow[]).map(r => ({
        name: r.action_type,
        count: Number(r.invocations),
      }));

      type ProviderRow = { provider: string; invocations: number };
      const byProvider = ((byProviderResult.data ?? []) as ProviderRow[]).map(r => ({
        name: r.provider,
        count: Number(r.invocations),
      }));

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            range,
            bucket: win.bucket,
            totals: { current: currentTotal, previous: prevTotal },
            distinctUsers: distinctUsersInWindow,
            dailySeries,
            topUsers: topUsersWithEmail,
            byFeature,
            byProvider,
            generatedAt: new Date().toISOString(),
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    } catch (err) {
      console.error('[admin-devkit-data/ai-cost] Unexpected error:', err);
      return new Response(
        JSON.stringify({ success: false, error: String(err) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  }

  // ── ACTION: analytics ─────────────────────────────────────────────────────
  if (action === 'analytics') {
    try {
      const { range: rawRange } = body as { range?: Range };
      const range: Range = (['today', '7d', '30d', '90d', 'all'] as const).includes(rawRange as Range)
        ? (rawRange as Range)
        : '7d';

      try {
        await requireAdminAuth(req);
      } catch (authErr) {
        if (authErr instanceof Response) return authErr;
        throw authErr;
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );

      const win = computeWindow(range);
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - DAY_MS).toISOString().split('T')[0];
      const fourteenDaysAgo = new Date(Date.now() - 14 * DAY_MS).toISOString();
      const wauStart = new Date(Date.now() - 7 * DAY_MS);
      const dauStart = new Date(Date.now() - DAY_MS);

      const [
        allEventsResult, todayEventsResult, yesterdayEventsResult, featureEventsResult,
        portfolioEventsResult, signupProfilesResult, aiTodayResult, aiYesterdayResult,
        countryResult, activityDailyResult, activityHourlyResult, dowHourResult,
        topFeaturesTrendResult, newReturningResult, referrersResult, devicesResult,
        topPagesResult, dauResult, wauResult, prevTotalsEventsResult,
        prevTotalsAiResult, prevTotalsPortfolioResult,
      ] = await Promise.all([
        supabase.from('usage_events').select('id', { count: 'exact', head: true }),
        supabase.from('usage_events').select('id, user_id', { count: 'exact' })
          .gte('created_at', `${today}T00:00:00Z`).lt('created_at', `${today}T23:59:59Z`)
          .not('user_id', 'is', null),
        supabase.from('usage_events').select('id, user_id', { count: 'exact' })
          .gte('created_at', `${yesterday}T00:00:00Z`).lt('created_at', `${yesterday}T23:59:59Z`)
          .not('user_id', 'is', null),
        supabase.rpc('get_top_feature_events', { top_n: 10 }),
        supabase.from('portfolio_visits').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('created_at')
          .gte('created_at', fourteenDaysAgo).order('created_at', { ascending: true }),
        supabase.from('ai_credits').select('daily_usage, usage_date').eq('usage_date', today),
        supabase.from('ai_credits').select('daily_usage, usage_date').eq('usage_date', yesterday),
        supabase.rpc('get_country_stats', { p_top_n: 10 }),
        win.bucket === 'day'
          ? supabase.rpc('get_usage_activity_daily', { p_start: win.start.toISOString(), p_end: win.end.toISOString() })
          : Promise.resolve({ data: [], error: null }),
        win.bucket === 'hour'
          ? supabase.rpc('get_usage_activity_hourly', { p_start: win.start.toISOString(), p_end: win.end.toISOString() })
          : Promise.resolve({ data: [], error: null }),
        supabase.rpc('get_dow_hour_activity', { p_start: win.start.toISOString(), p_end: win.end.toISOString() }),
        supabase.rpc('get_top_features_with_trend', { p_start: win.start.toISOString(), p_end: win.end.toISOString(), p_top_n: 6 }),
        win.bucket === 'day'
          ? supabase.rpc('get_new_vs_returning_daily', { p_start: win.start.toISOString(), p_end: win.end.toISOString() })
          : Promise.resolve({ data: [], error: null }),
        supabase.rpc('get_portfolio_referrers', { p_start: win.start.toISOString(), p_end: win.end.toISOString(), p_top_n: 8 }),
        supabase.rpc('get_portfolio_devices', { p_start: win.start.toISOString(), p_end: win.end.toISOString() }),
        supabase.rpc('get_top_pages', { p_start: win.start.toISOString(), p_end: win.end.toISOString(), p_top_n: 10 }),
        supabase.rpc('get_distinct_active_users', { p_start: dauStart.toISOString(), p_end: new Date().toISOString() }),
        supabase.rpc('get_distinct_active_users', { p_start: wauStart.toISOString(), p_end: new Date().toISOString() }),
        win.prevStart && win.prevEnd
          ? supabase.from('usage_events').select('id', { count: 'exact', head: true })
              .gte('created_at', win.prevStart.toISOString())
              .lt('created_at', win.prevEnd.toISOString())
              .not('user_id', 'is', null)
          : Promise.resolve({ count: null, data: null, error: null }),
        win.prevStart && win.prevEnd
          ? supabase.from('ai_credits').select('daily_usage, usage_date')
              .gte('usage_date', win.prevStart.toISOString().slice(0, 10))
              .lt('usage_date', win.prevEnd.toISOString().slice(0, 10))
          : Promise.resolve({ data: [], error: null }),
        win.prevStart && win.prevEnd
          ? supabase.from('portfolio_visits').select('id', { count: 'exact', head: true })
              .gte('visited_at', win.prevStart.toISOString())
              .lt('visited_at', win.prevEnd.toISOString())
          : Promise.resolve({ count: null, data: null, error: null }),
      ]);

      const pageViewsAllTime = allEventsResult.count ?? 0;
      const pageViewsToday = todayEventsResult.count ?? 0;
      const todayEventRows = (todayEventsResult.data ?? []) as { id: string; user_id: string }[];
      const yesterdayEventRows = (yesterdayEventsResult.data ?? []) as { id: string; user_id: string }[];
      const activeUsersToday = new Set(todayEventRows.map(e => e.user_id)).size;
      const activeUsersYesterday = new Set(yesterdayEventRows.map(e => e.user_id)).size;
      const featureRows = (featureEventsResult.data ?? []) as { event_type: string; count: number }[];
      const topFeatures = featureRows.map(row => ({ name: row.event_type ?? 'unknown', count: Number(row.count) }));
      const portfolioViewsTotal = portfolioEventsResult.count ?? 0;

      const signupByDay: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * DAY_MS).toISOString().split('T')[0];
        signupByDay[d] = 0;
      }
      const profileRows = (signupProfilesResult.data ?? []) as { created_at: string }[];
      for (const p of profileRows) {
        const d = p.created_at?.split('T')[0];
        if (d && d in signupByDay) signupByDay[d]++;
      }
      const signupsLast14Days = Object.entries(signupByDay).map(([date, count]) => ({ date, count }));

      const aiTodayRows = (aiTodayResult.data ?? []) as { daily_usage: number | null }[];
      const aiYesterdayRows = (aiYesterdayResult.data ?? []) as { daily_usage: number | null }[];
      const aiCreditsToday = aiTodayRows.reduce((s, r) => s + (r.daily_usage ?? 0), 0);
      const aiCreditsYesterday = aiYesterdayRows.reduce((s, r) => s + (r.daily_usage ?? 0), 0);

      const countryStatsRows = (countryResult.data ?? []) as { country: string; count: number; total_distinct: number }[];
      const countryDistribution = countryStatsRows.map(r => ({ country: r.country, count: Number(r.count) }));
      const totalCountries = Number(countryStatsRows[0]?.total_distinct ?? 0);

      type ActivityRow = { bucket_date?: string; bucket_hour?: string; total: number; distinct_users: number };
      let activitySeries: { date: string; views: number; users: number }[] = [];
      if (win.bucket === 'day') {
        const empty = buildEmptyDailySeries(win.start, win.end);
        const rows = (activityDailyResult.data ?? []) as ActivityRow[];
        const map = new Map<string, { views: number; users: number }>();
        for (const r of rows) {
          const k = (r.bucket_date ?? '').slice(0, 10);
          if (k) map.set(k, { views: Number(r.total), users: Number(r.distinct_users) });
        }
        activitySeries = empty.map(e => ({
          date: e.date,
          views: map.get(e.date)?.views ?? 0,
          users: map.get(e.date)?.users ?? 0,
        }));
      } else {
        const empty = buildEmptyHourlySeries(win.start, win.end);
        const rows = (activityHourlyResult.data ?? []) as ActivityRow[];
        const map = new Map<string, { views: number; users: number }>();
        for (const r of rows) {
          const k = (r.bucket_hour ?? '').slice(0, 13) + ':00';
          if (k) map.set(k, { views: Number(r.total), users: Number(r.distinct_users) });
        }
        activitySeries = empty.map(e => ({
          date: e.date,
          views: map.get(e.date)?.views ?? 0,
          users: map.get(e.date)?.users ?? 0,
        }));
      }

      const dauRollingSeries = activitySeries.map((point, idx, arr) => {
        if (win.bucket !== 'day') return { date: point.date, value: point.users };
        const w = arr.slice(Math.max(0, idx - 6), idx + 1);
        const avg = w.reduce((s, p) => s + p.users, 0) / w.length;
        return { date: point.date, value: Math.round(avg * 10) / 10 };
      });

      type DowHourRow = { dow: number; hod: number; total: number };
      const heatRows = (dowHourResult.data ?? []) as DowHourRow[];
      const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
      for (const r of heatRows) {
        if (r.dow >= 0 && r.dow < 7 && r.hod >= 0 && r.hod < 24) heatmap[r.dow][r.hod] = Number(r.total);
      }

      type FeatureTrendRow = { event_type: string; total: number; trend: { d: string; c: number }[] };
      const featureTrendRows = (topFeaturesTrendResult.data ?? []) as FeatureTrendRow[];
      const dailyKeys = win.bucket === 'day'
        ? buildEmptyDailySeries(win.start, win.end).map(e => e.date)
        : [];
      const topFeaturesRanged = featureTrendRows.map(r => {
        const trendMap = new Map<string, number>();
        for (const t of (r.trend ?? [])) trendMap.set(t.d, Number(t.c));
        const trend = dailyKeys.length > 0
          ? dailyKeys.map(d => ({ date: d, value: trendMap.get(d) ?? 0 }))
          : [];
        return { name: r.event_type, count: Number(r.total), trend };
      });

      type NewReturningRow = { bucket_date: string; new_users: number; returning_users: number };
      const newRetRows = (newReturningResult.data ?? []) as NewReturningRow[];
      const newRetMap = new Map<string, { newUsers: number; returningUsers: number }>();
      for (const r of newRetRows) {
        newRetMap.set((r.bucket_date ?? '').slice(0, 10), {
          newUsers: Number(r.new_users), returningUsers: Number(r.returning_users),
        });
      }
      const newVsReturning = win.bucket === 'day'
        ? buildEmptyDailySeries(win.start, win.end).map(e => ({
            date: e.date,
            newUsers: newRetMap.get(e.date)?.newUsers ?? 0,
            returningUsers: newRetMap.get(e.date)?.returningUsers ?? 0,
          }))
        : [];

      const referrerRows = (referrersResult.data ?? []) as { referrer: string; count: number }[];
      const topReferrers = referrerRows.map(r => ({ name: r.referrer, count: Number(r.count) }));
      const deviceRows = (devicesResult.data ?? []) as { device: string; count: number }[];
      const deviceBreakdown = deviceRows.map(r => ({ name: r.device, count: Number(r.count) }));
      const topPagesRows = (topPagesResult.data ?? []) as { path: string | null; count: number }[];
      const topPages = topPagesRows.filter(r => r.path).map(r => ({ name: r.path as string, count: Number(r.count) }));

      const dauNow = Number(dauResult.data ?? 0);
      const wauNow = Number(wauResult.data ?? 0);
      const stickiness = wauNow > 0 ? Math.round((dauNow / wauNow) * 1000) / 10 : 0;

      const rangeViews = activitySeries.reduce((s, p) => s + p.views, 0);
      const rangeActiveUsersResult = await supabase.rpc('get_distinct_active_users', {
        p_start: win.start.toISOString(),
        p_end: win.end.toISOString(),
      });
      const rangeActiveUsersValue = Number(rangeActiveUsersResult.data ?? 0);

      const prevRangeViews = (prevTotalsEventsResult as { count: number | null }).count ?? 0;
      const prevAiRows = (prevTotalsAiResult.data ?? []) as { daily_usage: number | null }[];
      const prevAiCredits = prevAiRows.reduce((s, r) => s + (r.daily_usage ?? 0), 0);
      const prevPortfolioViews = (prevTotalsPortfolioResult as { count: number | null }).count ?? 0;

      const [rangeAiResult, rangePortfolioResult] = await Promise.all([
        supabase.from('ai_credits').select('daily_usage, usage_date')
          .gte('usage_date', win.start.toISOString().slice(0, 10))
          .lt('usage_date', win.end.toISOString().slice(0, 10)),
        supabase.from('portfolio_visits').select('id', { count: 'exact', head: true })
          .gte('visited_at', win.start.toISOString()).lt('visited_at', win.end.toISOString()),
      ]);
      const rangeAiCredits = ((rangeAiResult.data ?? []) as { daily_usage: number | null }[])
        .reduce((s, r) => s + (r.daily_usage ?? 0), 0);
      const rangePortfolioViews = (rangePortfolioResult as { count: number | null }).count ?? 0;

      let prevRangeActiveUsers = 0;
      if (win.prevStart && win.prevEnd) {
        const prevDistinct = await supabase.rpc('get_distinct_active_users', {
          p_start: win.prevStart.toISOString(), p_end: win.prevEnd.toISOString(),
        });
        prevRangeActiveUsers = Number(prevDistinct.data ?? 0);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            pageViewsAllTime, pageViewsToday, activeUsersToday, activeUsersYesterday,
            topFeatures, portfolioViewsTotal, signupsLast14Days, aiCreditsToday,
            aiCreditsYesterday, countryDistribution, range, bucket: win.bucket,
            rangeKpis: {
              views: { current: rangeViews, previous: prevRangeViews },
              activeUsers: { current: rangeActiveUsersValue, previous: prevRangeActiveUsers },
              aiCredits: { current: rangeAiCredits, previous: prevAiCredits },
              portfolioViews: { current: rangePortfolioViews, previous: prevPortfolioViews },
              stickiness, dau: dauNow, wau: wauNow,
            },
            activitySeries, dauRollingSeries, newVsReturning, heatmap, topFeaturesRanged,
            topReferrers, deviceBreakdown, topPages,
            countryRanking: countryDistribution, totalCountries,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ success: false, error: String(err) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  }

  // ── ACTION: observability ─────────────────────────────────────────────────
  if (action === 'observability') {
    try {
      try {
        await requireAdminAuth(req);
      } catch (authErr) {
        if (authErr instanceof Response) return authErr;
        throw authErr;
      }

      const supabase = getServiceClient();
      const obs_action: string = (body.obs_action as string | undefined) ?? 'get_telemetry';

      if (obs_action === 'get_telemetry') {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
          .from('edge_function_logs')
          .select('function_name, latency_ms, error, created_at, status_code')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(50000);

        if (error) {
          if (error.code === '42P01') {
            return new Response(
              JSON.stringify({ success: true, telemetry: [], missing_table: true }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
          }
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        const nowMs = Date.now();
        const telemetry = computeTelemetry((data ?? []) as LogRow[], nowMs);
        return new Response(
          JSON.stringify({ success: true, telemetry, generated_at: new Date().toISOString() }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (obs_action === 'get_error_stream') {
        const { function_name, severity, since } = body as {
          function_name?: string;
          severity?: 'error' | 'warn' | 'warning' | 'all';
          since?: string;
        };

        let query = supabase
          .from('error_log')
          .select('id, message, context, source, level, user_id, resolved, reviewed_at, created_at')
          .order('created_at', { ascending: false })
          .limit(100);

        if (function_name) query = query.eq('source', function_name);
        if (severity && severity !== 'all') {
          const levels = severity === 'warn' || severity === 'warning'
            ? ['warn', 'warning']
            : ['error', 'fatal'];
          query = query.in('level', levels);
        }
        if (since) query = query.gte('created_at', since);

        const { data, error } = await query;
        if (error) {
          if (error.code === '42P01') {
            return new Response(
              JSON.stringify({ success: true, errors: [], missing_table: true }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
          }
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        return new Response(
          JSON.stringify({ success: true, errors: data ?? [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (obs_action === 'mark_reviewed') {
        const { error_id } = body as { error_id?: string };
        if (!error_id) {
          return new Response(
            JSON.stringify({ success: false, error: 'error_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        const { error } = await supabase
          .from('error_log')
          .update({ reviewed_at: new Date().toISOString(), resolved: true })
          .eq('id', error_id);
        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        return new Response(
          JSON.stringify({ success: true, error_id }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: `Unknown obs_action: ${obs_action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    } catch (err) {
      console.error('[admin-devkit-data/observability] Unexpected error:', err);
      return new Response(
        JSON.stringify({ success: false, error: 'Internal server error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  }

  // ── ACTION: live-activity ──────────────────────────────────────────────────
  if (action === 'live-activity') {
    try {
      const { resource, user_id, event_type } = body as {
        resource: string;
        user_id?: string;
        event_type?: string;
      };

      try {
        await requireAdminAuth(req);
      } catch (authErr) {
        if (authErr instanceof Response) return authErr;
        throw authErr;
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );

      if (resource === 'usage_events') {
        let query = supabase
          .from('usage_events')
          .select('id, user_id, event_type, metadata, created_at')
          .order('created_at', { ascending: false })
          .limit(50);
        if (user_id) query = query.eq('user_id', user_id);
        if (event_type) query = query.eq('event_type', event_type);
        const { data, error } = await query;
        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        return new Response(
          JSON.stringify({ success: true, data: data ?? [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (resource === 'error_log') {
        const { data, error } = await supabase
          .from('error_log')
          .select('id, message, context, created_at, level')
          .order('created_at', { ascending: false })
          .limit(20);
        if (error) {
          if (error.code === '42P01') {
            return new Response(
              JSON.stringify({ success: true, missing: true, data: [] }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
          }
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        return new Response(
          JSON.stringify({ success: true, missing: false, data: data ?? [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (resource === 'user_content_stats') {
        if (!user_id) {
          return new Response(
            JSON.stringify({ success: false, error: 'user_id required for user_content_stats' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
        const [resumesResult, coverLettersResult, portfolioResult, aiCreditsResult, planHistoryResult] =
          await Promise.allSettled([
            supabase.from('resumes').select('id', { count: 'exact', head: true }).eq('user_id', user_id),
            supabase.from('cover_letters').select('id', { count: 'exact', head: true }).eq('user_id', user_id),
            supabase.from('portfolio_usernames').select('username, enabled').eq('user_id', user_id).maybeSingle(),
            supabase.from('usage_events').select('id', { count: 'exact', head: true })
              .eq('user_id', user_id).ilike('event_type', 'ai_%').gte('created_at', thirtyDaysAgo),
            supabase.from('audit_logs').select('action, metadata, created_at')
              .eq('user_id', user_id)
              .in('action', ['plan_change', 'trial_grant', 'trial_revoke'])
              .order('created_at', { ascending: false }).limit(10),
          ]);
        return new Response(
          JSON.stringify({
            success: true,
            resumeCount: resumesResult.status === 'fulfilled' ? (resumesResult.value.count ?? null) : null,
            coverLetterCount: coverLettersResult.status === 'fulfilled' ? (coverLettersResult.value.count ?? null) : null,
            hasPortfolio: portfolioResult.status === 'fulfilled' && !!portfolioResult.value.data,
            portfolioEnabled: portfolioResult.status === 'fulfilled' ? (portfolioResult.value.data?.enabled ?? null) : null,
            portfolioUsername: portfolioResult.status === 'fulfilled' ? (portfolioResult.value.data?.username ?? null) : null,
            aiCredits30d: aiCreditsResult.status === 'fulfilled' ? (aiCreditsResult.value.count ?? null) : null,
            planHistory: planHistoryResult.status === 'fulfilled' ? (planHistoryResult.value.data ?? []) : [],
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (resource === 'contact_requests') {
        const { data, error } = await supabase
          .from('contact_requests')
          .select('id, type, email, created_at, metadata')
          .order('created_at', { ascending: false })
          .limit(5);
        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        return new Response(
          JSON.stringify({ success: true, data: data ?? [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: `Unknown resource: ${resource}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ success: false, error: String(err) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  }

  // ── ACTION: mission-control ───────────────────────────────────────────────
  if (action === 'mission-control') {
    try {
      try {
        await requireAdminAuth(req);
      } catch (authErr) {
        if (authErr instanceof Response) return authErr;
        throw authErr;
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );

      const githubToken = Deno.env.get('GITHUB_TOKEN') ?? '';
      const githubOwner = Deno.env.get('GITHUB_OWNER') ?? '';
      const githubRepo = Deno.env.get('GITHUB_REPO') ?? '';
      const resendKey = Deno.env.get('RESEND_API_KEY') ?? '';
      const openrouterKey = Deno.env.get('OPENROUTER_KEY_1') ?? Deno.env.get('OPENROUTER_KEY_2') ?? Deno.env.get('OPENROUTER_KEY_3') ?? '';
      const openrouterKey2 = Deno.env.get('OPENROUTER_KEY_2') ?? '';
      const groqKey = Deno.env.get('GROQ_KEY_1') ?? Deno.env.get('GROQ_KEY_2') ?? Deno.env.get('GROQ_KEY_3') ?? '';
      const deepseekKey = Deno.env.get('DEEPSEEK_KEY') ?? Deno.env.get('DEEPSEEK_KEY_1') ?? Deno.env.get('DEEPSEEK_KEY_2') ?? Deno.env.get('DEEPSEEK_KEY_3') ?? '';
      const openrouterSlotsConfigured = [1, 2, 3].filter(n => !!Deno.env.get(`OPENROUTER_KEY_${n}`)?.trim()).length;
      const groqSlotsConfigured = [1, 2, 3].filter(n => !!Deno.env.get(`GROQ_KEY_${n}`)?.trim()).length;
      const deepseekSlotsConfigured = [
        !!(Deno.env.get('DEEPSEEK_KEY') ?? Deno.env.get('DEEPSEEK_KEY_1'))?.trim(),
        !!Deno.env.get('DEEPSEEK_KEY_2')?.trim(),
        !!Deno.env.get('DEEPSEEK_KEY_3')?.trim(),
      ].filter(Boolean).length;
      const productionUrl = Deno.env.get('PRODUCTION_URL') ?? 'https://resume.thewise.cloud';

      // Detect dev environment.
      // Preferred signal: explicit WISE_ENV secret (set to 'production' or 'dev' as
      // a Supabase Edge Function secret). This is the source of truth and is set
      // out-of-band per environment.
      // Fallback (only when WISE_ENV is missing): deployed Supabase Edge Functions
      // currently set DENO_DEPLOYMENT_ID. This is an undocumented Deno Deploy
      // implementation detail and may break if Supabase changes runtimes — hence
      // it is only a backstop for environments where WISE_ENV has not yet been set.
      const wiseEnv = Deno.env.get('WISE_ENV')?.trim().toLowerCase();
      const isDevEnvironment = wiseEnv
        ? wiseEnv !== 'production'
        : !Deno.env.get('DENO_DEPLOYMENT_ID');

      // Source classifier — matches the frontend SecretItem.source contract.
      // - Bootstrap secrets (Supabase platform + DevKit gate) live in the Supabase vault in every environment.
      // - Provider/integration secrets live in the Supabase vault in production but in Replit env in dev.
      // - Anything else is informational only ('optional') so it doesn't inflate missingCount.
      const SUPABASE_VAULT_ALWAYS = new Set(['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'DEV_KIT_PASSWORD']);
      const ENV_DEPENDENT = new Set([
        'KINDE_DOMAIN',
        'OPENROUTER_KEY_1', 'OPENROUTER_KEY_2', 'OPENROUTER_KEY_3',
        'GROQ_KEY_1', 'GROQ_KEY_2', 'GROQ_KEY_3',
        'DEEPSEEK_KEY', 'DEEPSEEK_KEY_1', 'DEEPSEEK_KEY_2', 'DEEPSEEK_KEY_3',
        'RESEND_API_KEY',
        'GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO',
        'KINDE_WEBHOOK_SECRET', 'KINDE_M2M_CLIENT_ID', 'KINDE_M2M_CLIENT_SECRET',
        'ADMIN_EMAILS',
      ]);
      const classifySecretSource = (key: string): 'replit_env' | 'supabase_vault' | 'optional' => {
        if (SUPABASE_VAULT_ALWAYS.has(key)) return 'supabase_vault';
        if (ENV_DEPENDENT.has(key)) return isDevEnvironment ? 'replit_env' : 'supabase_vault';
        return 'optional';
      };

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600_000).toISOString();

      const [
        githubResult, productionSiteResult, openrouterPingResult, openrouter2PingResult, groqPingResult,
        deepseekPingResult, resendResult, dbResult, errorCountResult,
        errorsResult, auditActionsResult, secretsMetaResult,
      ] = await Promise.allSettled([
        (githubToken && githubOwner && githubRepo)
          ? checkGitHub(githubOwner, githubRepo, githubToken)
          : Promise.resolve({ ok: false, lastCommitAt: null, sha: null, branch: 'main' }),
        checkProductionSite(productionUrl),
        checkAIProvider('openrouter', 'https://openrouter.ai/api/v1/models?limit=1', openrouterKey),
        checkAIProvider('openrouter2', 'https://openrouter.ai/api/v1/models?limit=1', openrouterKey2),
        checkAIProvider('groq', 'https://api.groq.com/openai/v1/models', groqKey),
        checkAIProvider('deepseek', 'https://api.deepseek.com/v1/models', deepseekKey),
        checkResend(resendKey),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('error_log').select('id', { count: 'exact', head: true }).gte('created_at', oneHourAgo),
        supabase.from('error_log').select('id, message, context, created_at, level')
          .in('level', ['error', 'fatal']).order('created_at', { ascending: false }).limit(10),
        supabase.from('audit_logs')
          .select('id, action, category, metadata, created_at, user_id')
          .in('action', ['suspend', 'unsuspend', 'delete_user', 'merge_identity', 'credits_override', 'plan_change', 'trial_grant', 'trial_revoke'])
          .order('created_at', { ascending: false }).limit(10),
        supabase.from('app_settings').select('value').eq('key', 'secret_rotation_metadata').maybeSingle(),
      ]);

      const envChecks = REQUIRED_ENV_VARS.map(({ key, label }) => ({
        key, label, present: !!Deno.env.get(key),
      }));

      let secretsMeta: Record<string, { first_seen_at: string; last_rotated_at: string }> = {};
      if (secretsMetaResult.status === 'fulfilled' && secretsMetaResult.value.data?.value) {
        try { secretsMeta = JSON.parse(secretsMetaResult.value.data.value); } catch { /* ignore */ }
      }

      let metaChanged = false;
      for (const check of envChecks) {
        if (check.present && !secretsMeta[check.key]) {
          secretsMeta[check.key] = { first_seen_at: now.toISOString(), last_rotated_at: now.toISOString() };
          metaChanged = true;
        }
      }
      if (metaChanged) {
        await supabase.from('app_settings').upsert(
          { key: 'secret_rotation_metadata', value: JSON.stringify(secretsMeta) },
          { onConflict: 'key' },
        );
      }

      const secretsWithAge = envChecks.map((check) => {
        const meta = secretsMeta[check.key];
        const lastRotatedAt = meta?.last_rotated_at ?? meta?.first_seen_at ?? null;
        const daysSinceRotation = lastRotatedAt
          ? Math.floor((now.getTime() - new Date(lastRotatedAt).getTime()) / 86400000)
          : null;
        return {
          ...check, lastRotatedAt,
          stale: daysSinceRotation !== null && daysSinceRotation >= STALE_DAYS,
          daysSinceRotation,
          source: classifySecretSource(check.key),
        };
      });

      const github = githubResult.status === 'fulfilled' ? githubResult.value : { ok: false, lastCommitAt: null, sha: null, branch: 'main' };
      const prodSite = productionSiteResult.status === 'fulfilled' ? productionSiteResult.value : { up: false, httpStatus: 0 };
      const orPing = openrouterPingResult.status === 'fulfilled' ? openrouterPingResult.value : { provider: 'openrouter', ok: false, latencyMs: null, httpStatus: 0 };
      const or2Ping = openrouter2PingResult.status === 'fulfilled' ? openrouter2PingResult.value : { provider: 'openrouter2', ok: false, latencyMs: null, httpStatus: 0 };
      const groqPing = groqPingResult.status === 'fulfilled' ? groqPingResult.value : { provider: 'groq', ok: false, latencyMs: null, httpStatus: 0 };
      const deepseekPing = deepseekPingResult.status === 'fulfilled' ? deepseekPingResult.value : { provider: 'deepseek', ok: false, latencyMs: null, httpStatus: 0 };
      const emailStatus = resendResult.status === 'fulfilled' ? resendResult.value : { reachable: false, httpStatus: 0, sends24h: null };
      const dbOk = dbResult.status === 'fulfilled' && !dbResult.value.error;
      const dbError = dbResult.status === 'fulfilled' ? (dbResult.value.error?.message ?? null) : 'Check failed';
      const errorCount1h = errorCountResult.status === 'fulfilled' && !errorCountResult.value.error
        ? (errorCountResult.value.count ?? 0) : null;
      let recentErrors: unknown[] = [];
      if (errorsResult.status === 'fulfilled' && !errorsResult.value.error) recentErrors = errorsResult.value.data ?? [];
      let recentAdminActions: unknown[] = [];
      if (auditActionsResult.status === 'fulfilled' && !auditActionsResult.value.error) recentAdminActions = auditActionsResult.value.data ?? [];

      // Include OR2 in providerPings only when an OPENROUTER_KEY_2 is actually configured,
      // so the panel doesn't show a perpetual "OR2: unreachable" badge when the slot is unused.
      const providerPings = openrouterKey2
        ? [orPing, or2Ping, groqPing, deepseekPing]
        : [orPing, groqPing, deepseekPing];
      const anyProviderOk = providerPings.some(p => p.ok);
      const allProvidersOk = providerPings.filter(p =>
        (p.provider === 'openrouter' && !!openrouterKey) ||
        (p.provider === 'openrouter2' && !!openrouterKey2) ||
        (p.provider === 'groq' && !!groqKey) ||
        (p.provider === 'deepseek' && !!deepseekKey)
      ).every(p => p.ok);

      // Vault-presence flags drive the panel's degraded-but-OK ("yellow") state when
      // local pings fail but the keys are actually present in the Edge Function env.
      const aiKeysInVault = !!(openrouterKey || groqKey || deepseekKey);
      const emailKeyInVault = !!resendKey;

      return new Response(JSON.stringify({
        success: true,
        isDevEnvironment,
        checkedAt: now.toISOString(),
        deploy: {
          ok: github.ok, lastCommitAt: github.lastCommitAt, sha: github.sha, branch: github.branch,
          repoConfigured: !!(githubToken && githubOwner && githubRepo),
          repoUrl: (githubOwner && githubRepo) ? `https://github.com/${githubOwner}/${githubRepo}` : null,
          productionUrl, siteUp: prodSite.up, sitePingedAt: now.toISOString(), siteHttpStatus: prodSite.httpStatus,
        },
        ai: {
          providerPings, openrouterConfigured: openrouterSlotsConfigured > 0, openrouterSlotsConfigured,
          openrouter2Configured: !!openrouterKey2,
          groqConfigured: groqSlotsConfigured > 0, groqSlotsConfigured,
          deepseekConfigured: deepseekSlotsConfigured > 0, deepseekSlotsConfigured,
          anyProviderOk, allProvidersOk,
          keysInSupabaseVault: aiKeysInVault,
        },
        email: {
          resendKeyPresent: !!resendKey, reachable: emailStatus.reachable, httpStatus: emailStatus.httpStatus, sends24h: emailStatus.sends24h,
          keyInSupabaseVault: emailKeyInVault,
        },
        database: { ok: dbOk, error: dbError, errorCount1h },
        secrets: {
          items: secretsWithAge,
          // Match the panel's visible "missing secrets" list filter exactly
          // (MissionControlPanel.tsx line 578: !present && source === 'replit_env').
          // Vault-only secrets are not user-actionable from this UI, and 'optional'
          // ones are informational, so neither contributes to missingCount.
          missingCount: secretsWithAge.filter(s => !s.present && s.source === 'replit_env').length,
          staleCount: secretsWithAge.filter(s => s.stale).length,
        },
        recentErrors, recentAdminActions,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (err) {
      return new Response(
        JSON.stringify({ success: false, error: String(err) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  }

  // ── ACTION: github-status ─────────────────────────────────────────────────
  if (action === 'github-status') {
    try {
      try {
        await requireAdminAuth(req);
      } catch (authErr) {
        if (authErr instanceof Response) return authErr;
        throw authErr;
      }

      const githubToken = Deno.env.get('GITHUB_TOKEN');
      const githubOwner = Deno.env.get('GITHUB_OWNER');
      const githubRepo = Deno.env.get('GITHUB_REPO');

      if (!githubToken) {
        return new Response(
          JSON.stringify({ success: false, error: 'GITHUB_TOKEN secret is not configured in Supabase Edge Function Secrets.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      if (!githubOwner || !githubRepo) {
        return new Response(
          JSON.stringify({ success: false, error: 'GITHUB_OWNER and GITHUB_REPO secrets must be set in Supabase Edge Function Secrets.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const apiUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/commits?per_page=5`;
      const resp = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'WiseResume-DevKit/1.0',
        },
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return new Response(
          JSON.stringify({
            success: false,
            error: `GitHub API error ${resp.status}: ${errText.slice(0, 200)}\n\nAttempted URL: ${apiUrl}\n\nCheck that GITHUB_OWNER ("${githubOwner}") and GITHUB_REPO ("${githubRepo}") match your actual GitHub repository URL.`,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const rawCommits = await resp.json() as GitHubCommitResponse[];
      const commits = rawCommits.map((c) => ({
        sha: c.sha,
        message: (c.commit?.message ?? '').split('\n')[0],
        author: c.commit?.author?.name ?? c.author?.login ?? 'Unknown',
        timestamp: c.commit?.author?.date ?? '',
        url: c.html_url ?? '',
      }));

      return new Response(
        JSON.stringify({ success: true, commits, repoUrl: `https://github.com/${githubOwner}/${githubRepo}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ success: false, error: String(err) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  }

  return new Response(
    JSON.stringify({ success: false, error: `Unknown action: ${action}. Valid values: analytics | observability | live-activity | mission-control | github-status` }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}));
