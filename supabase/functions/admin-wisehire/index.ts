// admin-wisehire: consolidated router for the 4 admin-only WiseHire
// management edge functions. See task #54 + EDGE_FUNCTION_AUDIT.md
// for rationale.
//
// Dispatch contract (per task spec):
//   PRIMARY: `body.action` ∈ {
//     "invite", "reset-user", "revoke-invite", "waitlist"
//   }
//   FALLBACK: `x-admin-wisehire-op` request header. Used when
//   body.action is missing or names something else (e.g. malformed
//   bodies — the waitlist handler's inner branching uses
//   `delete_entry_id` / `history_email` and not `body.action`, so it
//   never collides with the dispatch field, but the header fallback
//   exists for parity safety with the other merged routers).
//
// Parity strategy: the router buffers the request body ONCE as text
// at the top, then hands the text string (not a parsed object) to
// each handler. Each handler does its OWN JSON.parse inside its
// original try/catch wrapper, so each handler preserves its
// original parse-vs-validation-vs-throw semantics byte-for-byte.
//
// All 4 originals parse body BEFORE auth and throw to outer
// try/catch on parse failure → 500 'Internal server error'. With
// auth lifted to the top of the router, an unauthenticated call
// with a malformed body now returns 401 instead of 500. No real
// client (web helper, dev proxy) ever hits this combined edge case;
// the Playwright spec asserts the 401 behaviour so the deviation is
// captured in CI. Documented in EDGE_FUNCTION_AUDIT.md.
//
// Audit log writes preserve the same `category` / `action` strings
// as the originals:
//   - invite        → category 'admin_email', action 'wisehire_invite'
//   - reset-user    → category 'admin',       action 'wisehire_test_reset'
//   - revoke-invite → category 'admin_email', action 'wisehire_invite_revoke'
//   - waitlist      → no audit-log writes (read-only listing + entry delete).

import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { escapeHtml } from '../_shared/htmlEscape.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';

