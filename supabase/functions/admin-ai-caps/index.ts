import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
const PLAN_CAP_KEYS = ['daily_cap_free', 'daily_cap_trial', 'daily_cap_pro'] as const;
type PlanCapKey = typeof PLAN_CAP_KEYS[number];

const ALL_CAP_KEYS = [...PLAN_CAP_KEYS, 'global_daily_limit'] as const;

Deno.serve(wrapHandler("admin-ai-caps", async (req) => {
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
        .in('key', ALL_CAP_KEYS as unknown as string[]);

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
        global_daily_limit: null,
      };
      for (const row of (data ?? [])) {
        if (ALL_CAP_KEYS.includes(row.key as typeof ALL_CAP_KEYS[number])) {
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

      const capKey = `daily_cap_${plan}` as PlanCapKey;
      if (!PLAN_CAP_KEYS.includes(capKey)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid plan. Must be one of: free, trial, pro' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

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

      const now = new Date().toISOString();
      if (resolvedValue === null) {
        const { error } = await supabase.from('app_settings').delete().eq('key', capKey);
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

      // Audit log — non-fatal
      await supabase.from('audit_logs').insert({
        action: 'ai_cap_update',
        category: 'ai_caps',
        metadata: { cap_key: capKey, value: resolvedValue, updated_by: 'dev-kit', updated_at: now },
        created_at: now,
      }).then(({ error: auditErr }) => {
        if (auditErr) console.warn('[admin-ai-caps] audit log error (non-fatal):', auditErr);
      });

      return new Response(
        JSON.stringify({ success: true, plan, cap_key: capKey, value: resolvedValue }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── SET_GLOBAL_CAP ───────────────────────────────────────────────────────
    // Writes the platform-wide global_daily_limit to app_settings.
    // A null value clears the override (falls back to per-plan caps/defaults).
    if (action === 'set_global_cap') {
      const { value } = body;

      let resolvedValue: string | null = null;
      if (value !== null && value !== undefined && value !== '') {
        const n = Number(value);
        if (isNaN(n) || n < -1) {
          return new Response(
            JSON.stringify({ success: false, error: 'value must be a number >= -1, or null to clear the global cap' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        resolvedValue = String(n);
      }

      const now = new Date().toISOString();
      if (resolvedValue === null) {
        const { error } = await supabase.from('app_settings').delete().eq('key', 'global_daily_limit');
        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      } else {
        const { error } = await supabase
          .from('app_settings')
          .upsert({ key: 'global_daily_limit', value: resolvedValue }, { onConflict: 'key' });
        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }

      // Audit log — non-fatal
      await supabase.from('audit_logs').insert({
        action: 'ai_global_cap_update',
        category: 'ai_caps',
        metadata: { cap_key: 'global_daily_limit', value: resolvedValue, updated_by: 'dev-kit', updated_at: now },
        created_at: now,
      }).then(({ error: auditErr }) => {
        if (auditErr) console.warn('[admin-ai-caps] audit log error (non-fatal):', auditErr);
      });

      return new Response(
        JSON.stringify({ success: true, cap_key: 'global_daily_limit', value: resolvedValue }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── GET_USER_CAP ─────────────────────────────────────────────────────────
    // Returns the per-user cap override for a given user_id (if any).
    if (action === 'get_user_cap') {
      const { user_id } = body;
      if (!user_id || typeof user_id !== 'string' || user_id.trim() === '') {
        return new Response(
          JSON.stringify({ success: false, error: 'user_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const capKey = `user_limit_${user_id.trim()}`;
      const { data, error } = await supabase.from('app_settings').select('value').eq('key', capKey).maybeSingle();
      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({ success: true, user_id: user_id.trim(), cap_key: capKey, value: data?.value ?? null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── SET_USER_CAP ─────────────────────────────────────────────────────────
    // Writes a per-user cap override to app_settings as `user_limit_<user_id>`.
    // Null/empty clears the override (user falls back to plan/global/default caps).
    if (action === 'set_user_cap') {
      const { user_id, value } = body;

      if (!user_id || typeof user_id !== 'string' || user_id.trim() === '') {
        return new Response(
          JSON.stringify({ success: false, error: 'user_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const capKey = `user_limit_${user_id.trim()}`;

      let resolvedValue: string | null = null;
      if (value !== null && value !== undefined && value !== '') {
        const n = Number(value);
        if (isNaN(n) || n < -1) {
          return new Response(
            JSON.stringify({ success: false, error: 'value must be a number >= -1, or null to clear the user cap' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        resolvedValue = String(n);
      }

      const now = new Date().toISOString();
      if (resolvedValue === null) {
        const { error } = await supabase.from('app_settings').delete().eq('key', capKey);
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

      // Audit log — non-fatal
      await supabase.from('audit_logs').insert({
        action: 'ai_user_cap_update',
        category: 'ai_caps',
        metadata: { cap_key: capKey, user_id: user_id.trim(), value: resolvedValue, updated_by: 'dev-kit', updated_at: now },
        created_at: now,
      }).then(({ error: auditErr }) => {
        if (auditErr) console.warn('[admin-ai-caps] audit log error (non-fatal):', auditErr);
      });

      return new Response(
        JSON.stringify({ success: true, user_id: user_id.trim(), cap_key: capKey, value: resolvedValue }),
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
}));
