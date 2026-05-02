/**
 * admin-feature-flags — DevKit edge function for managing feature flags.
 *
 * Protected by requireAdminAuth (DevKit session token).
 * All mutations are audit-logged to the audit_logs table using the
 * correct schema: user_id (null for admin-only ops), category, action, metadata.
 *
 * Actions:
 *   list   — return all flags ordered by name
 *   upsert — create or update a flag (identified by name)
 *   delete — remove a flag by name
 */

import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
async function writeAuditLog(
  supabase: ReturnType<typeof getServiceClient>,
  action: string,
  callerEmail: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert({
    user_id: null,
    category: 'admin_feature_flag',
    action,
    metadata: { ...metadata, performed_by: callerEmail },
  });
  if (error) {
    console.error('[admin-feature-flags] audit log write failed:', error);
  }
}

Deno.serve(wrapHandler("admin-feature-flags", async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let callerEmail = '';
  try {
    callerEmail = await requireAdminAuth(req, corsHeaders);
  } catch (authErr) {
    if (authErr instanceof Response) return authErr;
    throw authErr;
  }

  try {
    const body = await req.json();
    const { action } = body as { action: string };
    const supabase = getServiceClient();

    // ──────────────────────────────────────────────
    // LIST
    // ──────────────────────────────────────────────
    if (action === 'list') {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, flags: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ──────────────────────────────────────────────
    // UPSERT
    // ──────────────────────────────────────────────
    if (action === 'upsert') {
      const {
        name,
        description = '',
        enabled_globally = false,
        enabled_plans = [],
        enabled_user_ids = [],
        percentage_rollout = 0,
        kill_switch_function = null,
      } = body as {
        name: string;
        description?: string;
        enabled_globally?: boolean;
        enabled_plans?: string[];
        enabled_user_ids?: string[];
        percentage_rollout?: number;
        kill_switch_function?: string | null;
      };

      if (!name || typeof name !== 'string') {
        return new Response(
          JSON.stringify({ success: false, error: 'name is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

      const row = {
        name: cleanName,
        description: description.trim(),
        enabled_globally,
        enabled_plans,
        enabled_user_ids,
        percentage_rollout: Math.max(0, Math.min(100, Number(percentage_rollout) || 0)),
        kill_switch_function: kill_switch_function?.trim() || null,
        updated_by: callerEmail,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('feature_flags')
        .upsert(row, { onConflict: 'name' })
        .select()
        .single();

      if (error) throw error;

      await writeAuditLog(supabase, 'upsert', callerEmail, {
        flag_name: cleanName,
        enabled_globally,
        enabled_plans,
        enabled_user_ids_count: enabled_user_ids.length,
        percentage_rollout: row.percentage_rollout,
        kill_switch_function: row.kill_switch_function,
      });

      return new Response(
        JSON.stringify({ success: true, flag: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ──────────────────────────────────────────────
    // DELETE
    // ──────────────────────────────────────────────
    if (action === 'delete') {
      const { name } = body as { name: string };
      if (!name) {
        return new Response(
          JSON.stringify({ success: false, error: 'name is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const { error } = await supabase
        .from('feature_flags')
        .delete()
        .eq('name', name);

      if (error) throw error;

      await writeAuditLog(supabase, 'delete', callerEmail, { flag_name: name });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[admin-feature-flags]', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
}));
