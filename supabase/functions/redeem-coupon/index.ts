import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAuth } from '../_shared/authMiddleware.ts';

const PLAN_TIER: Record<string, number> = { free: 0, pro: 1, premium: 2 };
const PRO_DAILY_LIMIT = 30;

/** Computes the user's effective plan, accounting for active trials. */
function effectivePlan(planName: string | null, trialPlan: string | null, trialExpiresAt: string | null): string {
  if (trialPlan && trialExpiresAt && new Date(trialExpiresAt) > new Date()) {
    return trialPlan;
  }
  return planName ?? 'free';
}

/**
 * Syncs ai_credits.daily_limit for the user to match their new plan.
 * Uses a 2-step update-then-insert approach to avoid resetting daily_usage
 * for users who already consumed credits today. No SQL RPC dependency.
 */
async function syncCreditLimit(supabase: ReturnType<typeof getServiceClient>, userId: string, newDailyLimit: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  // 1. Try to update the existing row (preserves daily_usage)
  const { count } = await supabase
    .from('ai_credits')
    .update({ daily_limit: newDailyLimit })
    .eq('user_id', userId)
    .select('user_id', { count: 'exact', head: true });

  // 2. If no row existed, insert a fresh one
  if (!count || count === 0) {
    const { error: insertError } = await supabase.from('ai_credits').insert({
      user_id: userId,
      daily_limit: newDailyLimit,
      daily_usage: 0,
      usage_date: today,
      total_usage: 0,
    });
    if (insertError && insertError.code !== '23505') {
      // 23505 = unique_violation (race — another insert just beat us, that's fine)
      console.error('[redeem-coupon] ai_credits insert error:', insertError);
    }
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await requireAuth(req);
    const body = await req.json();
    const { code } = body as { code?: string };

    if (!code?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Coupon code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getServiceClient();
    const upperCode = String(code).toUpperCase().trim();

    // Pre-check: fetch coupon details and user's effective plan to guard
    // against redeeming an equal-or-lower-tier offer (prevents downgrades).
    const [couponRes, subRes] = await Promise.all([
      supabase
        .from('discount_codes')
        .select('plan_override, plan_days, discount_type, is_active')
        .eq('code', upperCode)
        .maybeSingle(),
      supabase
        .from('subscriptions')
        .select('plan_name, trial_plan, trial_expires_at')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    if (!couponRes.error && couponRes.data?.is_active) {
      const coupon = couponRes.data;
      if (coupon.discount_type === 'plan_upgrade' && coupon.plan_override) {
        const sub = subRes.data;
        const userEffectivePlan = effectivePlan(
          sub?.plan_name as string | null,
          sub?.trial_plan as string | null,
          sub?.trial_expires_at as string | null,
        );
        const offerTier = PLAN_TIER[coupon.plan_override as string] ?? 0;
        const userTier = PLAN_TIER[userEffectivePlan] ?? 0;
        if (userTier >= offerTier) {
          const planName = (coupon.plan_override as string).charAt(0).toUpperCase() + (coupon.plan_override as string).slice(1);
          return new Response(
            JSON.stringify({
              success: false,
              already_on_plan: true,
              error: `Great news — you already have access to ${planName} features! This coupon isn't needed for your current plan.`,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Delegate to the SQL RPC for atomic redemption
    const { data, error } = await supabase.rpc('redeem_coupon', {
      p_code: upperCode,
      p_user_id: userId,
    });

    if (error) {
      console.error('[redeem-coupon] RPC error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // After a successful redemption, sync ai_credits.daily_limit to match the
    // new plan so the backend credit gate immediately sees the right limit.
    // Uses direct update/insert rather than an SQL RPC to avoid a dependency
    // on the upsert_ai_credits_limit migration.
    if (data?.success && data?.plan_override) {
      const planOverride = data.plan_override as string;
      let newDailyLimit: number;
      if (planOverride === 'premium') {
        newDailyLimit = -1; // Unlimited sentinel
      } else if (planOverride === 'pro') {
        newDailyLimit = PRO_DAILY_LIMIT;
      } else {
        newDailyLimit = 5; // Free tier default
      }

      try {
        await syncCreditLimit(supabase, userId, newDailyLimit);
      } catch (syncErr) {
        console.error('[redeem-coupon] Failed to sync ai_credits:', syncErr);
        // Non-fatal — the redemption itself succeeded
      }
    }

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[redeem-coupon] Error:', err);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
