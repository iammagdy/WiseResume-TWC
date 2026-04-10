import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { password, limit = 200, action_filter } = body as {
      password: string;
      limit?: number;
      action_filter?: string | null;
    };

    const devKitPassword = Deno.env.get('DEV_KIT_PASSWORD');
    if (!devKitPassword || password !== devKitPassword) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    let query = supabase
      .from('admin_user_notes')
      .select('id, user_id, note_text, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: logsData, error } = await supabase
      .from('admin_audit_log')
      .select('id, user_id, action, category, metadata, created_at, admin_notes')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 500));

    if (error) {
      if (error.code === '42P01') {
        return new Response(
          JSON.stringify({ success: true, logs: [], message: 'Audit log table not yet created. Run the migration to enable this.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let logs = logsData ?? [];
    if (action_filter) {
      logs = logs.filter((l) => l.action === action_filter);
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
