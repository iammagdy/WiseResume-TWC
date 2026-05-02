import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAuth, AuthError, authErrorResponse } from '../_shared/authMiddleware.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
function json(data: unknown, status = 200, cors: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(wrapHandler("wisehire-talent-view", async (req) => {
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
      .maybeSingle();

    if (hrProfile?.account_type !== 'hr') {
      return json({ error: 'WiseHire HR account required' }, 403, cors);
    }

    // Resolve profiles.id (PK) for FK joins (wisehire_* tables FK to profiles.id, not user_id)
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    const profileId = profileRow?.id ?? userId;

    const { profile_id } = await req.json();
    if (!profile_id) {
      return json({ error: 'profile_id required' }, 400, cors);
    }

    // Verify profile exists and is opted in
    const { data: tp, error: tpErr } = await supabase
      .from('talent_pool_profiles')
      .select('id, user_id, opted_in, view_count')
      .eq('id', profile_id)
      .maybeSingle();

    if (tpErr || !tp || !tp.opted_in) {
      return json({ error: 'Profile not found or not discoverable' }, 404, cors);
    }

    // Get viewer's company id
    const { data: company } = await supabase
      .from('wisehire_companies')
      .select('id')
      .eq('owner_id', profileId)
      .maybeSingle();

    // Record view
    await supabase.from('talent_pool_views').insert({
      profile_id,
      viewer_company_id: company?.id ?? null,
    });

    // Atomically increment view_count via RPC. If the RPC fails we log it and
    // continue — the view is still recorded in talent_pool_views above. We
    // intentionally do NOT fall back to a non-atomic read-modify-write update
    // here, which would silently lose concurrent increments under load.
    const { error: rpcErr } = await supabase.rpc('increment_talent_view_count', { p_profile_id: profile_id });
    if (rpcErr) {
      console.error('[wisehire-talent-view] increment_talent_view_count RPC failed:', rpcErr.message);
    }

    return json({ ok: true }, 200, cors);
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin);
    console.error('[wisehire-talent-view]', err);
    return json({ error: 'Internal error' }, 500, getCorsHeaders(origin));
  }
}));
