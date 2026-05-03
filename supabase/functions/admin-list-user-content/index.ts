/**
 * admin-list-user-content — Inventory of every user-owned row across the
 * core content tables (resumes, portfolios, cover letters, AI chats, etc.)
 * for one target user.
 *
 * Trigger: DevKit "User detail → Content" tab; also called by support
 *   workflows that need a one-shot view of a user's footprint before
 *   delete or merge operations.
 * Auth: ADMIN ONLY (`requireAdminAuth` — DevKit session token).
 * Dispatch contract: POST `{target_user_id}`. Returns 200
 *   `{success:true, content:{resumes:[...], portfolios:[...], ...}}` —
 *   each list is capped (typically 50 rows) and pre-projected to the
 *   minimum fields the UI renders. Missing input → 400; unexpected
 *   throw → 500.
 */
import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
Deno.serve(wrapHandler("admin-list-user-content", async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { target_user_id, resume_id } = body as {
      target_user_id?: string;
      resume_id?: string;
    };

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

    // If a specific resume_id is requested, return its full JSON
    if (resume_id) {
      const { data, error } = await supabase
        .from('resumes')
        .select('id, title, template_id, content, updated_at')
        .eq('id', resume_id)
        .eq('user_id', target_user_id)
        .maybeSingle();

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!data) {
        return new Response(
          JSON.stringify({ success: false, error: 'not_found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, resume: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // List all resumes (compact, without full content)
    const { data, error } = await supabase
      .from('resumes')
      .select('id, title, template_id, updated_at')
      .eq('user_id', target_user_id)
      .order('updated_at', { ascending: false })
      .limit(100);

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, resumes: data ?? [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[admin-list-user-content] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
