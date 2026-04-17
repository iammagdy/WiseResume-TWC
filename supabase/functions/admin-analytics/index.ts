import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

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
  const end = new Date(now.getTime() + 60_000); // small upper-bound padding
  if (range === 'today') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(Date.UTC(
      startOfToday.getUTCFullYear(),
      startOfToday.getUTCMonth(),
      startOfToday.getUTCDate(),
    ));
    return {
      start,
      end,
      prevStart: new Date(start.getTime() - DAY_MS),
      prevEnd: start,
      bucket: 'hour',
      bucketCount: 24,
    };
  }
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365 * 3;
  const start = new Date(end.getTime() - days * DAY_MS);
  if (range === 'all') {
    return { start: new Date('2024-01-01T00:00:00Z'), end, prevStart: null, prevEnd: null, bucket: 'day', bucketCount: 0 };
  }
  return {
    start,
    end,
    prevStart: new Date(start.getTime() - days * DAY_MS),
    prevEnd: start,
    bucket: 'day',
    bucketCount: days,
  };
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function hourKey(d: Date): string {
  return d.toISOString().slice(0, 13) + ':00';
}

function buildEmptyDailySeries(start: Date, end: Date): { date: string; value: number }[] {
  const out: { date: string; value: number }[] = [];
  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  for (let t = startUtc; t <= endUtc; t += DAY_MS) {
    out.push({ date: new Date(t).toISOString().slice(0, 10), value: 0 });
  }
  return out;
}
function buildEmptyHourlySeries(start: Date, end: Date): { date: string; value: number }[] {
  const out: { date: string; value: number }[] = [];
  const startH = new Date(Date.UTC(
    start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), start.getUTCHours(),
  ));
  for (let t = startH.getTime(); t <= end.getTime(); t += 3_600_000) {
    out.push({ date: new Date(t).toISOString().slice(0, 13) + ':00', value: 0 });
  }
  return out;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { password, range: rawRange } = body as { password: string; range?: Range };
    const range: Range = (['today', '7d', '30d', '90d', 'all'] as const).includes(rawRange as Range)
      ? (rawRange as Range)
      : '7d';

    try {
      await requireAdminAuth(req, password);
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

    // WAU window for stickiness: last 7 days regardless of selected range
    const wauStart = new Date(Date.now() - 7 * DAY_MS);
    const dauStart = new Date(Date.now() - DAY_MS);

    const [
      // Existing fields (back-compat)
      allEventsResult,
      todayEventsResult,
      yesterdayEventsResult,
      featureEventsResult,
      portfolioEventsResult,
      signupProfilesResult,
      aiTodayResult,
      aiYesterdayResult,
      countryResult,
      // New: range-driven
      activityDailyResult,
      activityHourlyResult,
      dowHourResult,
      topFeaturesTrendResult,
      newReturningResult,
      referrersResult,
      devicesResult,
      // Stickiness DAU/WAU
      dauResult,
      wauResult,
      // Previous-period totals for KPI deltas
      prevTotalsEventsResult,
      prevTotalsAiResult,
      prevTotalsPortfolioResult,
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
      supabase.from('profiles').select('country').not('country', 'is', null).limit(2000),
      // Range-driven
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
      // DAU / WAU
      supabase.rpc('get_distinct_active_users', { p_start: dauStart.toISOString(), p_end: new Date().toISOString() }),
      supabase.rpc('get_distinct_active_users', { p_start: wauStart.toISOString(), p_end: new Date().toISOString() }),
      // Previous-period totals
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

    // ── Existing back-compat fields ────────────────────────────────────────
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

    const countryRows = (countryResult.data ?? []) as { country: string | null }[];
    const countryCounts: Record<string, number> = {};
    for (const row of countryRows) {
      if (row.country) countryCounts[row.country] = (countryCounts[row.country] || 0) + 1;
    }
    const countryDistribution = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([country, count]) => ({ country, count }));

    // ── Range-driven series ────────────────────────────────────────────────
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

    // 7-day rolling avg of DAU (only meaningful for daily buckets)
    const dauRollingSeries = activitySeries.map((point, idx, arr) => {
      if (win.bucket !== 'day') return { date: point.date, value: point.users };
      const w = arr.slice(Math.max(0, idx - 6), idx + 1);
      const avg = w.reduce((s, p) => s + p.users, 0) / w.length;
      return { date: point.date, value: Math.round(avg * 10) / 10 };
    });

    // Day-of-week × hour heatmap
    type DowHourRow = { dow: number; hod: number; total: number };
    const heatRows = (dowHourResult.data ?? []) as DowHourRow[];
    const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const r of heatRows) {
      if (r.dow >= 0 && r.dow < 7 && r.hod >= 0 && r.hod < 24) {
        heatmap[r.dow][r.hod] = Number(r.total);
      }
    }

    // Top features with trend
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

    // New vs returning
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

    // Referrers, devices
    const referrerRows = (referrersResult.data ?? []) as { referrer: string; count: number }[];
    const topReferrers = referrerRows.map(r => ({ name: r.referrer, count: Number(r.count) }));
    const deviceRows = (devicesResult.data ?? []) as { device: string; count: number }[];
    const deviceBreakdown = deviceRows.map(r => ({ name: r.device, count: Number(r.count) }));

    // Stickiness DAU/WAU
    const dauNow = Number(dauResult.data ?? 0);
    const wauNow = Number(wauResult.data ?? 0);
    const stickiness = wauNow > 0 ? Math.round((dauNow / wauNow) * 1000) / 10 : 0;

    // Range KPI totals + previous-period
    const rangeViews = activitySeries.reduce((s, p) => s + p.views, 0);
    const rangeActiveUsers = win.bucket === 'day'
      ? new Set<string>().size // placeholder; we re-derive properly via fetched value below
      : activitySeries.reduce((max, p) => Math.max(max, p.users), 0);
    // For the range "active users" KPI we use a single distinct count over the full window
    const rangeActiveUsersResult = await supabase.rpc('get_distinct_active_users', {
      p_start: win.start.toISOString(),
      p_end: win.end.toISOString(),
    });
    const rangeActiveUsersValue = Number(rangeActiveUsersResult.data ?? rangeActiveUsers);

    const prevRangeViews = (prevTotalsEventsResult as { count: number | null }).count ?? 0;
    const prevAiRows = (prevTotalsAiResult.data ?? []) as { daily_usage: number | null }[];
    const prevAiCredits = prevAiRows.reduce((s, r) => s + (r.daily_usage ?? 0), 0);
    const prevPortfolioViews = (prevTotalsPortfolioResult as { count: number | null }).count ?? 0;

    // Range AI credits sum + portfolio visits sum (in window)
    const [rangeAiResult, rangePortfolioResult] = await Promise.all([
      supabase.from('ai_credits').select('daily_usage, usage_date')
        .gte('usage_date', win.start.toISOString().slice(0, 10))
        .lt('usage_date', win.end.toISOString().slice(0, 10) + 'T23:59:59'),
      supabase.from('portfolio_visits').select('id', { count: 'exact', head: true })
        .gte('visited_at', win.start.toISOString()).lt('visited_at', win.end.toISOString()),
    ]);
    const rangeAiCredits = ((rangeAiResult.data ?? []) as { daily_usage: number | null }[])
      .reduce((s, r) => s + (r.daily_usage ?? 0), 0);
    const rangePortfolioViews = (rangePortfolioResult as { count: number | null }).count ?? 0;

    // Previous-period range active users
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
          // Back-compat (do not remove)
          pageViewsAllTime,
          pageViewsToday,
          activeUsersToday,
          activeUsersYesterday,
          topFeatures,
          portfolioViewsTotal,
          signupsLast14Days,
          aiCreditsToday,
          aiCreditsYesterday,
          countryDistribution,
          // New range-driven payload
          range,
          bucket: win.bucket,
          rangeKpis: {
            views: { current: rangeViews, previous: prevRangeViews },
            activeUsers: { current: rangeActiveUsersValue, previous: prevRangeActiveUsers },
            aiCredits: { current: rangeAiCredits, previous: prevAiCredits },
            portfolioViews: { current: rangePortfolioViews, previous: prevPortfolioViews },
            stickiness, // DAU/WAU as percentage (e.g. 23.4)
            dau: dauNow,
            wau: wauNow,
          },
          activitySeries,         // [{ date, views, users }]
          dauRollingSeries,       // [{ date, value }]
          newVsReturning,         // [{ date, newUsers, returningUsers }] (daily only)
          heatmap,                // 7×24 number[][] (UTC dow×hour)
          topFeaturesRanged,      // [{ name, count, trend: [{date, value}] }]
          topReferrers,           // [{ name, count }]
          deviceBreakdown,        // [{ name, count }]
          countryRanking: countryDistribution, // already sorted desc
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
});
