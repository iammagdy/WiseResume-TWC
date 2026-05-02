import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
Deno.serve(wrapHandler("admin-save-note", async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { target_user_id, note_text, action = 'save', note_id, actor_email } = body;

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

    // Delete a note
    if (action === 'delete') {
      if (!note_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'note_id is required for delete action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('admin_user_notes')
        .delete()
        .eq('id', note_id)
        .eq('user_id', target_user_id);

      if (error) {
        console.error('[admin-save-note] Delete error:', error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Write audit log entry
      await supabase
        .from('audit_logs')
        .insert({
          user_id: target_user_id,
          category: 'admin',
          action: 'note_deleted',
          metadata: { note_id, actor_email: actor_email ?? 'admin (dev-kit)' },
        });

      return new Response(
        JSON.stringify({ success: true }),
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

    // Write a note_added event to audit_logs for Activity tab visibility
    await supabase
      .from('audit_logs')
      .insert({
        user_id: target_user_id,
        category: 'admin',
        action: 'note_added',
        metadata: { note_preview: note_text.trim().slice(0, 80) },
      });

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
}));
