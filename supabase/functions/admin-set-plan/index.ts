import { getServiceClient } from '../_shared/dbClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

/** Per-plan daily AI credit limits.
 *  Free  → 5/day   (matches SetPlanModal description & useAICredits default)
 *  Pro   → 100/day (matches SetPlanModal description)
 *  Premium → -1    (unlimited sentinel, matches UNLIMITED_SENTINEL in creditUtils)
 */
const PLAN_DAILY_LIMITS: Record<string, number> = {
  free: 5,
  pro: 100,
  premium: -1,
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
    const newDailyLimit = PLAN_DAILY_LIMITS[cleanPlan];

    // 1. Upsert subscriptions — works for new users (no row) and existing users.
    //    Only touches plan_name, plan_updated_at, status; leaves trial fields untouched.
    const { error: subsError } = await supabase
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

    if (subsError) {
      console.error('[admin-set-plan] subscriptions upsert error:', subsError);
      return new Response(
        JSON.stringify({ success: false, error: subsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Update ai_credits.daily_limit so the credit gate enforces the new plan's entitlement.
    //    Strategy: always UPDATE first (existing rows — preserves usage counters).
    //    If the user has no ai_credits row yet, insert a fresh row with correct defaults.
    const today = new Date().toISOString().split('T')[0];

    const { data: updatedCredits, error: creditsUpdateError } = await supabase
      .from('ai_credits')
      .update({ daily_limit: newDailyLimit })
      .eq('user_id', target_user_id)
      .select('user_id');

    if (creditsUpdateError) {
      console.error('[admin-set-plan] ai_credits update error:', creditsUpdateError);
      return new Response(
        JSON.stringify({ success: false, error: creditsUpdateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no row was updated (new user without an ai_credits row), insert one
    if (!updatedCredits || updatedCredits.length === 0) {
      const { error: creditsInsertError } = await supabase
        .from('ai_credits')
        .insert({
          user_id: target_user_id,
          daily_limit: newDailyLimit,
          daily_usage: 0,
          total_usage: 0,
          usage_date: today,
        });

      if (creditsInsertError) {
        if (creditsInsertError.code === '23505') {
          // unique_violation — another process inserted concurrently, safe to ignore
          console.warn('[admin-set-plan] ai_credits concurrent insert race (ignored)');
        } else {
          // Unexpected error — treat as fatal so success is never misreported
          console.error('[admin-set-plan] ai_credits insert error:', creditsInsertError);
          return new Response(
            JSON.stringify({ success: false, error: creditsInsertError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // 3. Write audit log so plan_change history appears in the DevKit drawer
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: target_user_id,
        action: 'plan_change',
        category: 'plan',
        metadata: {
          new_plan: cleanPlan,
          new_daily_limit: newDailyLimit,
          updated_by: 'dev-kit',
          updated_at: now,
        },
        created_at: now,
      });

    if (auditError) {
      // Non-fatal — audit is best-effort
      console.warn('[admin-set-plan] audit log error (non-fatal):', auditError);
    }

    return new Response(
      JSON.stringify({ success: true, plan: cleanPlan, daily_limit: newDailyLimit, updated_at: now }),
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
