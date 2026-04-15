import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

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
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { password, target_user_id, email, plan } = body;

    try {
      await requireAdminAuth(req, password);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    if (!plan) {
      return new Response(
        JSON.stringify({ success: false, error: 'plan is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!target_user_id && !email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Either target_user_id or email is required' }),
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

    // Resolve user ID — prefer explicit target_user_id, otherwise look up by email
    let resolvedUserId: string = target_user_id ?? '';

    if (!resolvedUserId && email) {
      const cleanEmail = String(email).toLowerCase().trim();

      // 1. Try profiles.contact_email first (Kinde shadow user = the live session)
      const { data: profileMatch, error: profileLookupErr } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('contact_email', cleanEmail)
        .limit(1)
        .single();

      if (!profileLookupErr && profileMatch) {
        resolvedUserId = profileMatch.user_id as string;
        console.log(`[admin-set-plan] Resolved user by contact_email: ${resolvedUserId}`);
      } else {
        // 2. Fall back to auth.users.email
        const authListResult = await supabase.auth.admin.listUsers({ page: 1, perPage: 10000 });
        if (authListResult.error) {
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to list auth users: ' + authListResult.error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const match = (authListResult.data.users ?? []).find(u =>
          (u.email ?? '').toLowerCase() === cleanEmail
        );
        if (match) {
          resolvedUserId = match.id;
          console.log(`[admin-set-plan] Resolved user by auth.users.email: ${resolvedUserId}`);
        }
      }

      if (!resolvedUserId) {
        return new Response(
          JSON.stringify({ success: false, error: `No user found with email: ${cleanEmail}` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const now = new Date().toISOString();
    const newDailyLimit = PLAN_DAILY_LIMITS[cleanPlan];

    // 1. Upsert subscriptions
    const { error: subsError } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: resolvedUserId,
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

    // 2. Update ai_credits.daily_limit
    const today = new Date().toISOString().split('T')[0];

    const { data: updatedCredits, error: creditsUpdateError } = await supabase
      .from('ai_credits')
      .update({ daily_limit: newDailyLimit })
      .eq('user_id', resolvedUserId)
      .select('user_id');

    if (creditsUpdateError) {
      console.error('[admin-set-plan] ai_credits update error:', creditsUpdateError);
      return new Response(
        JSON.stringify({ success: false, error: creditsUpdateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!updatedCredits || updatedCredits.length === 0) {
      const { error: creditsInsertError } = await supabase
        .from('ai_credits')
        .insert({
          user_id: resolvedUserId,
          daily_limit: newDailyLimit,
          daily_usage: 0,
          total_usage: 0,
          usage_date: today,
        });

      if (creditsInsertError) {
        if (creditsInsertError.code === '23505') {
          console.warn('[admin-set-plan] ai_credits concurrent insert race (ignored)');
        } else {
          console.error('[admin-set-plan] ai_credits insert error:', creditsInsertError);
          return new Response(
            JSON.stringify({ success: false, error: creditsInsertError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // 3. Write audit log
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: resolvedUserId,
        action: 'plan_change',
        category: 'plan',
        metadata: {
          new_plan: cleanPlan,
          new_daily_limit: newDailyLimit,
          updated_by: 'dev-kit',
          updated_at: now,
          ...(email && !target_user_id ? { resolved_via_email: email } : {}),
        },
        created_at: now,
      });

    if (auditError) {
      console.warn('[admin-set-plan] audit log error (non-fatal):', auditError);
    }

    return new Response(
      JSON.stringify({ success: true, plan: cleanPlan, daily_limit: newDailyLimit, updated_at: now, resolved_user_id: resolvedUserId }),
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
