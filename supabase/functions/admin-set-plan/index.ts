import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { password, target_user_id, plan } = body;

    if (!password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SECRET_PASSWORD = Deno.env.get('DEV_KIT_PASSWORD') || 'thewisedeveloper';
    if (password !== SECRET_PASSWORD) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!target_user_id || !plan) {
      return new Response(
        JSON.stringify({ success: false, error: 'target_user_id and plan are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanPlan = String(plan).toLowerCase().trim();
    if (!['free', 'pro', 'premium'].includes(cleanPlan)) {
      return new Response(
        JSON.stringify({ success: false, error: 'plan must be one of: free, pro, premium' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getServiceClient();

    const { data, error } = await supabase.rpc('admin_set_user_plan', {
      p_target_user_id: target_user_id,
      p_new_plan: cleanPlan,
      p_updated_by: 'dev-kit',
    });

    if (error) {
      console.error('[admin-set-plan] RPC error:', error);
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
    console.error('[admin-set-plan] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
