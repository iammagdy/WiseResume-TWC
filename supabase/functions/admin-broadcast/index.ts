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
    let callerEmail: string;
    try {
      callerEmail = await requireAdminAuth(req, corsHeaders);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    const body = await req.json();
    const { action, id, title, body: msgBody, severity, expires_at, active_only } = body as {
      action: string;
      id?: string;
      title?: string;
      body?: string;
      severity?: string;
      expires_at?: string | null;
      active_only?: boolean;
    };

    const supabase = getServiceClient();

    if (action === 'list') {
      let q = supabase
        .from('broadcasts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (active_only === true) {
        q = q.eq('active', true);
      }
      const { data, error } = await q;
      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, broadcasts: data ?? [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (action === 'publish') {
      if (!title?.trim() || !msgBody?.trim()) {
        return new Response(
          JSON.stringify({ success: false, error: 'title and body are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const validSeverities = ['info', 'warning', 'critical'];
      const resolvedSeverity = validSeverities.includes(severity ?? '') ? severity : 'info';

      const { data: inserted, error: insertErr } = await supabase
        .from('broadcasts')
        .insert({
          title: title.trim(),
          body: msgBody.trim(),
          severity: resolvedSeverity,
          active: true,
          created_by: callerEmail,
          expires_at: expires_at ?? null,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      const { error: auditErr } = await supabase.from('audit_logs').insert({
        user_id: null,
        category: 'admin_broadcast',
        action: 'broadcast_published',
        metadata: {
          broadcast_id: inserted.id,
          title,
          severity: resolvedSeverity,
          performed_by: callerEmail,
        },
      });
      if (auditErr) {
        console.error('[admin-broadcast] Audit log failed:', auditErr.message);
      }

      return new Response(
        JSON.stringify({ success: true, broadcast: inserted }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (action === 'expire') {
      if (!id) {
        return new Response(
          JSON.stringify({ success: false, error: 'id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const { error: expireErr } = await supabase
        .from('broadcasts')
        .update({ active: false })
        .eq('id', id);

      if (expireErr) throw expireErr;

      const { error: auditErr } = await supabase.from('audit_logs').insert({
        user_id: null,
        category: 'admin_broadcast',
        action: 'broadcast_expired',
        metadata: { broadcast_id: id, performed_by: callerEmail },
      });
      if (auditErr) {
        console.error('[admin-broadcast] Audit log failed:', auditErr.message);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[admin-broadcast] Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
