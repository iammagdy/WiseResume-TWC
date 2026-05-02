import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
Deno.serve(wrapHandler("admin-manage-coupons", async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
      // UPDATE with maybeSingle returns null when no row matched coupon_id —
      // surface a clean 404 not_found instead of a misleading 200 success.
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
}));
