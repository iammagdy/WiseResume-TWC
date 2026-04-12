import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdminAuth } from '../_shared/adminAuth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { password, mode, limit = 200, action_filter, category_filter, entry } = body as {
      password: string;
      mode?: 'read' | 'write';
      limit?: number;
      action_filter?: string | null;
      category_filter?: string | null;
      entry?: {
        user_id: string;
        category: string;
        action: string;
        metadata: Record<string, unknown>;
      };
    };

    try {
      await requireAdminAuth(req, password);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Write mode: insert a single audit log entry via service role
    if (mode === 'write') {
      if (!entry || !entry.user_id || !entry.category || !entry.action) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing required entry fields: user_id, category, action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const { error: insertError } = await supabase
        .from('audit_logs')
        .insert({
          user_id: entry.user_id,
          category: entry.category,
          action: entry.action,
          metadata: entry.metadata ?? {},
        });

      if (insertError) {
        return new Response(
          JSON.stringify({ success: false, error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Default: read mode — list audit log entries
    let query = supabase
      .from('audit_logs')
      .select('id, user_id, action, category, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 500));

    if (action_filter) {
      query = query.eq('action', action_filter);
    }

    if (category_filter) {
      query = query.eq('category', category_filter);
    }

    const { data: logsData, error } = await query;

    if (error) {
      if (error.code === '42P01') {
        return new Response(
          JSON.stringify({ success: true, logs: [], message: 'audit_logs table not found. Ensure the database migration has been applied.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const logs = logsData ?? [];

    // Enrich logs with user email from profiles
    if (logs.length > 0) {
      const userIds = [...new Set(logs.map(l => l.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('user_id', userIds);

      const emailMap: Record<string, string> = {};
      if (profiles) {
        for (const p of profiles) {
          emailMap[p.user_id] = p.email;
        }
      }

      const enrichedLogs = logs.map(l => ({
        ...l,
        user_email: emailMap[l.user_id] ?? null,
      }));

      return new Response(
        JSON.stringify({ success: true, logs: enrichedLogs }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, logs }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
