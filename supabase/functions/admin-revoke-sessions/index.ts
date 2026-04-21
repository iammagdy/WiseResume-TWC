// admin-revoke-sessions: revoke ALL Supabase auth sessions for a target user
// (i.e. force-sign-out from every device). Used by the admin DevKit user
// detail drawer. Distinct from `admin-revoke-devkit-sessions`, which revokes
// admin DevKit panel sessions in `public.admin_sessions`.
import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let actorEmail: string;
    try {
      actorEmail = await requireAdminAuth(req, corsHeaders);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    let body: { target_user_id?: unknown; actor_email?: unknown } = {};
    try {
      body = await req.json();
    } catch {
      // empty body — rejected below
    }

    const targetUserId =
      typeof body.target_user_id === 'string' ? body.target_user_id.trim() : '';
    if (!targetUserId) {
      return new Response(
        JSON.stringify({ success: false, error: 'target_user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getServiceClient();

    // Sign the user out everywhere via Supabase admin API.
    const { error: signOutErr } = await supabase.auth.admin.signOut(targetUserId, 'global');
    if (signOutErr) {
      console.error('[admin-revoke-sessions] signOut failed:', signOutErr);
      return new Response(
        JSON.stringify({ success: false, error: signOutErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: targetUserId,
          category: 'admin',
          action: 'user_sessions_revoked',
          metadata: {
            actor_email: actorEmail,
            actor_email_self_reported:
              typeof body.actor_email === 'string' ? body.actor_email : null,
          },
        });
    } catch (logErr) {
      console.warn('[admin-revoke-sessions] audit log write failed:', logErr);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[admin-revoke-sessions] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
