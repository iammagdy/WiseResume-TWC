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

    return json({ success: true, entries: data ?? [], total: count ?? 0, page, per_page }, 200, corsHeaders);
  } catch (err) {
    console.error('[admin-wisehire-waitlist]', err);
    return json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      500,
      corsHeaders
    );
  }
});
