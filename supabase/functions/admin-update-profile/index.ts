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
    const body = await req.json();
    const { password, target_user_id, full_name, username, actor_email, action } = body as {
      password: string;
      target_user_id: string;
      full_name?: string;
      username?: string;
      actor_email?: string;
      action?: string;
    };

    try {
      await requireAdminAuth(req, password);
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

    // === GET action: return profile fields without mutating anything ===
    if (action === 'get') {
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('username, portfolio_enabled, full_name')
        .eq('user_id', target_user_id)
        .single();

      if (fetchError) {
        console.error('[admin-update-profile] GET fetch error:', fetchError);
        return new Response(
          JSON.stringify({ success: false, error: fetchError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, profile }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === UPDATE action (default) ===
    if (full_name === undefined && username === undefined) {
      return new Response(
        JSON.stringify({ success: false, error: 'At least one field (full_name or username) is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the current profile for old-value tracking
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('user_id', target_user_id)
      .single();

    if (fetchError) {
      console.error('[admin-update-profile] Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If username is being changed, check uniqueness
    if (username !== undefined && username !== currentProfile?.username) {
      const cleanUsername = username.toLowerCase().trim();
      if (!cleanUsername) {
        return new Response(
          JSON.stringify({ success: false, error: 'Username cannot be empty' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: available, error: rpcError } = await supabase.rpc('check_username_available', {
        p_username: cleanUsername,
        p_user_id: target_user_id,
      });

      if (rpcError) {
        console.error('[admin-update-profile] Username check error:', rpcError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to check username availability: ' + rpcError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!available) {
        return new Response(
          JSON.stringify({ success: false, error: 'Username is already taken' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Build update payload
    const updates: Record<string, string | null> = {};
    const changedFields: Record<string, { old: unknown; new: unknown }> = {};

    if (full_name !== undefined && full_name !== currentProfile?.full_name) {
      updates.full_name = full_name || null;
      changedFields.full_name = { old: currentProfile?.full_name ?? null, new: full_name || null };
    }

    if (username !== undefined && username.toLowerCase().trim() !== currentProfile?.username) {
      updates.username = username.toLowerCase().trim();
      changedFields.username = { old: currentProfile?.username ?? null, new: username.toLowerCase().trim() };
    }

    if (Object.keys(updates).length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No changes to save', profile: currentProfile }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Apply updates
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', target_user_id)
      .select('full_name, username')
      .single();

    if (updateError) {
      console.error('[admin-update-profile] Update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Write audit log entry
    try {
      await supabase.from('audit_logs' as never).insert({
        user_id: target_user_id,
        category: 'admin',
        action: 'profile_update',
        metadata: {
          changed_fields: changedFields,
          actor_email: actor_email ?? 'admin (dev-kit)',
          updated_by: 'dev-kit',
        },
      });
    } catch (auditErr) {
      console.warn('[admin-update-profile] Audit log failed:', auditErr);
    }

    // Server-side portfolio cache invalidation when username changes.
    // The portfolio-meta edge function serves responses with Cache-Control: max-age=300.
    // We bust the cache for both old and new slugs by updating the profile's updated_at
    // timestamp (which the DB update already does), and by explicitly re-fetching both
    // slugs with cache-busting headers so any Supabase/CDN layer serves fresh content.
    if (changedFields.username) {
      const supabaseUrl = Deno.env.get('EXT_SUPABASE_URL') || Deno.env.get('SUPABASE_URL');
      if (supabaseUrl) {
        const slugsToInvalidate = [
          changedFields.username.old as string,
          changedFields.username.new as string,
        ].filter(Boolean);

        // Fire-and-forget: warm the portfolio-meta endpoint with no-cache headers
        // to invalidate the old cached response for each slug
        for (const slug of slugsToInvalidate) {
          fetch(
            `${supabaseUrl}/functions/v1/portfolio-meta?username=${encodeURIComponent(slug)}&_bust=${Date.now()}`,
            {
              method: 'GET',
              headers: {
                'Cache-Control': 'no-cache, no-store',
                'Pragma': 'no-cache',
                'User-Agent': 'admin-cache-invalidator/1.0',
              },
            }
          ).catch((e) => console.warn('[admin-update-profile] Cache bust failed for slug', slug, e));
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, profile: updatedProfile, changed_fields: changedFields }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[admin-update-profile] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
