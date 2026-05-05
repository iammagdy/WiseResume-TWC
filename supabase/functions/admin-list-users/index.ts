/**
 * admin-list-users — Paged, filterable directory of Supabase auth users
 * joined with `profiles` for the DevKit "Users" pane.
 *
 * Trigger: DevKit Users tab (initial load + search + pagination); also the
 *   "Find user" autocomplete inside other admin panes.
 * Auth: ADMIN ONLY (`requireAdminAuth` — DevKit session token).
 * Dispatch contract: POST `{limit?, offset?, search?, plan_filter?,
 *   sort_by?, sort_dir?}`. Returns 200 `{success:true, users:[...],
 *   total:N}` where each user row carries auth + profile + plan/credit
 *   summary fields. Invalid sort args fall back to default ordering;
 *   unexpected throws → 500.
 */
import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
Deno.serve(wrapHandler("admin-list-users", async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let rawBody: Record<string, unknown> = {};
    try {
      rawBody = await req.json();
    } catch {
      // No JSON body — caller may be using query params only
    }
    const {
      page: bodyPage = 1,
      per_page: bodyPerPage = 50,
      filter_plan,
      filter_status,
      filter_unconfirmed: bodyFilterUnconfirmed,
      filter_identity_conflict: bodyFilterIdentityConflict,
      sort = 'newest',
      search,
    } = rawBody as {
      page?: number;
      per_page?: number;
      filter_plan?: string;
      filter_status?: string;
      filter_unconfirmed?: boolean | string;
      filter_identity_conflict?: boolean | string;
      sort?: string;
      search?: string;
    };

    // Accept filter_unconfirmed from query string OR request body
    const page = Number(url.searchParams.get('page') ?? bodyPage);
    const per_page = Number(url.searchParams.get('per_page') ?? bodyPerPage);
    const filter_unconfirmed =
      url.searchParams.get('filter_unconfirmed') === 'true' ||
      url.searchParams.get('filter_unconfirmed') === '1' ||
      bodyFilterUnconfirmed === true ||
      bodyFilterUnconfirmed === 'true';
    const filter_identity_conflict =
      url.searchParams.get('filter_identity_conflict') === 'true' ||
      url.searchParams.get('filter_identity_conflict') === '1' ||
      bodyFilterIdentityConflict === true ||
      bodyFilterIdentityConflict === 'true';

    try {
      await requireAdminAuth(req);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    const limit = Math.min(Math.max(1, Number(per_page) || 50), 200);
    const offset = Math.max(0, (Number(page) - 1) * limit);

    const supabase = getServiceClient();

    // Build user records
    type UserRecord = {
      user_id: string;
      email: string | null;
      contact_email: string | null;
      full_name: string | null;
      avatar_url: string | null;
      plan_name: string;
      account_type: string;
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
      email_confirmed_at: string | null;
      has_id_conflict: boolean;
      matched_via?: string;
    };

    const todayDate = new Date().toISOString().split('T')[0];

    // === Optimized path for filter_unconfirmed ===
    if (filter_unconfirmed) {
      const authResult = await supabase.auth.admin.listUsers({ page: 1, perPage: 10000 });
      if (authResult.error) {
        console.error('[admin-list-users] auth.admin.listUsers error:', authResult.error);
        return new Response(
          JSON.stringify({ success: false, error: authResult.error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const allUnconfirmed = (authResult.data.users ?? []).filter(u => !u.email_confirmed_at);

      // Fetch profiles for all unconfirmed users so search can match contact_email / full_name
      const allIds = allUnconfirmed.map(u => u.id);
      const profilesResult = allIds.length > 0
        ? await supabase.from('profiles').select('user_id, full_name, created_at, contact_email, account_type').in('user_id', allIds)
        : { data: [] };

      const profileMap = new Map(
        (profilesResult.data ?? []).map((p: Record<string, unknown>) => [p.user_id as string, p])
      );

      let unconfirmedAuthUsers = allUnconfirmed;

      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        unconfirmedAuthUsers = unconfirmedAuthUsers.filter(u => {
          const p = (profileMap.get(u.id) ?? {}) as Record<string, unknown>;
          return (
            (u.email ?? '').toLowerCase().includes(q) ||
            u.id.toLowerCase().startsWith(q) ||
            ((p.contact_email as string) ?? '').toLowerCase().includes(q) ||
            ((p.full_name as string) ?? '').toLowerCase().includes(q)
          );
        });
      }

      unconfirmedAuthUsers.sort((a, b) =>
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      );

      const total = unconfirmedAuthUsers.length;
      const pageSlice = unconfirmedAuthUsers.slice(offset, offset + limit);

      const users: UserRecord[] = pageSlice.map(au => {
        const p = (profileMap.get(au.id) ?? {}) as Record<string, unknown>;
        const isCollision = (au.email ?? '').endsWith('@collision.kinde.placeholder');
        const meta = (au.user_metadata ?? {}) as Record<string, unknown>;
        return {
          user_id: au.id,
          email: au.email ?? null,
          contact_email: (p.contact_email as string) ?? null,
          full_name: (p.full_name as string) ?? null,
          avatar_url: (meta.avatar_url as string) || (meta.picture as string) || null,
          plan_name: 'free',
          account_type: (p.account_type as string) ?? 'job_seeker',
          plan_status: 'active',
          plan_updated_at: null,
          trial_plan: null,
          trial_expires_at: null,
          is_suspended: false,
          suspension_reason: null,
          created_at: (p.created_at as string) ?? au.created_at ?? null,
          last_sign_in_at: au.last_sign_in_at ?? null,
          resume_count: 0,
          link_count: 0,
          credits_used_today: 0,
          daily_limit: null,
          email_confirmed_at: au.email_confirmed_at ?? null,
          has_id_conflict: isCollision,
        };
      });

      return new Response(
        JSON.stringify({ users, total, limit, offset }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === Standard path: full user list with all aggregates ===
    const [
      authResult,
      profilesResult,
      subscriptionsResult,
      resumesResult,
      linksResult,
      creditsResult,
    ] = await Promise.all([
      supabase.auth.admin.listUsers({ page: 1, perPage: 10000 }),
      supabase.from('profiles').select('user_id, full_name, created_at, is_suspended, suspension_reason, contact_email, account_type'),
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

    // Short link count per user
    const linkCountMap = new Map<string, number>();
    for (const l of (linksResult.data ?? []) as Array<{ owner_user_id: string }>) {
      linkCountMap.set(l.owner_user_id, (linkCountMap.get(l.owner_user_id) ?? 0) + 1);
    }

    const creditsMap = new Map(
      (creditsResult.data ?? []).map((c: Record<string, unknown>) => [c.user_id as string, c])
    );

    // Build a map of contact_email -> user_id for fast lookup during search
    const contactEmailToUserId = new Map<string, string>();
    for (const [uid, p] of profileMap.entries()) {
      const ce = (p as Record<string, unknown>).contact_email as string | undefined;
      if (ce) contactEmailToUserId.set(ce.toLowerCase(), uid);
    }

    let users: UserRecord[] = (authResult.data.users ?? []).map((au) => {
      const p = (profileMap.get(au.id) ?? {}) as Record<string, unknown>;
      const s = (subsMap.get(au.id) ?? {}) as Record<string, unknown>;
      const ac = (creditsMap.get(au.id) ?? {}) as Record<string, unknown>;
      const usageDate = ac.usage_date as string | undefined;
      const creditsUsedToday = usageDate === todayDate ? ((ac.daily_usage as number) ?? 0) : 0;
      const isCollision = (au.email ?? '').endsWith('@collision.kinde.placeholder');
      const meta = (au.user_metadata ?? {}) as Record<string, unknown>;
      return {
        user_id: au.id,
        email: au.email ?? null,
        contact_email: (p.contact_email as string) ?? null,
        full_name: (p.full_name as string) ?? null,
        avatar_url: (meta.avatar_url as string) || (meta.picture as string) || null,
        plan_name: (s.plan_name as string) ?? 'free',
        account_type: (p.account_type as string) ?? 'job_seeker',
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
        email_confirmed_at: au.email_confirmed_at ?? null,
        has_id_conflict: isCollision,
      };
    });

    // Apply identity conflict filter
    if (filter_identity_conflict) {
      // Include collision users (placeholder email) AND their orphan counterparts (matching real email)
      const collisionUsers = users.filter(u => u.has_id_conflict);
      const collisionContactEmails = new Set(
        collisionUsers.map(u => u.contact_email?.toLowerCase()).filter(Boolean)
      );
      // Orphan users: auth email matches a collision user's contact_email
      const orphanUsers = users.filter(u =>
        !u.has_id_conflict && u.email && collisionContactEmails.has(u.email.toLowerCase())
      );
      users = [...collisionUsers, ...orphanUsers];
    }

    // Apply search filter — checks auth email, contact_email, full_name, and user_id
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      users = users.map(u => {
        const matchAuthEmail = (u.email ?? '').toLowerCase().includes(q);
        const matchContactEmail = (u.contact_email ?? '').toLowerCase().includes(q);
        const matchName = (u.full_name ?? '').toLowerCase().includes(q);
        const matchId = u.user_id.toLowerCase().startsWith(q);
        if (!matchAuthEmail && !matchContactEmail && !matchName && !matchId) return null;
        let matched_via = 'id';
        if (matchAuthEmail) matched_via = 'auth_email';
        else if (matchContactEmail) matched_via = 'contact_email';
        else if (matchName) matched_via = 'name';
        return { ...u, matched_via };
      }).filter(u => u !== null) as UserRecord[];

      // If a collision user's contact_email matches the search, also include the orphan (real email user)
      const contactMatches = users.filter(u => u.matched_via === 'contact_email' && u.has_id_conflict);
      for (const collision of contactMatches) {
        if (collision.contact_email) {
          const orphanEmail = collision.contact_email.toLowerCase();
          // Check if the orphan is already in the results
          const alreadyIncluded = users.some(u => (u.email ?? '').toLowerCase() === orphanEmail);
          if (!alreadyIncluded) {
            // Find the orphan in the original authResult
            const orphanAuth = (authResult.data.users ?? []).find(au =>
              (au.email ?? '').toLowerCase() === orphanEmail
            );
            if (orphanAuth) {
              const p = (profileMap.get(orphanAuth.id) ?? {}) as Record<string, unknown>;
              const s = (subsMap.get(orphanAuth.id) ?? {}) as Record<string, unknown>;
              const ac = (creditsMap.get(orphanAuth.id) ?? {}) as Record<string, unknown>;
              const usageDate = ac.usage_date as string | undefined;
              const creditsUsedToday = usageDate === todayDate ? ((ac.daily_usage as number) ?? 0) : 0;
              const orphanMeta = (orphanAuth.user_metadata ?? {}) as Record<string, unknown>;
              users.push({
                user_id: orphanAuth.id,
                email: orphanAuth.email ?? null,
                contact_email: (p.contact_email as string) ?? null,
                full_name: (p.full_name as string) ?? null,
                avatar_url: (orphanMeta.avatar_url as string) || (orphanMeta.picture as string) || null,
                plan_name: (s.plan_name as string) ?? 'free',
                account_type: (p.account_type as string) ?? 'job_seeker',
                plan_status: (s.status as string) ?? 'active',
                plan_updated_at: (s.plan_updated_at as string) ?? null,
                trial_plan: (s.trial_plan as string) ?? null,
                trial_expires_at: (s.trial_expires_at as string) ?? null,
                is_suspended: (p.is_suspended as boolean) ?? false,
                suspension_reason: (p.suspension_reason as string) ?? null,
                created_at: (p.created_at as string) ?? orphanAuth.created_at ?? null,
                last_sign_in_at: orphanAuth.last_sign_in_at ?? null,
                resume_count: resumeCountMap.get(orphanAuth.id) ?? 0,
                link_count: linkCountMap.get(orphanAuth.id) ?? 0,
                credits_used_today: creditsUsedToday,
                daily_limit: (ac.daily_limit as number) ?? null,
                email_confirmed_at: orphanAuth.email_confirmed_at ?? null,
                has_id_conflict: false,
                matched_via: 'contact_email',
              });
            }
          }
        }
      }

      // Also: if the search matches a real email that is the contact_email of a collision user,
      // include both that real email user AND the collision user
      const authEmailMatches = users.filter(u => u.matched_via === 'auth_email' && !u.has_id_conflict);
      for (const orphan of authEmailMatches) {
        if (orphan.email) {
          const orphanEmailLower = orphan.email.toLowerCase();
          // Find collision user whose contact_email matches this real email
          const collisionAlreadyIn = users.some(u => u.has_id_conflict && (u.contact_email ?? '').toLowerCase() === orphanEmailLower);
          if (!collisionAlreadyIn) {
            const collisionUser = (authResult.data.users ?? []).find(au =>
              (au.email ?? '').endsWith('@collision.kinde.placeholder')
            );
            // Find among all users in authResult where profile.contact_email matches
            const allProfiles = profilesResult.data ?? [];
            const matchingProfile = (allProfiles as Array<Record<string, unknown>>).find(
              pp => (pp.contact_email as string | undefined)?.toLowerCase() === orphanEmailLower
            );
            if (matchingProfile) {
              const collisionUid = matchingProfile.user_id as string;
              const alreadyIn = users.some(u => u.user_id === collisionUid);
              if (!alreadyIn) {
                const collisionAuth = (authResult.data.users ?? []).find(au => au.id === collisionUid);
                if (collisionAuth) {
                  const p2 = (profileMap.get(collisionUid) ?? {}) as Record<string, unknown>;
                  const s2 = (subsMap.get(collisionUid) ?? {}) as Record<string, unknown>;
                  const ac2 = (creditsMap.get(collisionUid) ?? {}) as Record<string, unknown>;
                  const usageDate2 = ac2.usage_date as string | undefined;
                  const creditsUsedToday2 = usageDate2 === todayDate ? ((ac2.daily_usage as number) ?? 0) : 0;
                  const isCollision2 = (collisionAuth.email ?? '').endsWith('@collision.kinde.placeholder');
                  const collisionMeta = (collisionAuth.user_metadata ?? {}) as Record<string, unknown>;
                  users.push({
                    user_id: collisionAuth.id,
                    email: collisionAuth.email ?? null,
                    contact_email: (p2.contact_email as string) ?? null,
                    full_name: (p2.full_name as string) ?? null,
                    avatar_url: (collisionMeta.avatar_url as string) || (collisionMeta.picture as string) || null,
                    plan_name: (s2.plan_name as string) ?? 'free',
                    account_type: (p2.account_type as string) ?? 'job_seeker',
                    plan_status: (s2.status as string) ?? 'active',
                    plan_updated_at: (s2.plan_updated_at as string) ?? null,
                    trial_plan: (s2.trial_plan as string) ?? null,
                    trial_expires_at: (s2.trial_expires_at as string) ?? null,
                    is_suspended: (p2.is_suspended as boolean) ?? false,
                    suspension_reason: (p2.suspension_reason as string) ?? null,
                    created_at: (p2.created_at as string) ?? collisionAuth.created_at ?? null,
                    last_sign_in_at: collisionAuth.last_sign_in_at ?? null,
                    resume_count: resumeCountMap.get(collisionAuth.id) ?? 0,
                    link_count: linkCountMap.get(collisionAuth.id) ?? 0,
                    credits_used_today: creditsUsedToday2,
                    daily_limit: (ac2.daily_limit as number) ?? null,
                    email_confirmed_at: collisionAuth.email_confirmed_at ?? null,
                    has_id_conflict: isCollision2,
                    matched_via: 'contact_email',
                  });
                }
              }
            }
          }
        }
      }
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
}));
