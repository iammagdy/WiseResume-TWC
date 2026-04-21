import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

function json(data: unknown, status = 200, corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { recipient_email, waitlist_id } = body as {
      recipient_email: string;
      waitlist_id?: string;
    };

    let callerEmail: string;
    try {
      callerEmail = await requireAdminAuth(req);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    if (!recipient_email?.trim()) {
      return json({ success: false, error: 'recipient_email is required' }, 400, corsHeaders);
    }

    const supabase = getServiceClient();
    const email = recipient_email.trim().toLowerCase();

    const { data: revoked, error: revokeErr } = await supabase
      .from('wisehire_invites')
      .update({ is_revoked: true })
      .eq('recipient_email', email)
      .eq('is_revoked', false)
      .is('used_at', null)
      .select('token');

    if (revokeErr) {
      throw new Error(`Failed to revoke invites: ${revokeErr.message}`);
    }

    const revokedCount = revoked?.length ?? 0;

    const callerIdResult = await supabase
      .from('profiles')
      .select('id')
      .eq('email', callerEmail)
      .maybeSingle();

    await supabase.from('audit_logs').insert({
      user_id: callerIdResult.data?.id ?? undefined,
      category: 'admin_email',
      action: 'wisehire_invite_revoke',
      metadata: {
        recipient_email: email,
        performed_by: callerEmail,
        revoked_count: revokedCount,
        waitlist_id: waitlist_id ?? null,
        revoked_at: new Date().toISOString(),
      },
    });

    return json({ success: true, revoked_count: revokedCount }, 200, corsHeaders);
  } catch (err) {
    console.error('[admin-wisehire-revoke-invite]', err);
    return json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      500,
      corsHeaders,
    );
  }
});
