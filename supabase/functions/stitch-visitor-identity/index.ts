/**
 * stitch-visitor-identity — called after login to link pre-auth visitor_events
 * rows (where user_id IS NULL) to the now-known authenticated user.
 *
 * Auth: Supabase JWT (extracted from Authorization header).
 * Body: { anon_id: string }
 */
import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';
import * as jose from 'npm:jose@5.2.2';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(wrapHandler('stitch-visitor-identity', async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Extract user_id from Supabase JWT
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let userId: string;
  try {
    const token = authHeader.slice(7);
    // Decode without verifying — service role will recheck via supabase.auth
    const claims = jose.decodeJwt(token);
    const sub = claims.sub as string | undefined;
    if (!sub || !UUID_RE.test(sub)) throw new Error('invalid sub');
    userId = sub;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { anon_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const anonId = body.anon_id;
  if (!anonId || !UUID_RE.test(anonId)) {
    return new Response(JSON.stringify({ error: 'Invalid anon_id' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = getServiceClient();
  const { count, error } = await supabase
    .from('visitor_events')
    .update({ user_id: userId })
    .eq('anon_id', anonId)
    .is('user_id', null)
    .select('id', { count: 'exact', head: true });

  if (error) {
    console.error('[stitch-visitor-identity] update error:', error);
    return new Response(JSON.stringify({ error: 'DB error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, stitched: count ?? 0 }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}));
