import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAuth, AuthError, authErrorResponse } from '../_shared/authMiddleware.ts';

function json(data: unknown, status = 200, cors: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const cors = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const { userId } = await requireAuth(req);
    const supabase = getServiceClient();

    // HR guard
    const { data: hrProfile } = await supabase
      .from('profiles')
      .select('account_type')
      .eq('user_id', userId)
      .single();

    if (hrProfile?.account_type !== 'hr') {
      return json({ error: 'WiseHire HR account required' }, 403, cors);
    }

    const { profile_id } = await req.json();
    if (!profile_id) {
      return json({ error: 'profile_id required' }, 400, cors);
    }

    // Verify profile exists and is opted in
    const { data: tp, error: tpErr } = await supabase
      .from('talent_pool_profiles')
      .select('id, user_id, opted_in, view_count')
      .eq('id', profile_id)
      .single();

    if (tpErr || !tp || !tp.opted_in) {
      return json({ error: 'Profile not found or not discoverable' }, 404, cors);
    }

    // Get viewer's company id
    const { data: company } = await supabase
      .from('wisehire_companies')
      .select('id')
      .eq('owner_id', userId)
      .single();

    // Record view
    await supabase.from('talent_pool_views').insert({
      profile_id,
      viewer_company_id: company?.id ?? null,
    });

    // Increment view_count (try RPC first, fallback to manual increment)
    const { error: rpcErr } = await supabase.rpc('increment_talent_view_count', { p_profile_id: profile_id });
    if (rpcErr) {
      await supabase
        .from('talent_pool_profiles')
        .update({ view_count: (tp.view_count ?? 0) + 1, last_viewed_at: new Date().toISOString() })
        .eq('id', profile_id);
    }

    return json({ ok: true }, 200, cors);
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin);
    console.error('[wisehire-talent-view]', err);
    return json({ error: 'Internal error' }, 500, getCorsHeaders(origin));
  }
});
