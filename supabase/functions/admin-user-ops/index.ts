// admin-user-ops: consolidated router for the 7 admin user-lifecycle
// edge functions. See task #51 + EDGE_FUNCTION_AUDIT.md for rationale.
//
// Dispatch contract (per task spec):
//   PRIMARY: `body.action` ∈ {
//     "suspend", "grant-trial", "revoke-trial", "set-credits",
//     "set-plan", "revoke-sessions", "update-profile"
//   }
//   FALLBACK: `x-admin-user-op` request header (used ONLY when the
//   body is unparseable, so admin-revoke-sessions can still dispatch
//   to its handler and reproduce the original 400 envelope on
//   malformed bodies — the only way to keep byte-for-byte parity for
//   that handler without forcing the router to swallow parse errors
//   silently for the other 6).
//
// Parity strategy: the router buffers the request body ONCE as text
// at the top, then hands the text string (not a parsed object) to
// each handler. Each handler does its OWN JSON.parse inside its
// original try/catch wrapper, so each handler preserves its
// original parse-vs-validation-vs-throw semantics byte-for-byte:
//
//   - 6 of 7 originals parsed body in the handler body and threw to
//     outer try/catch on parse failure → 500 "Internal server error"
//     (or for revoke-trial, 500 String(err)).
//   - admin-revoke-sessions parsed body in an INNER try/catch with
//     `body = {}` default → malformed body → 400 "target_user_id is
//     required", NOT 500.
//
// Single documented router-boundary deviation from originals:
// `requireAdminAuth` runs ONCE at the top of `serve` (per task spec
// — explicit "do not duplicate per action"). The 6 parse-first
// originals had auth AFTER body parsing, so an unauthenticated call
// with a malformed body returned 500 from the parse-fail path.
// In the merged router, auth runs first → returns 401. No real
// client (web helper, mobile, server-side proxy) ever hits this
// case. The Playwright spec asserts the new 401 behavior so the
// deviation is captured in CI.
//
// Explicitly NOT included (kept isolated for blast-radius / audit
// clarity): admin-delete-user. Do NOT merge it here.

import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { addContact, removeContact } from '../_shared/resendAudiences.ts';
import { getAudienceId, AUDIENCE_KEYS } from '../_shared/resendConfig.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';

function jsonResponse(payload: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify(payload),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ─── suspend (was admin-suspend-user) ───────────────────────────────────
// Original: parse body → (auth was here) → validate → RPC. Outer
// try/catch returns 500 'Internal server error' on any throw
// (including JSON.parse failures), matching the original.
async function handleSuspend(bodyText: string, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = JSON.parse(bodyText);
    const { target_user_id, suspend, reason } = body;

    if (!target_user_id) {
      return jsonResponse({ success: false, error: 'target_user_id is required' }, 400, corsHeaders);
    }

    const supabase = getServiceClient();

    const { data, error } = await supabase.rpc('admin_suspend_user', {
      p_target_user_id: target_user_id,
      p_suspend: suspend === true,
      p_reason: reason || null,
    });

    if (error) {
      console.error('[admin-suspend-user] RPC error:', error);
      return jsonResponse({ success: false, error: error.message }, 500, corsHeaders);
    }

    return jsonResponse(data, 200, corsHeaders);
  } catch (err) {
    console.error('[admin-suspend-user] Unexpected error:', err);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500, corsHeaders);
  }
}

// ─── grant-trial (was admin-grant-trial) ────────────────────────────────
// Original: parse body → (auth was here) → validate → RPC. Parse
// failure → outer catch → 500 'Internal server error'.
async function handleGrantTrial(bodyText: string, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = JSON.parse(bodyText);
    const { target_user_id, plan, days } = body;

    if (!target_user_id || !plan || !days) {
      return jsonResponse(
        { success: false, error: 'target_user_id, plan, and days are required' },
        400,
        corsHeaders,
      );
    }

    const cleanPlan = String(plan).toLowerCase().trim();
    if (!['pro', 'premium'].includes(cleanPlan)) {
      return jsonResponse(
        { success: false, error: 'Trial plan must be pro or premium' },
        400,
        corsHeaders,
      );
    }

    const numDays = Math.min(Math.max(1, Number(days)), 365);

    const supabase = getServiceClient();

    const { data, error } = await supabase.rpc('admin_grant_trial', {
      p_target_user_id: target_user_id,
      p_trial_plan: cleanPlan,
      p_days: numDays,
    });

    if (error) {
      console.error('[admin-grant-trial] RPC error:', error);
      return jsonResponse({ success: false, error: error.message }, 500, corsHeaders);
    }

    return jsonResponse(data, 200, corsHeaders);
  } catch (err) {
    console.error('[admin-grant-trial] Unexpected error:', err);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500, corsHeaders);
  }
}

