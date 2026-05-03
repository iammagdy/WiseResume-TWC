/**
 * admin-merge-identity — Consolidate two user records (e.g. duplicate
 * Kinde shadow + native Supabase signup for the same email) into one
 * canonical identity, preserving the higher plan/credit balance.
 *
 * Trigger: DevKit "Merge identity" workflow, typically initiated after
 *   `admin-get-identity` surfaces a duplicate.
 * Auth: ADMIN ONLY (`requireAdminAuth` — DevKit session token).
 * Dispatch contract: POST `{primary_user_id, secondary_user_id,
 *   actor_email?}`. Re-points content rows from secondary → primary,
 *   keeps the better plan tier (PLAN_RANK), sums credits, deletes the
 *   secondary auth row, and writes one `audit_logs` entry. Returns 200
 *   `{success:true, merged:{...summary}}` or 4xx with the failure reason.
 */
import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
/** Plan tier ordering for comparison — higher index = better plan */
const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, premium: 2 };

Deno.serve(wrapHandler("admin-merge-identity", async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { collision_user_id } = body as {
      collision_user_id?: string;
    };

    try {
      await requireAdminAuth(req);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    if (!collision_user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'collision_user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getServiceClient();

    // 1. Load the collision (shadow) user's auth record
    const { data: shadowAuthData, error: shadowAuthErr } = await supabase.auth.admin.getUserById(collision_user_id);
    if (shadowAuthErr || !shadowAuthData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Collision user not found in auth.users' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const shadowUser = shadowAuthData.user;

    if (!(shadowUser.email ?? '').endsWith('@collision.kinde.placeholder')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Specified user is not a collision user (email does not end in @collision.kinde.placeholder)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Load the collision user's profile to get contact_email (the real email).
    // Uses maybeSingle so a missing profile row returns a clean 404 not_found
    // instead of a PGRST116 noise log.
    const { data: shadowProfile, error: shadowProfileErr } = await supabase
      .from('profiles')
      .select('user_id, full_name, contact_email, avatar_url')
      .eq('user_id', collision_user_id)
      .maybeSingle();

    if (shadowProfileErr || !shadowProfile) {
      return new Response(
        JSON.stringify({ success: false, error: 'not_found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const realEmail = (shadowProfile as Record<string, unknown>).contact_email as string | null;
    if (!realEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'Collision user has no contact_email — cannot find orphan account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Find the orphan user (User A) by real email in auth.users
    const authListResult = await supabase.auth.admin.listUsers({ page: 1, perPage: 10000 });
    if (authListResult.error) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to list auth users: ' + authListResult.error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const orphanAuthUser = (authListResult.data.users ?? []).find(u =>
      (u.email ?? '').toLowerCase() === realEmail.toLowerCase() &&
      u.id !== collision_user_id
    );

    if (!orphanAuthUser) {
      return new Response(
        JSON.stringify({ success: false, error: `No orphan user found with email: ${realEmail}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orphanUserId = orphanAuthUser.id;

    // 4. Load both subscriptions and profiles in parallel
    const [orphanSubResult, shadowSubResult, orphanProfileResult] = await Promise.all([
      supabase.from('subscriptions').select('plan_name, status, trial_plan, trial_expires_at').eq('user_id', orphanUserId).maybeSingle(),
      supabase.from('subscriptions').select('plan_name, status, trial_plan, trial_expires_at').eq('user_id', collision_user_id).maybeSingle(),
      supabase.from('profiles').select('full_name, avatar_url, contact_email').eq('user_id', orphanUserId).maybeSingle(),
    ]);

    const orphanSub = orphanSubResult.data as Record<string, unknown> | null;
    const shadowSub = shadowSubResult.data as Record<string, unknown> | null;
    const orphanProfile = orphanProfileResult.data as Record<string, unknown> | null;

    const now = new Date().toISOString();
    const mergeLog: string[] = [];

    // 5. Copy subscription from orphan to shadow if orphan has a better plan
    const orphanPlanName = (orphanSub?.plan_name as string) ?? 'free';
    const shadowPlanName = (shadowSub?.plan_name as string) ?? 'free';
    const orphanRank = PLAN_RANK[orphanPlanName] ?? 0;
    const shadowRank = PLAN_RANK[shadowPlanName] ?? 0;

    if (orphanRank > shadowRank) {
      const { error: subUpsertErr } = await supabase
        .from('subscriptions')
        .upsert(
          {
            user_id: collision_user_id,
            plan_name: orphanPlanName,
            status: (orphanSub?.status as string) ?? 'active',
            plan_updated_at: now,
            trial_plan: (orphanSub?.trial_plan as string) ?? null,
            trial_expires_at: (orphanSub?.trial_expires_at as string) ?? null,
          },
          { onConflict: 'user_id' }
        );
      if (subUpsertErr) {
        console.error('[admin-merge-identity] subscription copy error:', subUpsertErr);
      } else {
        mergeLog.push(`Copied plan from orphan: ${orphanPlanName}`);
      }
    } else {
      mergeLog.push(`Shadow plan (${shadowPlanName}) >= orphan plan (${orphanPlanName}) — no subscription change`);
    }

    // 6. Copy profile fields from orphan to shadow where shadow fields are empty
    const shadowFullName = (shadowProfile as Record<string, unknown>).full_name as string | null;
    const shadowAvatarUrl = (shadowProfile as Record<string, unknown>).avatar_url as string | null;
    const orphanFullName = orphanProfile?.full_name as string | null;
    const orphanAvatarUrl = orphanProfile?.avatar_url as string | null;

    const profileUpdates: Record<string, unknown> = {};
    if (!shadowFullName && orphanFullName) {
      profileUpdates.full_name = orphanFullName;
    }
    if (!shadowAvatarUrl && orphanAvatarUrl) {
      profileUpdates.avatar_url = orphanAvatarUrl;
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileUpdateErr } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('user_id', collision_user_id);
      if (profileUpdateErr) {
        console.error('[admin-merge-identity] profile copy error:', profileUpdateErr);
      } else {
        mergeLog.push(`Copied profile fields: ${Object.keys(profileUpdates).join(', ')}`);
      }
    } else {
      mergeLog.push('No profile fields needed from orphan');
    }

    // 7. Suspend the orphan user with reason merged_into:{shadowUserId}
    const { error: suspendErr } = await supabase
      .from('profiles')
      .update({
        is_suspended: true,
        suspension_reason: `merged_into:${collision_user_id}`,
      })
      .eq('user_id', orphanUserId);

    if (suspendErr) {
      console.error('[admin-merge-identity] suspend orphan error:', suspendErr);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to suspend orphan user: ' + suspendErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    mergeLog.push(`Orphan user (${orphanUserId}) suspended with reason merged_into:${collision_user_id}`);

    // 8. Write audit log
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: collision_user_id,
        action: 'identity_merged',
        category: 'admin',
        metadata: {
          orphan_user_id: orphanUserId,
          orphan_email: realEmail,
          shadow_user_id: collision_user_id,
          plan_transferred: orphanRank > shadowRank ? orphanPlanName : null,
          profile_fields_copied: Object.keys(profileUpdates),
          merge_log: mergeLog,
          merged_at: now,
          updated_by: 'dev-kit',
        },
        created_at: now,
      });

    if (auditError) {
      console.warn('[admin-merge-identity] audit log error (non-fatal):', auditError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        orphan_user_id: orphanUserId,
        shadow_user_id: collision_user_id,
        merge_log: mergeLog,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[admin-merge-identity] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
