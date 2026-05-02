import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAuth } from '../_shared/authMiddleware.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
const PLAN_TIER: Record<string, number> = { free: 0, pro: 1, premium: 2 };

/** Computes the user's effective plan, accounting for active trials. */
function effectivePlan(planName: string | null, trialPlan: string | null, trialExpiresAt: string | null): string {
  if (trialPlan && trialExpiresAt && new Date(trialExpiresAt) > new Date()) {
    return trialPlan;
  }
  return planName ?? 'free';
}

Deno.serve(wrapHandler("validate-coupon", async (req) => {
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
        JSON.stringify({ valid: false, error: 'Coupon code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getServiceClient();
    const upperCode = String(code).toUpperCase().trim();

    // Fetch coupon details and user's current subscription in parallel (read-only — no writes)
    const [couponRes, subRes] = await Promise.all([
      supabase
        .from('discount_codes')
        .select('id, code, discount_type, discount_value, plan_override, plan_days, expires_at, max_uses, uses_count, is_active, target_plan')
        .eq('code', upperCode)
        .maybeSingle(),
      supabase
        .from('subscriptions')
        .select('plan_name, trial_plan, trial_expires_at')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    if (couponRes.error) {
      console.error('[validate-coupon] Coupon DB error:', couponRes.error);
      return new Response(
        JSON.stringify({ valid: false, error: 'Failed to look up coupon' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (subRes.error) {
      console.error('[validate-coupon] Subscription DB error:', subRes.error);
      return new Response(
        JSON.stringify({ valid: false, error: 'Failed to look up subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const coupon = couponRes.data;

    if (!coupon || !coupon.is_active) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid or inactive coupon code' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (coupon.expires_at && new Date(coupon.expires_at as string) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: 'This coupon has expired' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if ((coupon.max_uses as number) > 0 && (coupon.uses_count as number) >= (coupon.max_uses as number)) {
      return new Response(
        JSON.stringify({ valid: false, error: 'This coupon has reached its maximum uses' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already redeemed this coupon
    const { data: existing } = await supabase
      .from('coupon_redemptions')
      .select('id')
      .eq('coupon_id', coupon.id as string)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ valid: false, error: 'You have already used this coupon' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Compute user's current effective plan (accounts for active trials)
    const sub = subRes.data;
    const userEffectivePlan = effectivePlan(
      sub?.plan_name as string | null,
      sub?.trial_plan as string | null,
      sub?.trial_expires_at as string | null,
    );

    // Check target_plan restriction (coupon is restricted to users on a specific base plan)
    if (coupon.target_plan) {
      const basePlan = (sub?.plan_name as string | null) ?? 'free';
      if (basePlan !== coupon.target_plan) {
        return new Response(
          JSON.stringify({
            valid: false,
            error: `This coupon is only available for ${coupon.target_plan} plan users`,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Guard: if user's effective plan is already equal to or better than what the coupon offers,
    // return a friendly "already covered" message rather than an error.
    if (coupon.discount_type === 'plan_upgrade' && coupon.plan_override) {
      const offerTier = PLAN_TIER[coupon.plan_override as string] ?? 0;
      const userTier = PLAN_TIER[userEffectivePlan] ?? 0;
      if (userTier >= offerTier) {
        const planName = (coupon.plan_override as string).charAt(0).toUpperCase() + (coupon.plan_override as string).slice(1);
        return new Response(
          JSON.stringify({
            valid: false,
            already_on_plan: true,
            error: `Great news — you already have access to ${planName} features! This coupon isn't needed for your current plan.`,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Compute trial end date if plan_days is set
    let trialEndsAt: string | null = null;
    if (coupon.plan_days) {
      const end = new Date();
      end.setDate(end.getDate() + (coupon.plan_days as number));
      trialEndsAt = end.toISOString();
    }

    return new Response(
      JSON.stringify({
        valid: true,
        coupon: {
          code: coupon.code,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          plan_override: coupon.plan_override,
          plan_days: coupon.plan_days,
          expires_at: coupon.expires_at,
          target_plan: coupon.target_plan,
        },
        trial_ends_at: trialEndsAt,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[validate-coupon] Error:', err);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return new Response(
      JSON.stringify({ valid: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
