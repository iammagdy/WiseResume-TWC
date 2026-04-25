/**
 * admin-owner-ops — Owner-only operational actions
 *
 * Actions:
 *   trigger_backup    — POST to Supabase Management API to create a PITR backup snapshot
 *   get_backup_status — GET backup list from Supabase Management API
 */
import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const SUPABASE_PROJECT_REF =
  Deno.env.get('SUPABASE_PROJECT_REF') ??
  (Deno.env.get('EXT_SUPABASE_URL') || Deno.env.get('SUPABASE_URL') || '')
    .match(/https:\/\/([^.]+)/)?.[1] ??
  '';

const MGMT_API_BASE = 'https://api.supabase.com/v1';

async function mgmtApiFetch(path: string, method: 'GET' | 'POST', token: string) {
  const res = await fetch(`${MGMT_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let callerEmail: string;
    try {
      callerEmail = await requireAdminAuth(req, corsHeaders);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    const body = await req.json();
    const { action } = body as { action: string };
    const supabase = getServiceClient();

    if (action === 'trigger_backup') {
      const accessToken = Deno.env.get('SUPABASE_ACCESS_TOKEN');
      if (!accessToken) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'SUPABASE_ACCESS_TOKEN is not configured. Set it as a Supabase Edge Function secret to enable backup triggers.',
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      if (!SUPABASE_PROJECT_REF) {
        return new Response(
          JSON.stringify({ success: false, error: 'Could not determine Supabase project ref.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const result = await mgmtApiFetch(
        `/projects/${SUPABASE_PROJECT_REF}/database/backups`,
        'POST',
        accessToken,
      );

      const auditMeta: Record<string, unknown> = {
        performed_by: callerEmail,
        project_ref: SUPABASE_PROJECT_REF,
        api_status: result.status,
        triggered_at: new Date().toISOString(),
      };

      if (!result.ok) {
        auditMeta.error = result.text.slice(0, 500);
        await supabase.from('audit_logs').insert({
          user_id: null,
          category: 'admin_owner_ops',
          action: 'backup_trigger_failed',
          metadata: auditMeta,
        });
        return new Response(
          JSON.stringify({
            success: false,
            error: `Supabase Management API returned ${result.status}: ${result.text.slice(0, 300)}`,
          }),
          { status: result.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      await supabase.from('audit_logs').insert({
        user_id: null,
        category: 'admin_owner_ops',
        action: 'backup_triggered',
        metadata: auditMeta,
      });

      let parsed: unknown = null;
      try { parsed = JSON.parse(result.text); } catch { /* non-json response ok */ }

      return new Response(
        JSON.stringify({ success: true, triggered_at: new Date().toISOString(), data: parsed }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (action === 'get_backup_status') {
      const accessToken = Deno.env.get('SUPABASE_ACCESS_TOKEN');
      if (!accessToken) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'SUPABASE_ACCESS_TOKEN is not configured.',
            not_configured: true,
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      if (!SUPABASE_PROJECT_REF) {
        return new Response(
          JSON.stringify({ success: false, error: 'Could not determine Supabase project ref.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const result = await mgmtApiFetch(
        `/projects/${SUPABASE_PROJECT_REF}/database/backups`,
        'GET',
        accessToken,
      );

      if (!result.ok) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Supabase Management API returned ${result.status}: ${result.text.slice(0, 300)}`,
          }),
          { status: result.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      let backups: unknown[] = [];
      try {
        const parsed = JSON.parse(result.text);
        backups = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.backups) ? parsed.backups : []);
      } catch { /* ok */ }

      return new Response(
        JSON.stringify({ success: true, backups }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[admin-owner-ops] Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
