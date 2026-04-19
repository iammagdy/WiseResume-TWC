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
    const { password, page = 1, per_page = 25, search = '', history_email } = body as {
      password: string;
      page?: number;
      per_page?: number;
      search?: string;
      history_email?: string;
    };

    try {
      await requireAdminAuth(req, password);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    const supabase = getServiceClient();

    if (history_email) {
      const normalizedEmail = history_email.toLowerCase().trim();
      const { data: invites, error: inviteError } = await supabase
        .from('wisehire_invites')
        .select('id, created_at, expires_at, used_at, is_revoked')
        .eq('recipient_email', normalizedEmail)
        .order('created_at', { ascending: false });

      if (inviteError) throw inviteError;

      const now = new Date();
      const history = (invites ?? []).map((inv: {
        id: string;
        created_at: string;
        expires_at: string;
        used_at: string | null;
        is_revoked: boolean;
      }) => {
        let status: 'used' | 'revoked' | 'expired' | 'active';
        if (inv.used_at) {
          status = 'used';
        } else if (inv.is_revoked) {
          status = 'revoked';
        } else if (new Date(inv.expires_at) < now) {
          status = 'expired';
        } else {
          status = 'active';
        }
        return {
          id: inv.id,
          sent_at: inv.created_at,
          expires_at: inv.expires_at,
          used_at: inv.used_at,
          status,
        };
      });

      return json({ success: true, history }, 200, corsHeaders);
    }

    const offset = (page - 1) * per_page;

    let query = supabase
      .from('wisehire_waitlist')
      .select('*', { count: 'exact' })
      .order('submitted_at', { ascending: false })
      .range(offset, offset + per_page - 1);

    if (search.trim()) {
      query = query.or(
        `name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const entries = data ?? [];

    type InviteStatusValue = 'active' | 'revoked' | 'expired' | null;

    let inviteUsedAtMap: Map<string, string> = new Map();
    let inviteStatusMap: Map<string, InviteStatusValue> = new Map();

    if (entries.length > 0) {
      const emails = entries.map((e: { email: string }) => e.email.toLowerCase());

      const { data: allInvites, error: inviteError } = await supabase
        .from('wisehire_invites')
        .select('recipient_email, used_at, is_revoked, expires_at, created_at')
        .in('recipient_email', emails)
        .order('created_at', { ascending: false });

      if (inviteError) throw inviteError;

      const now = new Date();

      for (const inv of (allInvites ?? [])) {
        const normalizedEmail = inv.recipient_email.toLowerCase();

        if (inv.used_at && !inviteUsedAtMap.has(normalizedEmail)) {
          inviteUsedAtMap.set(normalizedEmail, inv.used_at);
        }

        if (!inviteStatusMap.has(normalizedEmail)) {
          let status: InviteStatusValue;
          if (inv.is_revoked) {
            status = 'revoked';
          } else if (new Date(inv.expires_at) < now) {
            status = 'expired';
          } else {
            status = 'active';
          }
          inviteStatusMap.set(normalizedEmail, status);
        }
      }
    }

    const enrichedEntries = entries.map((e: { email: string }) => ({
      ...e,
      invite_used_at: inviteUsedAtMap.get(e.email.toLowerCase()) ?? null,
      invite_status: inviteStatusMap.get(e.email.toLowerCase()) ?? null,
    }));

    return json({ success: true, entries: enrichedEntries, total: count ?? 0, page, per_page }, 200, corsHeaders);
  } catch (err) {
    console.error('[admin-wisehire-waitlist]', err);
    return json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      500,
      corsHeaders
    );
  }
});
