import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Fail closed if password env is not configured — no default fallback
  const SECRET_PASSWORD = Deno.env.get('DEV_KIT_PASSWORD');
  if (!SECRET_PASSWORD) {
    console.error('[admin-list-users] DEV_KIT_PASSWORD env var is not set');
    return new Response(
      JSON.stringify({ success: false, error: 'Admin functions are not configured' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { password, page = 1, per_page = 50 } = body;

    if (!password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password !== SECRET_PASSWORD) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hard cap at 100 rows per page
    const limit = Math.min(Math.max(1, Number(per_page) || 50), 100);
    const offset = Math.max(0, (Number(page) - 1) * limit);

    const supabase = getServiceClient();

    // Calls service-role-only get_all_users_admin RPC
    const { data, error } = await supabase.rpc('get_all_users_admin', {
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.error('[admin-list-users] RPC error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[admin-list-users] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