function json(data: unknown, status = 200, corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ─── invite (was admin-wisehire-invite) ─────────────────────────────────

function generateUUID(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

async function hmacSign(message: string, secret: string): Promise<string> {
  const keyData = new TextEncoder().encode(secret);
  const msgData = new TextEncoder().encode(message);
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, msgData);
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const WISEHIRE_BLUE = '#1D4ED8';
// Stable Supabase CDN URL — not tied to web-app deployment.
const EMAIL_LOGO_URL = 'https://jnsfmkzgxsviuthaqlyy.supabase.co/storage/v1/object/public/emails/email-logo.png';

function buildInviteEmail(recipientEmail: string, inviteUrl: string, expiresAt: string): string {
  const expiryFormatted = new Date(expiresAt).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap">
</head>
<body style="margin:0;padding:0;background:#eef3ff;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef3ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(29,78,216,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(160deg,#e8efff 0%,#f0f6ff 100%);border-bottom:1px solid #dce8ff;padding:32px 40px 24px;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="vertical-align:middle;padding-right:10px;">
                  <img src="${EMAIL_LOGO_URL}"
                       alt="WiseHire"
                       width="38" height="38"
                       style="display:block;border-radius:9px;border:0;" />
                </td>
                <td style="vertical-align:middle;">
                  <span style="font-size:21px;font-weight:900;color:${WISEHIRE_BLUE};letter-spacing:-0.5px;">WiseHire</span>
                </td>
              </tr>
            </table>
            <div style="margin-top:8px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1.2px;">by thewise.cloud</div>
          </td>
        </tr>

        <!-- Invite badge -->
        <tr>
          <td style="padding:28px 40px 0;text-align:center;">
            <span style="display:inline-block;background:#eff6ff;border:1px solid #bfdbfe;border-radius:100px;padding:7px 16px;font-size:12px;font-weight:600;color:${WISEHIRE_BLUE};">
              🎉 Your early access is ready
            </span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:24px 40px 40px;">
            <h1 style="margin:0 0 18px;font-size:24px;font-weight:800;color:#0f172a;line-height:1.25;letter-spacing:-0.5px;">
              You're invited to <span style="color:${WISEHIRE_BLUE};">WiseHire</span> ✨
            </h1>

            <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.7;">
              Your spot on the waitlist is now open. WiseHire is an AI-powered hiring platform
              built for HR teams and recruiters — and you're among the first to get in.
            </p>

            <!-- Feature highlights box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
              <tr>
                <td style="background:#f0f6ff;border:1px solid #dbeafe;border-radius:12px;padding:18px 20px;">
                  <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.6px;">What's waiting for you</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:5px 0;">
                        <table cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding-right:10px;vertical-align:top;font-size:14px;">✦</td>
                            <td style="font-size:14px;color:#374151;line-height:1.6;"><strong style="color:#0f172a;">AI candidate screening</strong> — shortlist the right people in minutes</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;">
                        <table cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding-right:10px;vertical-align:top;font-size:14px;">✦</td>
                            <td style="font-size:14px;color:#374151;line-height:1.6;"><strong style="color:#0f172a;">Smart job descriptions</strong> — written, structured, and optimised for you</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;">
                        <table cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding-right:10px;vertical-align:top;font-size:14px;">✦</td>
                            <td style="font-size:14px;color:#374151;line-height:1.6;"><strong style="color:#0f172a;">Pipeline &amp; interview tracking</strong> — one place for everything</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.7;">
              Click the button below to accept your invite and set up your account.
              This link is personal to <strong style="color:#0f172a;">${escapeHtml(recipientEmail)}</strong>
              and expires on <strong style="color:#0f172a;">${expiryFormatted}</strong>.
            </p>

            <!-- CTA button -->
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:${WISEHIRE_BLUE};border-radius:10px;box-shadow:0 4px 14px rgba(29,78,216,0.28);">
                  <a href="${escapeHtml(inviteUrl)}"
                     style="display:inline-block;padding:14px 30px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.2px;">
                    Accept Invite &amp; Set Up Your Account →
                  </a>
                </td>
              </tr>
            </table>
            <div style="margin-top:10px;font-size:12px;color:#94a3b8;">Takes 2 minutes — no credit card needed</div>

            <!-- Link fallback -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
              <tr>
                <td style="background:#f8fafc;border:1px solid #e9eef6;border-radius:8px;padding:14px 16px;">
                  <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">Or copy this link</p>
                  <p style="margin:0;font-size:12px;color:#64748b;word-break:break-all;line-height:1.6;">${escapeHtml(inviteUrl)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:18px 40px 22px;border-top:1px solid #e9eef6;background:#f8fafc;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
              You're receiving this because you joined the WiseHire waitlist at
              <a href="https://resume.thewise.cloud/?for=companies" style="color:${WISEHIRE_BLUE};text-decoration:none;font-weight:500;">resume.thewise.cloud</a>.
              This invite is personal to ${escapeHtml(recipientEmail)} — please don't share it.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function handleInvite(
  bodyText: string,
  corsHeaders: Record<string, string>,
  callerEmail: string,
): Promise<Response> {
  try {
    const body = JSON.parse(bodyText);
    const { recipient_email, waitlist_id } = body as {
      recipient_email: string;
      waitlist_id?: string;
    };

    if (!recipient_email?.trim()) {
      return json({ success: false, error: 'recipient_email is required' }, 400, corsHeaders);
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const WISEHIRE_INVITE_SECRET = Deno.env.get('WISEHIRE_INVITE_SECRET') ?? Deno.env.get('DEV_KIT_PASSWORD') ?? '';
    const APP_URL = Deno.env.get('WISEHIRE_APP_URL') ?? 'https://resume.thewise.cloud';

    if (!RESEND_API_KEY) {
      return json({ success: false, error: 'RESEND_API_KEY not configured' }, 503, corsHeaders);
    }

    const supabase = getServiceClient();
    const email = recipient_email.trim().toLowerCase();

    const { error: revokeErr } = await supabase
      .from('wisehire_invites')
      .update({ is_revoked: true })
      .eq('recipient_email', email)
      .eq('is_revoked', false)
      .is('used_at', null);
    if (revokeErr) {
      console.error('[admin-wisehire-invite] Failed to revoke previous invites:', revokeErr.message);
      return json({ success: false, error: `Failed to revoke previous invites: ${revokeErr.message}` }, 500, corsHeaders);
    }

    const token = generateUUID();
    const signature = await hmacSign(token, WISEHIRE_INVITE_SECRET);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const inviteUrl = `${APP_URL}/wisehire/signup?invite=${token}`;

    const { error: insertErr } = await supabase.from('wisehire_invites').insert({
      token,
      token_signature: signature,
      recipient_email: email,
      expires_at: expiresAt,
      is_revoked: false,
    });
    if (insertErr) throw new Error(`Failed to store invite: ${insertErr.message}`);

    if (waitlist_id) {
      await supabase
        .from('wisehire_waitlist')
        .update({ invited_at: new Date().toISOString() })
        .eq('id', waitlist_id);
    } else {
      await supabase
        .from('wisehire_waitlist')
        .update({ invited_at: new Date().toISOString() })
        .eq('email', email);
    }

    const html = buildInviteEmail(email, inviteUrl, expiresAt);
    const text = `You're invited to WiseHire!\n\nAccept your invite and set up your account:\n${inviteUrl}\n\nThis link expires 72 hours from now and can only be used by ${email}.\n\n—\nthewise.cloud`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'WiseHire <notifications@thewise.cloud>',
        to: [email],
        subject: "You're invited to WiseHire — early access",
        html,
        text,
      }),
    });

    let messageId: string | null = null;
    if (emailRes.ok) {
      const emailData = await emailRes.json();
      messageId = emailData.id ?? null;
    } else {
      const errText = await emailRes.text();
      console.error('[admin-wisehire-invite] Email send failed:', errText);
    }

    await supabase.from('audit_logs').insert({
      user_id: (await supabase.from('profiles').select('id').eq('email', callerEmail).maybeSingle()).data?.id ?? undefined,
      category: 'admin_email',
      action: 'wisehire_invite',
      metadata: {
        recipient_email: email,
        performed_by: callerEmail,
        invite_url: inviteUrl,
        expires_at: expiresAt,
        message_id: messageId,
        waitlist_id: waitlist_id ?? null,
        sent_at: new Date().toISOString(),
      },
    });

    return json({
      success: true,
      invite_url: inviteUrl,
      expires_at: expiresAt,
      message_id: messageId,
    }, 200, corsHeaders);
  } catch (err) {
    console.error('[admin-wisehire-invite]', err);
    return json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      500,
      corsHeaders
    );
  }
}

