/**
 * admin-delete-user — Permanently remove a Supabase auth user (and any
 * cascading rows) on behalf of the DevKit admin panel.
 *
 * Trigger: "Delete account" button in the DevKit Users pane. For full
 *   user-owned-table purge see the separate `hard-purge` function.
 * Auth: ADMIN ONLY (`requireAdminAuth` — DevKit session token).
 * Dispatch contract: POST `{target_user_id, actor_email?}`. Returns 200
 *   `{success:true}` on success, 400 `{error:'target_user_id is required'}`
 *   on missing input, 404 `{error:'not_found'}` when the auth user does
 *   not exist (so the UI can distinguish from a real server error), 500
 *   on any other failure. Writes one `audit_logs` row
 *   (`category:'admin', action:'account_deleted'`).
 */
import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
Deno.serve(wrapHandler("admin-delete-user", async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { target_user_id, actor_email } = body as {
      target_user_id?: string;
      actor_email?: string;
    };

    try {
      await requireAdminAuth(req);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    if (!target_user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'target_user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getServiceClient();

    // Fetch user email before deletion for audit log.
    // Uses maybeSingle so a missing profile row (auth-only user) does not
    // log a PGRST116 row-not-found error — userEmail simply stays null.
    const { data: profileData } = await supabase
      .from('profiles')
      .select('email, user_id')
      .eq('user_id', target_user_id)
      .maybeSingle();

    const userEmail = (profileData as { email?: string } | null)?.email ?? null;

    // Delete the auth user (cascades to related rows if FK constraints set up, else handle manually)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(target_user_id);

    if (deleteError) {
      // Surface auth "user not found" as a 404 not_found envelope so admin
      // UI can distinguish a missing target from a real server error.
      const msg = (deleteError.message ?? '').toLowerCase();
      const isMissing =
        (deleteError as { status?: number }).status === 404 ||
        msg.includes('not found') ||
        msg.includes('user_not_found') ||
        msg.includes('no user');
      if (isMissing) {
        return new Response(
          JSON.stringify({ success: false, error: 'not_found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Write audit log entry
    await supabase
      .from('audit_logs')
      .insert({
        user_id: target_user_id,
        category: 'admin',
        action: 'account_deleted',
        metadata: {
          deleted_email: userEmail,
          actor_email: actor_email ?? 'admin (dev-kit)',
        },
      });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[admin-delete-user] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
