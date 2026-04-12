import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      password,
      page = 1,
      per_page = 50,
      filter_plan,
      filter_status,
      sort = 'newest',
      search,
    } = body;

    try {
      await requireAdminAuth(req, password);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    const limit = Math.min(Math.max(1, Number(per_page) || 50), 200);
    const offset = Math.max(0, (Number(page) - 1) * limit);

    const supabase = getServiceClient();

    // Fetch all data in parallel — avoids the broken get_all_users_admin_v2 RPC
    // which incorrectly referenced short_links.user_id (actual col: owner_user_id).
    const [
      authResult,
      profilesResult,
      subscriptionsResult,
      resumesResult,
      linksResult,
      creditsResult,
    ] = await Promise.all([
      supabase.auth.admin.listUsers({ page: 1, perPage: 10000 }),
      supabase.from('profiles').select('user_id, full_name, created_at, is_suspended, suspension_reason'),
      supabase.from('subscriptions').select('user_id, plan_name, status, plan_updated_at, trial_plan, trial_expires_at'),
      supabase.from('resumes').select('user_id'),
      supabase.from('short_links').select('owner_user_id'),
      supabase.from('ai_credits').select('user_id, daily_usage, daily_limit, usage_date'),
    ]);

    if (authResult.error) {
      console.error('[admin-list-users] auth.admin.listUsers error:', authResult.error);
      return new Response(
        JSON.stringify({ success: false, error: authResult.error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build lookup maps
    const profileMap = new Map(
      (profilesResult.data ?? []).map((p: Record<string, unknown>) => [p.user_id as string, p])
    );
    const subsMap = new Map(
      (subscriptionsResult.data ?? []).map((s: Record<string, unknown>) => [s.user_id as string, s])
    );

    // Resume count per user
    const resumeCountMap = new Map<string, number>();
    for (const r of (resumesResult.data ?? []) as Array<{ user_id: string }>) {
      resumeCountMap.set(r.user_id, (resumeCountMap.get(r.user_id) ?? 0) + 1);
    }

    // Short link count per user (owner_user_id is the correct column)
    const linkCountMap = new Map<string, number>();
    for (const l of (linksResult.data ?? []) as Array<{ owner_user_id: string }>) {
      linkCountMap.set(l.owner_user_id, (linkCountMap.get(l.owner_user_id) ?? 0) + 1);
    }

    const creditsMap = new Map(
      (creditsResult.data ?? []).map((c: Record<string, unknown>) => [c.user_id as string, c])
    );

    const todayDate = new Date().toISOString().split('T')[0];

    // Build user records
    type UserRecord = {
      user_id: string;
      email: string | null;
      full_name: string | null;
      plan_name: string;
      plan_status: string;
      plan_updated_at: string | null;
      trial_plan: string | null;
      trial_expires_at: string | null;
      is_suspended: boolean;
      suspension_reason: string | null;
      created_at: string | null;
      last_sign_in_at: string | null;
      resume_count: number;
      link_count: number;
      credits_used_today: number;
      daily_limit: number | null;
    };

    let users: UserRecord[] = (authResult.data.users ?? []).map((au) => {
      const p = (profileMap.get(au.id) ?? {}) as Record<string, unknown>;
      const s = (subsMap.get(au.id) ?? {}) as Record<string, unknown>;
      const ac = (creditsMap.get(au.id) ?? {}) as Record<string, unknown>;
      // Only count daily_usage when usage_date matches today — stale rows count as 0
      const usageDate = ac.usage_date as string | undefined;
      const creditsUsedToday = usageDate === todayDate ? ((ac.daily_usage as number) ?? 0) : 0;
      return {
        user_id: au.id,
        email: au.email ?? null,
        full_name: (p.full_name as string) ?? null,
        plan_name: (s.plan_name as string) ?? 'free',
        plan_status: (s.status as string) ?? 'active',
        plan_updated_at: (s.plan_updated_at as string) ?? null,
        trial_plan: (s.trial_plan as string) ?? null,
        trial_expires_at: (s.trial_expires_at as string) ?? null,
        is_suspended: (p.is_suspended as boolean) ?? false,
        suspension_reason: (p.suspension_reason as string) ?? null,
        created_at: (p.created_at as string) ?? au.created_at ?? null,
        last_sign_in_at: au.last_sign_in_at ?? null,
        resume_count: resumeCountMap.get(au.id) ?? 0,
        link_count: linkCountMap.get(au.id) ?? 0,
        credits_used_today: creditsUsedToday,
        daily_limit: (ac.daily_limit as number) ?? null,
      };
    });

    // Apply search filter
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      users = users.filter(u =>
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.full_name ?? '').toLowerCase().includes(q) ||
        u.user_id.toLowerCase().startsWith(q)
      );
    }

    // Apply plan filter
    if (filter_plan && filter_plan.trim()) {
      const now = new Date();
      users = users.filter(u => {
        if (filter_plan === 'trial') {
          return u.trial_plan && u.trial_expires_at && new Date(u.trial_expires_at) > now;
        }
        if (filter_plan === 'suspended') return u.is_suspended;
        return u.plan_name === filter_plan;
      });
    }

    // Apply status filter
    if (filter_status && filter_status.trim()) {
      users = users.filter(u => u.plan_status === filter_status);
    }

    // Sort
    users.sort((a, b) => {
      switch (sort) {
        case 'newest':
          return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
        case 'oldest':
          return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
        case 'most_active':
          return new Date(b.last_sign_in_at ?? 0).getTime() - new Date(a.last_sign_in_at ?? 0).getTime();
        case 'most_resumes':
          return b.resume_count - a.resume_count;
        default:
          return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      }
    });

    const total = users.length;
    const paginatedUsers = users.slice(offset, offset + limit);

    return new Response(
      JSON.stringify({
        users: paginatedUsers,
        total,
        limit,
        offset,
      }),
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