// ─── reset-user (was admin-wisehire-reset-user) ─────────────────────────

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

async function handleResetUser(
  bodyText: string,
  corsHeaders: Record<string, string>,
  callerEmail: string,
): Promise<Response> {
  try {
    const body = JSON.parse(bodyText);
    const { target_user_id, actor_email } = body as {
      target_user_id?: string;
      actor_email?: string;
    };

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
}

// ─── revoke-invite (was admin-wisehire-revoke-invite) ───────────────────

async function handleRevokeInvite(
  bodyText: string,
  corsHeaders: Record<string, string>,
  callerEmail: string,
): Promise<Response> {
  try {
    const body = JSON.parse(bodyText);
    const { recipient_email, waitlist_id } = body as {
      recipient_email: string;
      waitlist_id?: string;
    };

    if (!recipient_email?.trim()) {
      return json({ success: false, error: 'recipient_email is required' }, 400, corsHeaders);
    }

    const supabase = getServiceClient();
    const email = recipient_email.trim().toLowerCase();

    const { data: revoked, error: revokeErr } = await supabase
      .from('wisehire_invites')
      .update({ is_revoked: true })
      .eq('recipient_email', email)
      .eq('is_revoked', false)
      .is('used_at', null)
      .select('token');

    if (revokeErr) {
      throw new Error(`Failed to revoke invites: ${revokeErr.message}`);
    }

    const revokedCount = revoked?.length ?? 0;

    const callerIdResult = await supabase
      .from('profiles')
      .select('id')
      .eq('email', callerEmail)
      .maybeSingle();

    await supabase.from('audit_logs').insert({
      user_id: callerIdResult.data?.id ?? undefined,
      category: 'admin_email',
      action: 'wisehire_invite_revoke',
      metadata: {
        recipient_email: email,
        performed_by: callerEmail,
        revoked_count: revokedCount,
        waitlist_id: waitlist_id ?? null,
        revoked_at: new Date().toISOString(),
      },
    });

    return json({ success: true, revoked_count: revokedCount }, 200, corsHeaders);
  } catch (err) {
    console.error('[admin-wisehire-revoke-invite]', err);
    return json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      500,
      corsHeaders,
    );
  }
}

// ─── waitlist (was admin-wisehire-waitlist) ─────────────────────────────

