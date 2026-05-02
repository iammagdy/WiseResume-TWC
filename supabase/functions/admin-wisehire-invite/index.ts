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
// SETUP: create a public `emails` bucket in the Supabase dashboard and upload
// public/email-logo.png there once. The URL below never changes.
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

Deno.serve(wrapHandler("admin-wisehire-invite", async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { recipient_email, waitlist_id } = body as {
      recipient_email: string;
      waitlist_id?: string;
    };

    let callerEmail: string;
    try {
      callerEmail = await requireAdminAuth(req);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

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
}));
