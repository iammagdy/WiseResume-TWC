import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { password, page = 1, per_page = 100 } = body;

    if (!password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SECRET_PASSWORD = Deno.env.get('DEV_KIT_PASSWORD') || 'thewisedeveloper';
    if (password !== SECRET_PASSWORD) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getServiceClient();

    // Fetch auth users list via admin API (includes email + last_sign_in_at)
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers({
      page,
      perPage: per_page,
    });

    if (authError) {
      console.error('[admin-list-users] Auth admin error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: authError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authUsers?.length) {
      return new Response(
        JSON.stringify({ success: true, users: [], total: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userIds = authUsers.map((u) => u.id);

    // Fetch profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, created_at')
      .in('user_id', userIds);

    // Fetch subscriptions
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('user_id, plan_name, status, plan_updated_at')
      .in('user_id', userIds);

    // Count resumes per user
    const { data: resumeCounts } = await supabase
      .from('resumes')
      .select('user_id')
      .in('user_id', userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    const subMap = new Map((subscriptions || []).map((s) => [s.user_id, s]));

    const resumeCountMap = new Map<string, number>();
    for (const r of resumeCounts || []) {
      resumeCountMap.set(r.user_id, (resumeCountMap.get(r.user_id) || 0) + 1);
    }

    const users = authUsers.map((authUser) => {
      const profile = profileMap.get(authUser.id);
      const sub = subMap.get(authUser.id);
      return {
        user_id: authUser.id,
        email: authUser.email ?? null,
        full_name: profile?.full_name ?? null,
        plan_name: sub?.plan_name ?? 'free',
        plan_status: sub?.status ?? 'active',
        plan_updated_at: sub?.plan_updated_at ?? null,
        joined_at: profile?.created_at ?? authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at ?? null,
        resume_count: resumeCountMap.get(authUser.id) ?? 0,
      };
    });

    // Sort by joined_at descending (newest first)
    users.sort((a, b) => {
      const ta = a.joined_at ? new Date(a.joined_at).getTime() : 0;
      const tb = b.joined_at ? new Date(b.joined_at).getTime() : 0;
      return tb - ta;
    });

    return new Response(
      JSON.stringify({ success: true, users, total: users.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[admin-list-users] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
