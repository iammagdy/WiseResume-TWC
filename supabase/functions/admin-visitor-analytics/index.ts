/**
 * admin-visitor-analytics — read-only analytics backend for the DevKit
 * Visitors panel. All queries read from visitor_events using service-role.
 *
 * Auth: requireAdminAuth (DevKit session token).
 * Dispatch: POST { action, ...params }
 * Actions:
 *   kpis         — total/unique visits, new vs returning, top country, device/browser split
 *   country-dist — visit count per country for the map choropleth
 *   device-dist  — device type breakdown
 *   browser-dist — browser breakdown
 *   top-pages    — ranked page paths with visit count
 *   click-targets— ranked click targets, optionally filtered by page
 *   sections     — section_view counts ranked by views
 *   sessions     — paginated session list sorted by recency
 *   journey      — all events for a given anon_id or session_id
 *   cohort       — pages visited before signup for converting visitors
 */
import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';

type Range = 'today' | '7d' | '30d' | '90d';
const DAY_MS = 86_400_000;

function rangeStart(range: Range): string {
  const now = new Date();
  const todayMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (range === 'today') return todayMidnight.toISOString();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return new Date(todayMidnight.getTime() - days * DAY_MS).toISOString();
}

function validRange(r: unknown): Range {
  if (r === 'today' || r === '7d' || r === '30d' || r === '90d') return r;
  return '7d';
}