// ─── revoke-trial (was admin-revoke-trial) ──────────────────────────────
// Original: parse body → (auth was here) → validate → RPC. Parse
// failure → outer catch → 500 with String(err) (NOT 'Internal server
// error' — original used `String(err)`).
async function handleRevokeTrial(bodyText: string, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = JSON.parse(bodyText);
    const { target_user_id } = body as { target_user_id: string };

    if (!target_user_id) {
      return jsonResponse({ success: false, error: 'target_user_id is required' }, 400, corsHeaders);
    }

    // Original used a directly-constructed client (not getServiceClient).
    // Keep the same construction to preserve byte-for-byte behaviour.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { error } = await supabase.rpc('admin_revoke_trial', {
      p_target_user_id: target_user_id,
    });

    if (error) {
      return jsonResponse({ success: false, error: error.message }, 500, corsHeaders);
    }

    return jsonResponse({ success: true }, 200, corsHeaders);
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) }, 500, corsHeaders);
  }
}

// ─── set-credits (was admin-set-credits) ────────────────────────────────
async function handleSetCredits(bodyText: string, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = JSON.parse(bodyText);
    const { target_user_id, daily_limit, bonus_credits } = body;

    if (!target_user_id) {
      return jsonResponse({ success: false, error: 'target_user_id is required' }, 400, corsHeaders);
    }

    const parsedLimit: number | undefined =
      daily_limit !== undefined && daily_limit !== null ? Number(daily_limit) : undefined;
    const parsedBonus: number =
      bonus_credits !== undefined && bonus_credits !== null ? Number(bonus_credits) : 0;

    if (parsedLimit === undefined && parsedBonus === 0) {
      return jsonResponse(
        { success: false, error: 'Provide daily_limit, bonus_credits, or both' },
        400,
        corsHeaders,
      );
    }

    const supabase = getServiceClient();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const { data: currentRow, error: fetchError } = await supabase
      .from('ai_credits')
      .select('daily_usage, daily_limit, usage_date, total_usage')
      .eq('user_id', target_user_id)
      .maybeSingle();

    if (fetchError) {
      console.error('[admin-set-credits] fetch error:', fetchError);
      return jsonResponse({ success: false, error: fetchError.message }, 500, corsHeaders);
    }

    const existingUsage: number =
      currentRow && currentRow.usage_date === today ? (currentRow.daily_usage ?? 0) : 0;
    const newUsage: number =
      parsedBonus > 0 ? Math.max(0, existingUsage - parsedBonus) : existingUsage;

    let newLimit: number;
    if (parsedLimit !== undefined) {
      newLimit = parsedLimit;
    } else if (currentRow?.daily_limit !== undefined && currentRow.daily_limit !== null) {
      newLimit = currentRow.daily_limit;
    } else {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan_name')
        .eq('user_id', target_user_id)
        .maybeSingle();
      const planName = String((sub as { plan_name?: string } | null)?.plan_name ?? 'free').toLowerCase();
      const PLAN_LIMITS: Record<string, number> = { free: 5, pro: 100, premium: -1 };
      newLimit = PLAN_LIMITS[planName] ?? 5;
    }

    const { error: upsertError } = await supabase
      .from('ai_credits')
      .upsert(
        {
          user_id: target_user_id,
          daily_limit: newLimit,
          daily_usage: newUsage,
          total_usage: currentRow?.total_usage ?? 0,
          usage_date: today,
          updated_at: now,
        },
        { onConflict: 'user_id' }
      );

    if (upsertError) {
      console.error('[admin-set-credits] upsert error:', upsertError);
      return jsonResponse({ success: false, error: upsertError.message }, 500, corsHeaders);
    }

    try {
      const effectiveRemaining = newLimit >= 0 ? newLimit - newUsage : Infinity;
      const LOW_CREDIT_THRESHOLD = 10;
      const lowCreditAudienceId = getAudienceId(AUDIENCE_KEYS.LOW_CREDITS);
      if (lowCreditAudienceId) {
        const { data: authUser } = await supabase.auth.admin.getUserById(target_user_id);
        const userEmail = authUser?.user?.email;
        if (userEmail && !userEmail.endsWith('@kinde.placeholder')) {
          if (effectiveRemaining < LOW_CREDIT_THRESHOLD) {
            addContact(lowCreditAudienceId, { email: userEmail }).catch(() => {});
          } else {
            removeContact(lowCreditAudienceId, userEmail).catch(() => {});
          }
        }
      }
    } catch (audienceErr) {
      console.warn('[admin-set-credits] audience update error (non-fatal):', audienceErr);
    }

    // Audit log: same `category` ('credits') and `action` ('credits_override')
    // as the pre-merge function — existing dashboards keep working.
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: target_user_id,
        action: 'credits_override',
        category: 'credits',
        metadata: {
          daily_limit: parsedLimit ?? null,
          bonus_credits: parsedBonus,
          resolved_daily_limit: newLimit,
          updated_by: 'dev-kit',
          updated_at: now,
        },
        created_at: now,
      });

    if (auditError) {
      console.warn('[admin-set-credits] audit log error (non-fatal):', auditError);
    }

    return jsonResponse(
      {
        success: true,
        daily_limit: newLimit,
        bonus_credits: parsedBonus,
        updated_at: now,
      },
      200,
      corsHeaders,
    );
  } catch (err) {
    console.error('[admin-set-credits] Unexpected error:', err);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500, corsHeaders);
  }
}

