import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, authErrorResponse, decodeJwtPayload } from '../_shared/authMiddleware.ts';

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, client } = await requireAuth(req);

    // Extract kinde_sub from JWT claims if present
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    let kindeSub: string | null = null;
    try {
      const claims = decodeJwtPayload(token);
      kindeSub = (claims.kinde_sub as string) || null;
    } catch { /* ignore */ }

    // Fetch profile and preferences in parallel
    const [profileResult, prefsResult] = await Promise.all([
      client.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      client.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    return new Response(
      JSON.stringify({
        userId,
        kinde_sub: kindeSub,
        profile: profileResult.data || null,
        preferences: prefsResult.data || null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return authErrorResponse(err, origin);
  }
});
