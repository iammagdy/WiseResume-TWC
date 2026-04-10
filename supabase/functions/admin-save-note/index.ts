import { getServiceClient } from '../_shared/dbClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SECRET_PASSWORD = Deno.env.get('DEV_KIT_PASSWORD');
  if (!SECRET_PASSWORD) {
    return new Response(
      JSON.stringify({ success: false, error: 'Admin functions are not configured' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { password, target_user_id, note_text, action = 'save' } = body;

    if (!password || password !== SECRET_PASSWORD) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!target_user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'target_user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getServiceClient();

    // List notes for a user
    if (action === 'list') {
      const { data, error } = await supabase
        .from('admin_user_notes')
        .select('id, note_text, created_at')
        .eq('user_id', target_user_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        return new Response(
          JSON.stringify({ success: true, notes: [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: true, notes: data ?? [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save a new note
    if (!note_text?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'note_text is required for save action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await supabase
      .from('admin_user_notes')
      .insert({ user_id: target_user_id, note_text: note_text.trim() })
      .select()
      .single();

    if (error) {
      console.error('[admin-save-note] DB error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, note: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[admin-save-note] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