// ─── set-plan (was admin-set-plan) ──────────────────────────────────────
// Audit log uses `category:'plan'`, `action:'plan_change'` (preserved).
const PLAN_DAILY_LIMITS: Record<string, number> = {
  free: 5,
  pro: 100,
  premium: -1,
};

async function handleSetPlan(bodyText: string, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = JSON.parse(bodyText);
    const { target_user_id, email, plan } = body;

    if (!plan) {
      return jsonResponse({ success: false, error: 'plan is required' }, 400, corsHeaders);
    }

    if (!target_user_id && !email) {
      return jsonResponse(
        { success: false, error: 'Either target_user_id or email is required' },
        400,
        corsHeaders,
      );
    }

    const cleanPlan = String(plan).toLowerCase().trim();
    if (!['free', 'pro', 'premium'].includes(cleanPlan)) {
      return jsonResponse(
        { success: false, error: 'plan must be one of: free, pro, premium' },
        400,
        corsHeaders,
      );
    }

    const supabase = getServiceClient();

    let resolvedUserId: string = target_user_id ?? '';

    if (!resolvedUserId && email) {
      const cleanEmail = String(email).toLowerCase().trim();

      const { data: profileMatch, error: profileLookupErr } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('contact_email', cleanEmail)
        .limit(1)
        .maybeSingle();

      if (!profileLookupErr && profileMatch) {
        resolvedUserId = profileMatch.user_id as string;
        console.log(`[admin-set-plan] Resolved user by contact_email: ${resolvedUserId}`);
      } else {
        const authListResult = await supabase.auth.admin.listUsers({ page: 1, perPage: 10000 });
        if (authListResult.error) {
          return jsonResponse(
            { success: false, error: 'Failed to list auth users: ' + authListResult.error.message },
            500,
            corsHeaders,
          );
        }
        const match = (authListResult.data.users ?? []).find(u =>
          (u.email ?? '').toLowerCase() === cleanEmail
        );
        if (match) {
          resolvedUserId = match.id;
          console.log(`[admin-set-plan] Resolved user by auth.users.email: ${resolvedUserId}`);
        }
      }

      if (!resolvedUserId) {
        return jsonResponse(
          { success: false, error: `No user found with email: ${cleanEmail}` },
          404,
          corsHeaders,
        );
      }
    }

    const now = new Date().toISOString();
    const newDailyLimit = PLAN_DAILY_LIMITS[cleanPlan];

    const { error: subsError } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: resolvedUserId,
          plan_name: cleanPlan,
          plan_updated_at: now,
          status: 'active',
        },
        { onConflict: 'user_id' }
      );

    if (subsError) {
      console.error('[admin-set-plan] subscriptions upsert error:', subsError);
      return jsonResponse({ success: false, error: subsError.message }, 500, corsHeaders);
    }

    const today = new Date().toISOString().split('T')[0];

    const { data: updatedCredits, error: creditsUpdateError } = await supabase
      .from('ai_credits')
      .update({ daily_limit: newDailyLimit })
      .eq('user_id', resolvedUserId)
      .select('user_id');

    if (creditsUpdateError) {
      console.error('[admin-set-plan] ai_credits update error:', creditsUpdateError);
      return jsonResponse({ success: false, error: creditsUpdateError.message }, 500, corsHeaders);
    }

    if (!updatedCredits || updatedCredits.length === 0) {
      const { error: creditsInsertError } = await supabase
        .from('ai_credits')
        .insert({
          user_id: resolvedUserId,
          daily_limit: newDailyLimit,
          daily_usage: 0,
          total_usage: 0,
          usage_date: today,
        });

      if (creditsInsertError) {
        if (creditsInsertError.code === '23505') {
          console.warn('[admin-set-plan] ai_credits concurrent insert race (ignored)');
        } else {
          console.error('[admin-set-plan] ai_credits insert error:', creditsInsertError);
          return jsonResponse({ success: false, error: creditsInsertError.message }, 500, corsHeaders);
        }
      }
    }

    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: resolvedUserId,
        action: 'plan_change',
        category: 'plan',
        metadata: {
          new_plan: cleanPlan,
          new_daily_limit: newDailyLimit,
          updated_by: 'dev-kit',
          updated_at: now,
          ...(email && !target_user_id ? { resolved_via_email: email } : {}),
        },
        created_at: now,
      });

    if (auditError) {
      console.warn('[admin-set-plan] audit log error (non-fatal):', auditError);
    }

    return jsonResponse(
      { success: true, plan: cleanPlan, daily_limit: newDailyLimit, updated_at: now, resolved_user_id: resolvedUserId },
      200,
      corsHeaders,
    );
  } catch (err) {
    console.error('[admin-set-plan] Unexpected error:', err);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500, corsHeaders);
  }
}

