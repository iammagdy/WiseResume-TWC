import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { target_user_id } = body as { target_user_id?: string };

    try {
      await requireAdminAuth(req);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    if (!target_user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'target_user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getServiceClient();

    // Fetch auth.users record
    const { data: authData, error: authErr } = await supabase.auth.admin.getUserById(target_user_id);
    const authEmail = authData?.user?.email ?? null;
    const isCollision = (authEmail ?? '').endsWith('@collision.kinde.placeholder');

    // Fetch profile contact_email
    const { data: profileData } = await supabase
      .from('profiles')
      .select('contact_email, full_name, avatar_url')
      .eq('user_id', target_user_id)
      .maybeSingle();

    const contactEmail = (profileData as Record<string, unknown> | null)?.contact_email as string | null ?? null;

    // Fetch most recent kinde_sub from token_exchanges
    const { data: exchangeData } = await supabase
      .from('token_exchanges')
      .select('kinde_sub, created_at, status')
      .eq('user_id', target_user_id)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const kindeSub = (exchangeData as Record<string, unknown> | null)?.kinde_sub as string | null ?? null;
    const lastExchangeAt = (exchangeData as Record<string, unknown> | null)?.created_at as string | null ?? null;

    return new Response(
      JSON.stringify({
        success: true,
        user_id: target_user_id,
        auth_email: authEmail,
        contact_email: contactEmail,
        kinde_sub: kindeSub,
        last_exchange_at: lastExchangeAt,
        is_collision: isCollision,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[admin-get-identity] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