Deno.serve(wrapHandler('admin-visitor-analytics', async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await requireAdminAuth(req);
  } catch (authErr) {
    if (authErr instanceof Response) return authErr;
    throw authErr;
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch { /* ok */ }

  const action = body.action as string | undefined;
  const range = validRange(body.range);
  const start = rangeStart(range);
  const supabase = getServiceClient();

  // ── kpis ──────────────────────────────────────────────────────────────────
  if (action === 'kpis') {
    const [
      totalVisitsResult,
      uniqueVisitorsResult,
      newVsReturningResult,
      topCountryResult,
      deviceResult,
      browserResult,
      todayTotalResult,
      todayUniqueResult,
    ] = await Promise.all([
      // Total page_views in range
      supabase.from('visitor_events')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'page_view')
        .gte('created_at', start),
      // Unique anon_ids in range
      supabase.rpc('count_distinct_visitor_anon_ids', { p_start: start }),
      // New vs returning: new = first ever seen in range, returning = seen before
      supabase.rpc('visitor_new_vs_returning', { p_start: start }),
      // Top country
      supabase.from('visitor_events')
        .select('country')
        .eq('event_type', 'page_view')
        .gte('created_at', start)
        .not('country', 'is', null),
      // Device distribution
      supabase.from('visitor_events')
        .select('device_type')
        .eq('event_type', 'page_view')
        .gte('created_at', start)
        .not('device_type', 'is', null),
      // Browser distribution
      supabase.from('visitor_events')
        .select('browser')
        .eq('event_type', 'page_view')
        .gte('created_at', start)
        .not('browser', 'is', null),
      // Today visits
      supabase.from('visitor_events')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'page_view')
        .gte('created_at', rangeStart('today')),
      // Today unique
      supabase.rpc('count_distinct_visitor_anon_ids', { p_start: rangeStart('today') }),
    ]);

    // Aggregate country
    const countryCounts = new Map<string, number>();
    for (const row of (totalVisitsResult.data ?? []) as { country?: string }[]) {
      if (row.country) countryCounts.set(row.country, (countryCounts.get(row.country) ?? 0) + 1);
    }
    // Use raw device/browser rows
    const deviceRows = (deviceResult.data ?? []) as { device_type: string }[];
    const browserRows = (browserResult.data ?? []) as { browser: string }[];

    const countMap = <T extends Record<string, string>>(rows: T[], key: keyof T): Record<string, number> => {
      const m: Record<string, number> = {};
      for (const r of rows) {
        const v = r[key] as string;
        if (v) m[v] = (m[v] ?? 0) + 1;
      }
      return m;
    };

    const deviceMap = countMap(deviceRows, 'device_type');
    const browserMap = countMap(browserRows, 'browser');

    const topCountryRaw = (topCountryResult.data ?? []) as { country: string }[];
    const topCMap: Record<string, number> = {};
    for (const r of topCountryRaw) topCMap[r.country] = (topCMap[r.country] ?? 0) + 1;
    const topCountryEntry = Object.entries(topCMap).sort((a, b) => b[1] - a[1])[0];

    const totalDevices = Object.values(deviceMap).reduce((s, v) => s + v, 0) || 1;
    const mobilePct = Math.round(((deviceMap.mobile ?? 0) / totalDevices) * 100);
    const desktopPct = Math.round(((deviceMap.desktop ?? 0) / totalDevices) * 100);

    return new Response(JSON.stringify({
      success: true,
      data: {
        totalVisitsToday: todayTotalResult.count ?? 0,
        uniqueVisitorsToday: Number(todayUniqueResult.data ?? 0),
        totalVisits: totalVisitsResult.count ?? 0,
        uniqueVisitors: Number(uniqueVisitorsResult.data ?? 0),
        newVisitors: Number((newVsReturningResult.data as { new_visitors?: number } | null)?.new_visitors ?? 0),
        returningVisitors: Number((newVsReturningResult.data as { returning_visitors?: number } | null)?.returning_visitors ?? 0),
        topCountry: topCountryEntry ? topCountryEntry[0] : null,
        topCountryCount: topCountryEntry ? topCountryEntry[1] : 0,
        mobilePct,
        desktopPct,
        deviceBreakdown: Object.entries(deviceMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        browserBreakdown: Object.entries(browserMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      },
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // ── country-dist ──────────────────────────────────────────────────────────
  if (action === 'country-dist') {
    const { data } = await supabase
      .from('visitor_events')
      .select('country')
      .eq('event_type', 'page_view')
      .gte('created_at', start)
      .not('country', 'is', null);

    const map: Record<string, number> = {};
    for (const r of (data ?? []) as { country: string }[]) {
      map[r.country] = (map[r.country] ?? 0) + 1;
    }
    const dist = Object.entries(map)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);

    return new Response(JSON.stringify({ success: true, data: dist }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── top-pages ─────────────────────────────────────────────────────────────
  if (action === 'top-pages') {
    const { data } = await supabase
      .from('visitor_events')
      .select('page, session_id')
      .eq('event_type', 'page_view')
      .gte('created_at', start)
      .not('page', 'is', null)
      .limit(2000);

    const pageMap: Record<string, { visits: number; sessions: Set<string> }> = {};
    for (const r of (data ?? []) as { page: string; session_id: string }[]) {
      if (!pageMap[r.page]) pageMap[r.page] = { visits: 0, sessions: new Set() };
      pageMap[r.page].visits++;
      pageMap[r.page].sessions.add(r.session_id);
    }
    const pages = Object.entries(pageMap)
      .map(([page, v]) => ({ name: page, count: v.visits, sessions: v.sessions.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return new Response(JSON.stringify({ success: true, data: pages }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── click-targets ─────────────────────────────────────────────────────────
  if (action === 'click-targets') {
    const pageFilter = typeof body.page === 'string' ? body.page : null;
    let query = supabase
      .from('visitor_events')
      .select('target, page')
      .eq('event_type', 'click')
      .gte('created_at', start)
      .not('target', 'is', null)
      .limit(2000);
    if (pageFilter) query = query.eq('page', pageFilter);

    const { data } = await query;
    const map: Record<string, number> = {};
    for (const r of (data ?? []) as { target: string; page: string }[]) {
      const key = r.target;
      map[key] = (map[key] ?? 0) + 1;
    }
    const targets = Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);

    return new Response(JSON.stringify({ success: true, data: targets }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── sections ──────────────────────────────────────────────────────────────
  if (action === 'sections') {
    const { data } = await supabase
      .from('visitor_events')
      .select('section, anon_id')
      .eq('event_type', 'section_view')
      .gte('created_at', start)
      .not('section', 'is', null)
      .limit(2000);

    const map: Record<string, { views: number; visitors: Set<string> }> = {};
    for (const r of (data ?? []) as { section: string; anon_id: string }[]) {
      if (!map[r.section]) map[r.section] = { views: 0, visitors: new Set() };
      map[r.section].views++;
      map[r.section].visitors.add(r.anon_id);
    }
    const sections = Object.entries(map)
      .map(([name, v]) => ({ name, count: v.views, uniqueVisitors: v.visitors.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return new Response(JSON.stringify({ success: true, data: sections }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── sessions ──────────────────────────────────────────────────────────────
  if (action === 'sessions') {
    const page = typeof body.page_num === 'number' ? body.page_num : 0;
    const limit = 20;
    const offset = page * limit;

    const { data } = await supabase
      .from('visitor_events')
      .select('session_id, anon_id, user_id, country, device_type, browser, created_at, page, event_type')
      .gte('created_at', start)
      .order('created_at', { ascending: false })
      .limit(2000);

    // Group by session_id
    const sessionMap = new Map<string, {
      anon_id: string;
      user_id: string | null;
      country: string | null;
      device_type: string | null;
      browser: string | null;
      firstSeen: string;
      lastSeen: string;
      pageCount: number;
      eventCount: number;
    }>();

    for (const r of (data ?? []) as {
      session_id: string; anon_id: string; user_id: string | null;
      country: string | null; device_type: string | null; browser: string | null;
      created_at: string; page: string | null; event_type: string;
    }[]) {
      const existing = sessionMap.get(r.session_id);
      if (!existing) {
        sessionMap.set(r.session_id, {
          anon_id: r.anon_id,
          user_id: r.user_id,
          country: r.country,
          device_type: r.device_type,
          browser: r.browser,
          firstSeen: r.created_at,
          lastSeen: r.created_at,
          pageCount: r.event_type === 'page_view' ? 1 : 0,
          eventCount: 1,
        });
      } else {
        if (r.created_at < existing.firstSeen) existing.firstSeen = r.created_at;
        if (r.created_at > existing.lastSeen) existing.lastSeen = r.created_at;
        if (r.event_type === 'page_view') existing.pageCount++;
        existing.eventCount++;
        if (!existing.user_id && r.user_id) existing.user_id = r.user_id;
      }
    }

    const sessions = Array.from(sessionMap.entries())
      .map(([session_id, v]) => ({
        session_id,
        ...v,
        durationSeconds: Math.round(
          (new Date(v.lastSeen).getTime() - new Date(v.firstSeen).getTime()) / 1000,
        ),
      }))
      .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));

    return new Response(JSON.stringify({
      success: true,
      data: {
        sessions: sessions.slice(offset, offset + limit),
        total: sessions.length,
        page,
      },
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // ── journey ───────────────────────────────────────────────────────────────
  if (action === 'journey') {
    const anonId    = typeof body.anon_id === 'string' ? body.anon_id : null;
    const sessionId = typeof body.session_id === 'string' ? body.session_id : null;

    if (!anonId && !sessionId) {
      return new Response(JSON.stringify({ success: false, error: 'anon_id or session_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let query = supabase
      .from('visitor_events')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(500);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    } else {
      query = query.eq('anon_id', anonId!);
    }

    const { data } = await query;

    return new Response(JSON.stringify({ success: true, data: data ?? [] }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── cohort ────────────────────────────────────────────────────────────────
  if (action === 'cohort') {
    // Visitors who eventually signed up: find anon_ids that have both
    // page_views and a user_id (meaning they were stitched post-auth).
    const { data } = await supabase
      .from('visitor_events')
      .select('page, anon_id, user_id')
      .gte('created_at', start)
      .eq('event_type', 'page_view')
      .not('user_id', 'is', null)
      .limit(2000);

    const pageMap: Record<string, number> = {};
    for (const r of (data ?? []) as { page: string; anon_id: string; user_id: string }[]) {
      if (r.page) pageMap[r.page] = (pageMap[r.page] ?? 0) + 1;
    }
    const cohort = Object.entries(pageMap)
      .map(([page, count]) => ({ name: page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return new Response(JSON.stringify({ success: true, data: cohort }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── live-count ────────────────────────────────────────────────────────────
  // Unique sessions with at least one event in the last 5 minutes.
  // Used by Mission Control for the "Live Visitors" KPI card (polls every 30s).
  if (action === 'live-count') {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('visitor_events')
      .select('session_id')
      .gte('created_at', fiveMinutesAgo);
    const liveCount = new Set((data ?? []).map((r: { session_id: string }) => r.session_id)).size;

    return new Response(JSON.stringify({ success: true, data: { liveCount } }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}));
