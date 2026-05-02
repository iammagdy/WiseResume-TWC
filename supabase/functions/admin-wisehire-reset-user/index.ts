/**
 * admin-wisehire-reset-user — Full test reset for a WiseHire HR account.
 *
 * Orchestrates:
 *   1. Look up user profile (email) + Kinde sub (most recent token_exchanges row)
 *   2. Delete the user from Kinde via the Kinde Management API (if creds configured)
 *   3. Revoke & un-use all wisehire_invites for the user's email
 *   4. Delete the Supabase auth user (cascades to all associated data via FK)
 *   5. Write an audit log entry with action `wisehire_test_reset`
 *
 * Required Kinde Management API env vars (configure in Supabase Edge Function secrets):
 *   KINDE_DOMAIN             — e.g. "thewisecloud" (your Kinde business subdomain)
 *   KINDE_M2M_CLIENT_ID      — M2M application client ID from Kinde dashboard
 *   KINDE_M2M_CLIENT_SECRET  — M2M application client secret from Kinde dashboard
 *
 * If Kinde credentials are not configured, the Kinde deletion step is skipped
 * and `kinde_deleted` in the response will be `false` with a warning.
 */
import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
function json(data: unknown, status = 200, corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Obtains a Kinde M2M access token using client_credentials grant. */
async function getKindeM2MToken(domain: string, clientId: string, clientSecret: string): Promise<string | null> {
  try {
    const res = await fetch(`https://${domain}.kinde.com/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        audience: `https://${domain}.kinde.com/api`,
      }).toString(),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[admin-wisehire-reset-user] Kinde token error:', res.status, errText);
      return null;
    }
    const data = await res.json();
    return data.access_token ?? null;
  } catch (err) {
    console.error('[admin-wisehire-reset-user] Kinde token fetch failed:', err);
    return null;
  }
}