// ─── revoke-sessions (was admin-revoke-sessions) ────────────────────────
// Original: AUTH FIRST (already done at router), THEN parse body
// inside an INNER try/catch with `body = {}` default. So a malformed
// body falls through to the validation check and returns 400
// 'target_user_id is required' — NOT 500. Replicated exactly.
// Audit log: category 'admin', action 'user_sessions_revoked' (preserved).
async function handleRevokeSessions(
  bodyText: string,
  corsHeaders: Record<string, string>,
  actorEmail: string,
): Promise<Response> {
  try {
    let body: { target_user_id?: unknown; actor_email?: unknown } = {};
    try {
      body = JSON.parse(bodyText);
    } catch {
      // empty / malformed body — body stays {} and validation below
      // returns 400 'target_user_id is required', exactly as the
      // original did.
    }

    const targetUserId =
      typeof body.target_user_id === 'string' ? body.target_user_id.trim() : '';
    if (!targetUserId) {
      return jsonResponse({ success: false, error: 'target_user_id is required' }, 400, corsHeaders);
    }

    const supabase = getServiceClient();

    const { error: signOutErr } = await supabase.auth.admin.signOut(targetUserId, 'global');
    if (signOutErr) {
      console.error('[admin-revoke-sessions] signOut failed:', signOutErr);
      return jsonResponse({ success: false, error: signOutErr.message }, 500, corsHeaders);
    }

    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: targetUserId,
          category: 'admin',
          action: 'user_sessions_revoked',
          metadata: {
            actor_email: actorEmail,
            actor_email_self_reported:
              typeof body.actor_email === 'string' ? body.actor_email : null,
          },
        });
    } catch (logErr) {
      console.warn('[admin-revoke-sessions] audit log write failed:', logErr);
    }

    return jsonResponse({ success: true }, 200, corsHeaders);
  } catch (err) {
    console.error('[admin-revoke-sessions] Unexpected error:', err);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500, corsHeaders);
  }
}

