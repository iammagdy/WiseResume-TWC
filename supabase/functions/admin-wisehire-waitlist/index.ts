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
    const { password, page = 1, per_page = 25, search = '' } = body as {
      password: string;
      page?: number;
      per_page?: number;
      search?: string;
    };

    try {
      await requireAdminAuth(req, password);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    const supabase = getServiceClient();
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

    // Determine which entries have completed signup (used_at IS NOT NULL)
    let activeEmailMap: Map<string, string> = new Map();
    if (entries.length > 0) {
      const emails = entries.map((e: { email: string }) => e.email.toLowerCase());
      const { data: usedInvites, error: inviteError } = await supabase
        .from('wisehire_invites')
        .select('recipient_email, used_at')
        .in('recipient_email', emails)
        .not('used_at', 'is', null);

      if (inviteError) throw inviteError;

      for (const inv of (usedInvites ?? [])) {
        const normalizedEmail = inv.recipient_email.toLowerCase();
        if (!activeEmailMap.has(normalizedEmail)) {
          activeEmailMap.set(normalizedEmail, inv.used_at);
        }
      }
    }

    const enrichedEntries = entries.map((e: { email: string }) => ({
      ...e,
      invite_used_at: activeEmailMap.get(e.email.toLowerCase()) ?? null,
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
