import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
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
          supabase
            .from('usage_events')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user_id)
            .ilike('event_type', 'ai_%')
            .gte('created_at', thirtyDaysAgo),
          supabase
            .from('audit_logs')
            .select('action, metadata, created_at')
            .eq('user_id', user_id)
            .in('action', ['plan_change', 'trial_grant', 'trial_revoke'])
            .order('created_at', { ascending: false })
            .limit(10),
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
});
