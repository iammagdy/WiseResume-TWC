import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const CAP_KEYS = ['daily_cap_free', 'daily_cap_trial', 'daily_cap_pro'] as const;
type CapKey = typeof CAP_KEYS[number];

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try {
      await requireAdminAuth(req);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    const supabase = getServiceClient();
    const body = req.method === 'GET' ? {} : await req.json();
    const action: string = body.action ?? 'get_caps';

    // ── GET_CAPS ─────────────────────────────────────────────────────────────
    if (action === 'get_caps') {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', CAP_KEYS as unknown as string[]);

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const caps: Record<string, string | null> = {
        daily_cap_free: null,
        daily_cap_trial: null,
        daily_cap_pro: null,
      };
      for (const row of (data ?? [])) {
        if (CAP_KEYS.includes(row.key as CapKey)) {
          caps[row.key] = row.value as string | null;
        }
      }

      return new Response(
        JSON.stringify({ success: true, caps }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── SET_PLAN_CAP ─────────────────────────────────────────────────────────
    if (action === 'set_plan_cap') {
      const { plan, value } = body;

      const capKey = `daily_cap_${plan}` as CapKey;
      if (!CAP_KEYS.includes(capKey)) {
        return new Response(
          JSON.stringify({ success: false, error: `Invalid plan. Must be one of: free, trial, pro` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // value can be null (clear override), a number string, or '-1' (unlimited)
      let resolvedValue: string | null = null;
      if (value !== null && value !== undefined && value !== '') {
        const n = Number(value);
        if (isNaN(n) || n < -1) {
          return new Response(
            JSON.stringify({ success: false, error: 'value must be a number >= -1, or null to clear the override' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        resolvedValue = String(n);
      }

      if (resolvedValue === null) {
        const { error } = await supabase
          .from('app_settings')
          .delete()
          .eq('key', capKey);
        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      } else {
        const { error } = await supabase
          .from('app_settings')
          .upsert({ key: capKey, value: resolvedValue }, { onConflict: 'key' });
        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true, plan, cap_key: capKey, value: resolvedValue }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('[admin-ai-caps] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
