// admin-revoke-devkit-sessions: AUTH-5 wiring. Revokes admin DevKit sessions
// stored in `public.admin_sessions`. Accepts:
//   { sessionId?: uuid, email?: string, all?: boolean }
// - sessionId: revoke that single session
// - email:    revoke every active session for that email
// - all:      revoke every active admin session (panic switch)
// At least one of sessionId/email/all must be provided.
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

    let body: { sessionId?: unknown; email?: unknown; all?: unknown } = {};
    try {
      body = await req.json();
    } catch {
      // empty body is fine — we'll reject below for missing selector
    }

    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
    const targetEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const revokeAll = body.all === true;

    if (!sessionId && !targetEmail && !revokeAll) {
      return new Response(
        JSON.stringify({ success: false, error: 'sessionId, email, or all=true is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getServiceClient();
    const nowIso = new Date().toISOString();

    let query = supabase
      .from('admin_sessions')
      .update({ revoked_at: nowIso })
      .is('revoked_at', null);

    if (sessionId) {
      query = query.eq('id', sessionId);
    } else if (targetEmail) {
      query = query.eq('email', targetEmail);
    }
    // revokeAll: no extra filter beyond `revoked_at is null`.

    const { data: revoked, error: updateErr } = await query.select('id, email');
    if (updateErr) {
      console.error('[admin-revoke-devkit-sessions] update failed:', updateErr);
      return new Response(
        JSON.stringify({ success: false, error: updateErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Best-effort audit log. We don't have a per-user user_id for these
    // sessions, so log under the actor email instead.
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: null,
          category: 'admin',
          action: 'admin_sessions_revoked',
          metadata: {
            actor_email: actorEmail,
            target_session_id: sessionId || null,
            target_email: targetEmail || null,
            all: revokeAll,
            revoked_count: revoked?.length ?? 0,
          },
        });
    } catch (logErr) {
      console.warn('[admin-revoke-devkit-sessions] audit log write failed:', logErr);
    }

    return new Response(
      JSON.stringify({ success: true, revoked_count: revoked?.length ?? 0 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[admin-revoke-devkit-sessions] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
