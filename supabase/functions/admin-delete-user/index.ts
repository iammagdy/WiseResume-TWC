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

    // Fetch user email before deletion for audit log
    const { data: profileData } = await supabase
      .from('profiles')
      .select('email, user_id')
      .eq('user_id', target_user_id)
      .single();

    const userEmail = (profileData as { email?: string } | null)?.email ?? null;

    // Delete the auth user (cascades to related rows if FK constraints set up, else handle manually)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(target_user_id);

    if (deleteError) {
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