// ─── update-profile (was admin-update-profile) ──────────────────────────
// Original: parse body → (auth was here) → branch on body.action
// ('get' vs default update). Parse failure → outer catch → 500
// 'Internal server error'. Audit log: category 'admin', action
// 'profile_update' (preserved). Notification on username change
// also preserved.
//
// NOTE: This handler reads `body.action` for its OWN sub-routing
// (the GET sub-path). Since the router dispatches by the same
// `body.action === 'update-profile'` value, but the handler then
// re-reads `body.action` to check for 'get', and the helper
// preserves any caller-supplied inner action verbatim, the
// 'get' sub-path is reached by the caller setting
// `body.action = 'get'` AND the helper treating that as the
// dispatch action too. To avoid that collision the helper sends
// `body.action = 'update-profile'` only when the caller did NOT
// already provide one — and when the caller did provide
// `action = 'get'`, the helper sets the dispatch via the
// `x-admin-user-op: update-profile` header fallback (router reads
// header when body.action !== one of the 7 dispatch values).
// Inside this handler, `body.action === 'get'` triggers the GET
// branch exactly as before.
async function handleUpdateProfile(bodyText: string, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = JSON.parse(bodyText);
    const { target_user_id, full_name, username, actor_email, action, admin_bypass_validation } = body as {
      target_user_id: string;
      full_name?: string;
      username?: string;
      actor_email?: string;
      action?: string;
      admin_bypass_validation?: boolean;
    };

    if (!target_user_id) {
      return jsonResponse({ success: false, error: 'target_user_id is required' }, 400, corsHeaders);
    }

    const supabase = getServiceClient();

    if (action === 'get') {
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('username, portfolio_enabled, full_name')
        .eq('user_id', target_user_id)
        .maybeSingle();

      if (fetchError) {
        console.error('[admin-update-profile] GET fetch error:', fetchError);
        return jsonResponse({ success: false, error: fetchError.message }, 500, corsHeaders);
      }

      if (!profile) {
        return jsonResponse({ success: false, error: 'not_found' }, 404, corsHeaders);
      }

      return jsonResponse({ success: true, profile }, 200, corsHeaders);
    }

    if (full_name === undefined && username === undefined) {
      return jsonResponse(
        { success: false, error: 'At least one field (full_name or username) is required' },
        400,
        corsHeaders,
      );
    }

    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('user_id', target_user_id)
      .maybeSingle();

    if (fetchError) {
      console.error('[admin-update-profile] Fetch error:', fetchError);
      return jsonResponse({ success: false, error: fetchError.message }, 500, corsHeaders);
    }

    if (!currentProfile) {
      return jsonResponse({ success: false, error: 'not_found' }, 404, corsHeaders);
    }

    if (username !== undefined && username !== currentProfile?.username) {
      const cleanUsername = username.toLowerCase().trim();
      if (!cleanUsername) {
        return jsonResponse({ success: false, error: 'Username cannot be empty' }, 400, corsHeaders);
      }

      if (admin_bypass_validation) {
        const { data: clash, error: clashErr } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('username', cleanUsername)
          .neq('user_id', target_user_id)
          .maybeSingle();

        if (clashErr) {
          console.error('[admin-update-profile] Uniqueness check error:', clashErr);
          return jsonResponse(
            { success: false, error: 'Failed to check username uniqueness: ' + clashErr.message },
            500,
            corsHeaders,
          );
        }
        if (clash) {
          return jsonResponse(
            { success: false, error: 'Username is already taken by another user' },
            409,
            corsHeaders,
          );
        }
      } else {
        const { data: available, error: rpcError } = await supabase.rpc('check_username_available', {
          p_username: cleanUsername,
          p_user_id: target_user_id,
        });

        if (rpcError) {
          console.error('[admin-update-profile] Username check error:', rpcError);
          return jsonResponse(
            { success: false, error: 'Failed to check username availability: ' + rpcError.message },
            500,
            corsHeaders,
          );
        }

        const availStatus = (available as { status?: string; reason?: string } | null)?.status ?? 'invalid';
        if (availStatus !== 'available') {
          const reason = (available as { reason?: string } | null)?.reason;
          const errorMsg =
            availStatus === 'reserved'
              ? (reason || 'This username is reserved')
              : availStatus === 'exclusive'
                ? (reason || 'This username is exclusive to another account')
                : availStatus === 'invalid'
                  ? (reason || 'Invalid username')
                  : 'Username is already taken';
          return jsonResponse({ success: false, error: errorMsg }, 409, corsHeaders);
        }
      }
    }

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
      return jsonResponse(
        { success: true, message: 'No changes to save', profile: currentProfile },
        200,
        corsHeaders,
      );
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', target_user_id)
      .select('full_name, username')
      .maybeSingle();

    if (updateError) {
      console.error('[admin-update-profile] Update error:', updateError);
      return jsonResponse({ success: false, error: updateError.message }, 500, corsHeaders);
    }

    if (!updatedProfile) {
      return jsonResponse({ success: false, error: 'not_found' }, 404, corsHeaders);
    }

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

    if (changedFields.username) {
      const newSlug = changedFields.username.new as string;
      try {
        await supabase.from('notifications').insert({
          user_id: target_user_id,
          type: 'admin_action',
          title: 'Portfolio username updated',
          message: `Your portfolio username has been updated to "${newSlug}" by an admin. Your portfolio is now available at resume.thewise.cloud/p/${newSlug}`,
          link: `/p/${newSlug}`,
        });
      } catch (notifErr) {
        console.warn('[admin-update-profile] Notification insert failed:', notifErr);
      }
    }

    if (changedFields.username) {
      const supabaseUrl = Deno.env.get('EXT_SUPABASE_URL') || Deno.env.get('SUPABASE_URL');
      if (supabaseUrl) {
        const slugsToInvalidate = [
          changedFields.username.old as string,
          changedFields.username.new as string,
        ].filter(Boolean);

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

    return jsonResponse(
      { success: true, profile: updatedProfile, changed_fields: changedFields },
      200,
      corsHeaders,
    );
  } catch (err) {
    console.error('[admin-update-profile] Unexpected error:', err);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500, corsHeaders);
  }
}

