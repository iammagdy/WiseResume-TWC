import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdminAuth } from '../_shared/adminAuth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { password } = body as { password: string };

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

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();

    const [
      allEventsResult,
      todayEventsResult,
      yesterdayEventsResult,
      featureEventsResult,
      portfolioEventsResult,
      signupProfilesResult,
      aiTodayResult,
      aiYesterdayResult,
      countryResult,
    ] = await Promise.all([
      supabase.from('usage_events').select('id', { count: 'exact', head: true }),
      // Fix: filter user_id IS NOT NULL at DB level so anonymous events don't inflate the count
      supabase.from('usage_events').select('id, user_id', { count: 'exact' })
        .gte('created_at', `${today}T00:00:00Z`)
        .lt('created_at', `${today}T23:59:59Z`)
        .not('user_id', 'is', null),
      supabase.from('usage_events').select('id, user_id', { count: 'exact' })
        .gte('created_at', `${yesterday}T00:00:00Z`)
        .lt('created_at', `${yesterday}T23:59:59Z`)
        .not('user_id', 'is', null),
      // Fix: use server-side GROUP BY aggregation instead of downloading up to 2000 rows
      supabase.rpc('get_top_feature_events', { top_n: 10 }),
      supabase.from('portfolio_visits').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('created_at')
        .gte('created_at', fourteenDaysAgo)
        .order('created_at', { ascending: true }),
      supabase.from('ai_credits').select('daily_usage, usage_date')
        .eq('usage_date', today),
      supabase.from('ai_credits').select('daily_usage, usage_date')
        .eq('usage_date', yesterday),
      supabase.from('profiles').select('country').not('country', 'is', null).limit(1000),
    ]);

    const pageViewsAllTime = allEventsResult.count ?? 0;
    const pageViewsToday = todayEventsResult.count ?? 0;

    const todayEventRows = (todayEventsResult.data ?? []) as { id: string; user_id: string }[];
    const yesterdayEventRows = (yesterdayEventsResult.data ?? []) as { id: string; user_id: string }[];
    const activeUsersToday = new Set(todayEventRows.map(e => e.user_id)).size;
    const activeUsersYesterday = new Set(yesterdayEventRows.map(e => e.user_id)).size;

    // featureEventsResult is now pre-aggregated { event_type, count } rows from the RPC
    const featureRows = (featureEventsResult.data ?? []) as { event_type: string; count: number }[];
    const topFeatures = featureRows.map(row => ({
      name: row.event_type ?? 'unknown',
      count: Number(row.count),
    }));

    const portfolioViewsTotal = portfolioEventsResult.count ?? 0;

    const signupByDay: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
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
    const aiCreditsToday = aiTodayRows.reduce((sum, r) => sum + (r.daily_usage ?? 0), 0);
    const aiCreditsYesterday = aiYesterdayRows.reduce((sum, r) => sum + (r.daily_usage ?? 0), 0);

    const countryRows = (countryResult.data ?? []) as { country: string | null }[];
    const countryCounts: Record<string, number> = {};
    for (const row of countryRows) {
      if (row.country) {
        countryCounts[row.country] = (countryCounts[row.country] || 0) + 1;
      }
    }
    const countryDistribution = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([country, count]) => ({ country, count }));

    return new Response(
      JSON.stringify({
        success: true,
        data: {
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
