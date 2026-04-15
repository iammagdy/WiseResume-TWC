import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAuthUser } from '../_shared/authMiddleware.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const user = await getAuthUser(req);
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // HR guard
    const { data: hrProfile } = await supabase
      .from('profiles')
      .select('account_type')
      .eq('user_id', user.id)
      .single();

    if (hrProfile?.account_type !== 'hr') {
      return new Response(JSON.stringify({ error: 'WiseHire HR account required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { profile_id } = await req.json();
    if (!profile_id) {
      return new Response(JSON.stringify({ error: 'profile_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify profile exists and is opted in
    const { data: tp, error: tpErr } = await supabase
      .from('talent_pool_profiles')
      .select('id, user_id, opted_in')
      .eq('id', profile_id)
      .single();

    if (tpErr || !tp || !tp.opted_in) {
      return new Response(JSON.stringify({ error: 'Profile not found or not discoverable' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get viewer's company id
    const { data: company } = await supabase
      .from('wisehire_companies')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    // Record view
    await supabase.from('talent_pool_views').insert({
      profile_id,
      viewer_company_id: company?.id ?? null,
    });

    // Increment view count + update last_viewed_at
    await supabase
      .from('talent_pool_profiles')
      .update({ view_count: supabase.rpc ? undefined : undefined, last_viewed_at: new Date().toISOString() })
      .eq('id', profile_id);

    // Use raw SQL increment for view_count
    await supabase.rpc('increment_talent_view_count', { p_profile_id: profile_id }).catch(() => {
      // RPC may not exist; fallback: fetch + update
      return supabase
        .from('talent_pool_profiles')
        .select('view_count')
        .eq('id', profile_id)
        .single()
        .then(({ data }) => {
          return supabase
            .from('talent_pool_profiles')
            .update({ view_count: (data?.view_count ?? 0) + 1, last_viewed_at: new Date().toISOString() })
            .eq('id', profile_id);
        });
    });

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[wisehire-talent-view]', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
