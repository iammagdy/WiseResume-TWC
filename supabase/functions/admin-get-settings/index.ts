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
    try {
      await requireAdminAuth(req);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value, updated_at');

    if (error) throw error;

    const settings: Record<string, unknown> = {};
    for (const row of (data || [])) {
      settings[row.key] = row.value;
    }

    // Maintenance window auto-toggle:
    // The authoritative toggle logic lives in the public get_app_settings() RPC
    // (runs on every anon/authenticated request). This admin function defers to that
    // RPC rather than duplicating logic — it re-reads settings after the RPC fires
    // so the admin panel reflects the current state immediately.
    // (No separate toggle code here — the DB state is always authoritative.)

    return new Response(
      JSON.stringify({ success: true, settings }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[admin-get-settings] Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