// ─── router ─────────────────────────────────────────────────────────────
const VALID_ACTIONS = new Set([
  'suspend',
  'grant-trial',
  'revoke-trial',
  'set-credits',
  'set-plan',
  'revoke-sessions',
  'update-profile',
]);

Deno.serve(wrapHandler('admin-user-ops', async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Buffer body once as text. Each handler will JSON.parse from this
  // text string with its own try/catch wrapper, so each handler
  // preserves its original parse-vs-validation semantics
  // byte-for-byte (including the revoke-sessions outlier that
  // soft-parses with `body = {}` default).
  let bodyText: string;
  try {
    bodyText = await req.text();
  } catch {
    return jsonResponse({ success: false, error: 'Internal server error' }, 500, corsHeaders);
  }

  // Soft-parse for dispatch ONLY. Failure to parse here does NOT
  // fail the request — handlers will re-parse and reproduce their
  // original parse-error envelopes.
  let dispatchAction: string | undefined;
  try {
    const parsedForDispatch = JSON.parse(bodyText) as { action?: unknown };
    if (typeof parsedForDispatch?.action === 'string') {
      dispatchAction = parsedForDispatch.action;
    }
  } catch {
    /* fall through to header fallback below */
  }

  // Prefer body.action when it names a valid dispatch action (per
  // task spec). Header fallback is consulted only when body.action
  // is missing or names something else (e.g. update-profile's inner
  // 'get' sub-path, or completely malformed body for which
  // revoke-sessions parity requires we still reach its handler).
  let action: string;
  if (dispatchAction && VALID_ACTIONS.has(dispatchAction)) {
    action = dispatchAction;
  } else {
    const headerAction = req.headers.get('x-admin-user-op') ?? '';
    action = headerAction;
  }

  // Single admin auth gate (per task spec — explicit "runs once at
  // top of serve, do not duplicate per action"). NB: 6 of 7
  // originals parsed body BEFORE auth, so unauth + malformed-body
  // returned 500 from those originals. With auth at top, that
  // combined edge case now returns 401. Documented router-boundary
  // deviation in EDGE_FUNCTION_AUDIT.md; no real client hits it.
  let actorEmail: string;
  try {
    actorEmail = await requireAdminAuth(req, corsHeaders);
  } catch (authErr) {
    if (authErr instanceof Response) return authErr;
    console.error('[admin-user-ops] auth error:', authErr);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500, corsHeaders);
  }

  switch (action) {
    case 'suspend':
      return await handleSuspend(bodyText, corsHeaders);
    case 'grant-trial':
      return await handleGrantTrial(bodyText, corsHeaders);
    case 'revoke-trial':
      return await handleRevokeTrial(bodyText, corsHeaders);
    case 'set-credits':
      return await handleSetCredits(bodyText, corsHeaders);
    case 'set-plan':
      return await handleSetPlan(bodyText, corsHeaders);
    case 'revoke-sessions':
      return await handleRevokeSessions(bodyText, corsHeaders, actorEmail);
    case 'update-profile':
      return await handleUpdateProfile(bodyText, corsHeaders);
    default:
      return jsonResponse(
        {
          success: false,
          error: `Unknown action: ${action || '(missing)'}. Use one of: suspend, grant-trial, revoke-trial, set-credits, set-plan, revoke-sessions, update-profile`,
        },
        400,
        corsHeaders,
      );
  }
}));