async function handleWaitlist(
  bodyText: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  try {
    const body = JSON.parse(bodyText);
    const { page = 1, per_page = 25, search = '', history_email, delete_entry_id } = body as {
      page?: number;
      per_page?: number;
      search?: string;
      history_email?: string;
      delete_entry_id?: string;
    };

    const supabase = getServiceClient();

    if (delete_entry_id) {
      const { error: delError } = await supabase
        .from('wisehire_waitlist')
        .delete()
        .eq('id', delete_entry_id);

      if (delError) throw delError;
      return json({ success: true }, 200, corsHeaders);
    }

    if (history_email) {
      const normalizedEmail = history_email.toLowerCase().trim();
      const { data: invites, error: inviteError } = await supabase
        .from('wisehire_invites')
        .select('id, created_at, expires_at, used_at, is_revoked')
        .eq('recipient_email', normalizedEmail)
        .order('created_at', { ascending: false });

      if (inviteError) throw inviteError;

      const now = new Date();
      const history = (invites ?? []).map((inv: {
        id: string;
        created_at: string;
        expires_at: string;
        used_at: string | null;
        is_revoked: boolean;
      }) => {
        let status: 'used' | 'revoked' | 'expired' | 'active';
        if (inv.used_at) {
          status = 'used';
        } else if (inv.is_revoked) {
          status = 'revoked';
        } else if (new Date(inv.expires_at) < now) {
          status = 'expired';
        } else {
          status = 'active';
        }
        return {
          id: inv.id,
          sent_at: inv.created_at,
          expires_at: inv.expires_at,
          used_at: inv.used_at,
          status,
        };
      });

      return json({ success: true, history }, 200, corsHeaders);
    }

    const offset = (page - 1) * per_page;

    let query = supabase
      .from('wisehire_waitlist')
      .select('*', { count: 'exact' })
      .order('submitted_at', { ascending: false })
      .range(offset, offset + per_page - 1);

    if (search.trim()) {
      query = query.or(
        `name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%,company_size.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const entries = data ?? [];

    type InviteStatusValue = 'active' | 'revoked' | 'expired' | null;

    let inviteUsedAtMap: Map<string, string> = new Map();
    let inviteStatusMap: Map<string, InviteStatusValue> = new Map();

    if (entries.length > 0) {
      const emails = entries.map((e: { email: string }) => e.email.toLowerCase().trim());

      const { data: allInvites, error: inviteError } = await supabase
        .from('wisehire_invites')
        .select('recipient_email, used_at, is_revoked, expires_at, created_at')
        .in('recipient_email', emails)
        .order('created_at', { ascending: false });

      if (inviteError) throw inviteError;

      const now = new Date();

      for (const inv of (allInvites ?? [])) {
        const normalizedEmail = inv.recipient_email.toLowerCase().trim();

        if (inv.used_at && !inviteUsedAtMap.has(normalizedEmail)) {
          inviteUsedAtMap.set(normalizedEmail, inv.used_at);
        }

        if (!inviteStatusMap.has(normalizedEmail)) {
          let status: InviteStatusValue;
          if (inv.is_revoked) {
            status = 'revoked';
          } else if (new Date(inv.expires_at) < now) {
            status = 'expired';
          } else {
            status = 'active';
          }
          inviteStatusMap.set(normalizedEmail, status);
        }
      }
    }

    const enrichedEntries = entries.map((e: { email: string }) => ({
      ...e,
      invite_used_at: inviteUsedAtMap.get(e.email.toLowerCase().trim()) ?? null,
      invite_status: inviteStatusMap.get(e.email.toLowerCase().trim()) ?? null,
    }));

    return json({ success: true, entries: enrichedEntries, total: count ?? 0, page, per_page }, 200, corsHeaders);
  } catch (err) {
    console.error('[admin-wisehire-waitlist]', err);
    return json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      500,
      corsHeaders
    );
  }
}

// ─── router ─────────────────────────────────────────────────────────────

const VALID_ACTIONS = new Set([
  'invite',
  'reset-user',
  'revoke-invite',
  'waitlist',
]);

Deno.serve(wrapHandler('admin-wisehire', async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Buffer body once as text. Each handler will JSON.parse from this
  // text string with its own try/catch wrapper, so each handler
  // preserves its original parse-vs-validation semantics.
  let bodyText: string;
  try {
    bodyText = await req.text();
  } catch {
    return json({ success: false, error: 'Internal server error' }, 500, corsHeaders);
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

  let action: string;
  if (dispatchAction && VALID_ACTIONS.has(dispatchAction)) {
    action = dispatchAction;
  } else {
    action = req.headers.get('x-admin-wisehire-op') ?? '';
  }

  // Single admin auth gate (per task spec). All 4 originals parsed
  // body BEFORE auth, so unauth + malformed-body returned 500 from
  // those originals. With auth at top, that combined edge case now
  // returns 401. Documented router-boundary deviation; no real
  // client hits it (web helper / dev proxy always send well-formed
  // JSON).
  let callerEmail: string;
  try {
    callerEmail = await requireAdminAuth(req, corsHeaders);
  } catch (authErr) {
    if (authErr instanceof Response) return authErr;
    console.error('[admin-wisehire] auth error:', authErr);
    return json({ success: false, error: 'Internal server error' }, 500, corsHeaders);
  }

  switch (action) {
    case 'invite':
      return await handleInvite(bodyText, corsHeaders, callerEmail);
    case 'reset-user':
      return await handleResetUser(bodyText, corsHeaders, callerEmail);
    case 'revoke-invite':
      return await handleRevokeInvite(bodyText, corsHeaders, callerEmail);
    case 'waitlist':
      return await handleWaitlist(bodyText, corsHeaders);
    default:
      return json(
        {
          success: false,
          error: `Unknown action: ${action || '(missing)'}. Use one of: invite, reset-user, revoke-invite, waitlist`,
        },
        400,
        corsHeaders,
      );
  }
}));
