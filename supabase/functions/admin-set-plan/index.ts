import { getServiceClient } from '../_shared/dbClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SECRET_PASSWORD = Deno.env.get('DEV_KIT_PASSWORD');
  if (!SECRET_PASSWORD) {
    return new Response(
      JSON.stringify({ success: false, error: 'Admin functions are not configured' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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
    const now = new Date().toISOString();

    // Upsert on subscriptions — works for both new users (no existing row) and existing users.
    // Only updates plan_name, plan_updated_at, and status; leaves trial fields untouched on conflict.
    const { error: upsertError } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: target_user_id,
          plan_name: cleanPlan,
          plan_updated_at: now,
          status: 'active',
        },
        { onConflict: 'user_id' }
      );

    if (upsertError) {
      console.error('[admin-set-plan] upsert error:', upsertError);
      return new Response(
        JSON.stringify({ success: false, error: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Write audit log entry so history still works in the drawer
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: target_user_id,
        action: 'plan_change',
        category: 'plan',
        metadata: { new_plan: cleanPlan, updated_by: 'dev-kit', updated_at: now },
        created_at: now,
      });

    if (auditError) {
      // Non-fatal — log but don't fail the request
      console.warn('[admin-set-plan] audit log error (non-fatal):', auditError);
    }

    return new Response(
      JSON.stringify({ success: true, plan: cleanPlan, updated_at: now }),
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
