import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAuth } from '../_shared/authMiddleware.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';

/**
 * Consolidated router for the three coupon edge functions.
 *
 * Replaces (3 → 1):
 *   - admin-manage-coupons   → x-coupons-action: "admin-manage"
 *   - redeem-coupon          → x-coupons-action: "redeem"
 *   - validate-coupon        → x-coupons-action: "validate"
 *
 * Dispatch is driven by the `x-coupons-action` request header so the
 * router never has to read the request body. Each handler then runs
 * its ORIGINAL parse-vs-auth ordering, its ORIGINAL outer try/catch,
 * and its ORIGINAL error envelope (success:false vs valid:false), so
 * behavior is byte-for-byte identical to the originals — including
 * malformed-body and unauthenticated-request paths.
 */

const PLAN_TIER: Record<string, number> = { free: 0, pro: 1, premium: 2 };

function effectivePlan(planName: string | null, trialPlan: string | null, trialExpiresAt: string | null): string {
  if (trialPlan && trialExpiresAt && new Date(trialExpiresAt) > new Date()) {
    return trialPlan;
  }
  return planName ?? 'free';
}

// ─── admin-manage (was admin-manage-coupons) ─────────────────────────────
// Original ordering: parse body → admin auth. Original 500 envelope:
// { success:false, error: msg }.

async function handleAdminManage(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = await req.json();
    const { action, ...rest } = body;

    try {
      await requireAdminAuth(req);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    const supabase = getServiceClient();

    if (action === 'list') {
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, coupons: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'create') {
      const {
        code,
        discount_type,
        discount_value,
        plan_override,
        plan_days,
        target_plan,
        expires_at,
        max_uses,
      } = rest;

      if (!code || !discount_type) {
        return new Response(
          JSON.stringify({ success: false, error: 'code and discount_type are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('discount_codes')
        .insert({
          code: String(code).toUpperCase().trim(),
          discount_type,
          discount_value: discount_value || 0,
          plan_override: plan_override || null,
          plan_days: plan_days || null,
          target_plan: target_plan || null,
          expires_at: expires_at || null,
          max_uses: max_uses || 0,
          is_active: true,
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return new Response(
          JSON.stringify({ success: false, error: 'not_found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: true, coupon: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'toggle') {
      const { coupon_id, is_active } = rest;
      if (!coupon_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'coupon_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('discount_codes')
        .update({ is_active: Boolean(is_active) })
        .eq('id', coupon_id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return new Response(
          JSON.stringify({ success: false, error: 'not_found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: true, coupon: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      const { coupon_id } = rest;
      if (!coupon_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'coupon_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('discount_codes')
        .delete()
        .eq('id', coupon_id);

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Unknown action. Use: list, create, toggle, delete' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[admin-manage-coupons] Error:', err);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// ─── redeem (was redeem-coupon) ──────────────────────────────────────────
// Original ordering: requireAuth → parse body. Original 500 envelope:
// { success:false, error: msg }.

async function handleRedeem(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
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

    if (data?.success && data?.plan_override) {
      const planOverride = data.plan_override as string;
      let newDailyLimit: number;
      if (planOverride === 'premium') {
        newDailyLimit = -1;
      } else if (planOverride === 'pro') {
        newDailyLimit = 30;
      } else {
        newDailyLimit = 5;
      }

      const today = new Date().toISOString().split('T')[0];

      const { error: upsertError } = await supabase.rpc('upsert_ai_credits_limit', {
        p_user_id: userId,
        p_daily_limit: newDailyLimit,
        p_usage_date: today,
      });

      if (upsertError) {
        console.error('[redeem-coupon] Failed to sync ai_credits:', upsertError);
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
}

// ─── validate (was validate-coupon) ──────────────────────────────────────
// Original ordering: requireAuth → parse body. Original 500 envelope:
// { valid:false, error: msg }.

async function handleValidate(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
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

    const sub = subRes.data;
    const userEffectivePlan = effectivePlan(
      sub?.plan_name as string | null,
      sub?.trial_plan as string | null,
      sub?.trial_expires_at as string | null,
    );

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
}

// ─── router ──────────────────────────────────────────────────────────────
// Dispatch is driven by the `x-coupons-action` header — the router never
// reads the body, so each handler keeps its original parse-vs-auth order.

Deno.serve(wrapHandler('coupons', async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const action = req.headers.get('x-coupons-action');
  switch (action) {
    case 'admin-manage':
      return await handleAdminManage(req, corsHeaders);
    case 'redeem':
      return await handleRedeem(req, corsHeaders);
    case 'validate':
      return await handleValidate(req, corsHeaders);
    default:
      return new Response(
        JSON.stringify({ error: `Unknown coupons action: ${action || '(missing x-coupons-action header)'}. Use: admin-manage, redeem, validate` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
  }
}));
