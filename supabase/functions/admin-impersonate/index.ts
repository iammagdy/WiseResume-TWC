import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAdminAuth } from "../_shared/adminAuth.ts";
import { getServiceClient } from "../_shared/dbClient.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authResult = await requireAdminAuth(req);
  if (authResult instanceof Response) return authResult;
  const { email: adminEmail } = authResult;

  const supabase = getServiceClient();

  let body: { target_user_id?: string; action?: string } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const action = body.action ?? 'start';

  if (action === 'exit') {
    const { target_user_id } = body;
    try {
      await supabase.from('audit_logs').insert({
        user_id: null,
        category: 'admin_impersonation',
        action: 'impersonation_exit',
        metadata: {
          performed_by: adminEmail,
          target_user_id: target_user_id ?? null,
          exited_at: new Date().toISOString(),
        },
      });
    } catch {
      // Non-fatal — still return success
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { target_user_id } = body;
  if (!target_user_id) {
    return new Response(JSON.stringify({ error: 'target_user_id is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: targetUser, error: userErr } = await supabase.auth.admin.getUserById(target_user_id);
  if (userErr || !targetUser?.user) {
    return new Response(JSON.stringify({ error: 'Target user not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const targetEmail = targetUser.user.email ?? target_user_id;

  const { data: sessionData, error: sessionErr } = await supabase.auth.admin.createSession({
    user_id: target_user_id,
  });

  if (sessionErr || !sessionData?.session) {
    console.error('[admin-impersonate] createSession error:', sessionErr);
    return new Response(JSON.stringify({ error: 'Failed to create impersonation session' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const expiresAt = Date.now() + 30 * 60 * 1000;

  try {
    await supabase.from('audit_logs').insert({
      user_id: null,
      category: 'admin_impersonation',
      action: 'impersonation_start',
      metadata: {
        performed_by: adminEmail,
        target_user_id,
        target_email: targetEmail,
        started_at: new Date().toISOString(),
      },
    });
  } catch {
    // Non-fatal
  }

  return new Response(
    JSON.stringify({
      success: true,
      access_token: sessionData.session.access_token,
      user_id: target_user_id,
      email: targetEmail,
      expires_at: expiresAt,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