/** Deletes a user from Kinde via the Management API. Returns true on success or 404 (already gone). */
async function deleteKindeUser(domain: string, accessToken: string, kindeSub: string): Promise<{ deleted: boolean; warning?: string }> {
  try {
    const res = await fetch(
      `https://${domain}.kinde.com/api/v1/user?id=${encodeURIComponent(kindeSub)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}`, 'Accept': 'application/json' },
      },
    );
    if (res.status === 404) {
      return { deleted: true, warning: 'Kinde user not found (already deleted or never created)' };
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[admin-wisehire-reset-user] Kinde delete error:', res.status, errText);
      return { deleted: false, warning: `Kinde deletion failed with status ${res.status}: ${errText.slice(0, 200)}` };
    }
    return { deleted: true };
  } catch (err) {
    console.error('[admin-wisehire-reset-user] Kinde delete fetch failed:', err);
    return { deleted: false, warning: `Kinde deletion request failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

Deno.serve(wrapHandler("admin-wisehire-reset-user", async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { target_user_id, actor_email } = body as {
      target_user_id?: string;
      actor_email?: string;
    };

    let callerEmail: string;
    try {
      callerEmail = await requireAdminAuth(req);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    if (!target_user_id?.trim()) {
      return json({ success: false, error: 'target_user_id is required' }, 400, corsHeaders);
    }

    const supabase = getServiceClient();
    const warnings: string[] = [];

    // ── Step 1: Look up user profile + email ──────────────────────────────────
    const { data: profileData } = await supabase
      .from('profiles')
      .select('email, user_id, account_type')
      .eq('user_id', target_user_id)
      .maybeSingle();

    if (!profileData) {
      return json({ success: false, error: 'User not found' }, 404, corsHeaders);
    }

    const userEmail = (profileData as { email?: string | null }).email ?? null;
    const accountType = (profileData as { account_type?: string | null }).account_type ?? null;

    if (accountType !== 'hr') {
      return json({
        success: false,
        error: `This reset is only for WiseHire HR accounts. This user's account_type is: ${accountType ?? 'unknown'}`,
      }, 400, corsHeaders);
    }

    // ── Step 2: Look up Kinde sub ─────────────────────────────────────────────
    const { data: exchangeData } = await supabase
      .from('token_exchanges')
      .select('kinde_sub')
      .eq('user_id', target_user_id)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const kindeSub = (exchangeData as { kinde_sub?: string | null } | null)?.kinde_sub ?? null;

    // ── Step 3: Delete from Kinde via Management API ──────────────────────────
    let kindeDeleted = false;

    const KINDE_DOMAIN = Deno.env.get('KINDE_DOMAIN')?.trim() ?? 'thewisecloud';
    const KINDE_M2M_CLIENT_ID = Deno.env.get('KINDE_M2M_CLIENT_ID')?.trim();
    const KINDE_M2M_CLIENT_SECRET = Deno.env.get('KINDE_M2M_CLIENT_SECRET')?.trim();

    if (!KINDE_M2M_CLIENT_ID || !KINDE_M2M_CLIENT_SECRET) {
      warnings.push(
        'KINDE_M2M_CLIENT_ID or KINDE_M2M_CLIENT_SECRET not configured in Edge Function secrets — ' +
        'the Kinde account was NOT deleted. You must delete it manually in the Kinde dashboard.',
      );
    } else if (!kindeSub) {
      warnings.push(
        'No Kinde sub found for this user (they may have never completed auth). ' +
        'Kinde deletion was skipped.',
      );
      kindeDeleted = true; // Nothing to delete
    } else {
      const m2mToken = await getKindeM2MToken(KINDE_DOMAIN, KINDE_M2M_CLIENT_ID, KINDE_M2M_CLIENT_SECRET);
      if (!m2mToken) {
        warnings.push(
          'Failed to obtain Kinde M2M access token. Check KINDE_M2M_CLIENT_ID / KINDE_M2M_CLIENT_SECRET. ' +
          'Kinde account was NOT deleted.',
        );
      } else {
        const kindeResult = await deleteKindeUser(KINDE_DOMAIN, m2mToken, kindeSub);
        kindeDeleted = kindeResult.deleted;
        if (kindeResult.warning) warnings.push(kindeResult.warning);
      }
    }

    // ── Step 4: Revoke & un-use all wisehire_invites for this email ───────────
    let inviteResetCount = 0;

    if (userEmail) {
      const { data: resetInvites, error: inviteErr } = await supabase
        .from('wisehire_invites')
        .update({ is_revoked: true, used_at: null })
        .eq('recipient_email', userEmail.toLowerCase())
        .select('token');

      if (inviteErr) {
        console.error('[admin-wisehire-reset-user] Invite reset error:', inviteErr.message);
        warnings.push(`Failed to reset invite tokens: ${inviteErr.message}`);
      } else {
        inviteResetCount = resetInvites?.length ?? 0;
      }
    } else {
      warnings.push('Could not determine user email — invite tokens were not reset.');
    }

    // ── Step 5: Delete Supabase auth user (cascades all data via FK) ──────────
    const { error: deleteErr } = await supabase.auth.admin.deleteUser(target_user_id);

    if (deleteErr) {
      return json({
        success: false,
        error: `Failed to delete Supabase user: ${deleteErr.message}`,
        warnings,
      }, 500, corsHeaders);
    }

    // ── Step 6: Write audit log ───────────────────────────────────────────────
    try {
      await supabase.from('audit_logs').insert({
        user_id: target_user_id,
        category: 'admin',
        action: 'wisehire_test_reset',
        metadata: {
          deleted_email: userEmail,
          kinde_sub: kindeSub,
          kinde_deleted: kindeDeleted,
          invite_tokens_reset: inviteResetCount,
          actor_email: actor_email ?? callerEmail,
          performed_by: callerEmail,
          reset_at: new Date().toISOString(),
          warnings,
        },
      });
    } catch {
      /* Audit log failure is non-fatal */
    }

    return json({
      success: true,
      deleted_email: userEmail,
      kinde_deleted: kindeDeleted,
      invite_tokens_reset: inviteResetCount,
      warnings,
    }, 200, corsHeaders);

  } catch (err) {
    console.error('[admin-wisehire-reset-user] Unexpected error:', err);
    return json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      500,
      corsHeaders,
    );
  }
}));
