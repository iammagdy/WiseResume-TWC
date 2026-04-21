// wisehire-invite-reminder: Finds WiseHire invites expiring within 24 hours
// that haven't been used or reminded yet, and sends a reminder email via Resend.
//
// Auth posture: CRON-SECRET-GATED (service-to-service only).
//   Callers must supply the CRON_SECRET value in the `x-cron-secret` header.
//   Intended to be triggered hourly by pg_cron or an external scheduler.
//
// Idempotency: reminder_sent_at is set after a successful send, so the same
//   invite will never receive more than one reminder email.

import { getServiceClient } from '../_shared/dbClient.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { escapeHtml } from '../_shared/htmlEscape.ts';
import { requireCronSecret } from '../_shared/webhookAuth.ts';

const WISEHIRE_BLUE = '#1D4ED8';

function json(data: unknown, status = 200, corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function buildReminderEmail(recipientEmail: string, inviteUrl: string, expiresAt: string): string {
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
                  <img src="https://resume.thewise.cloud/email-logo.png"
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

        <!-- Reminder badge -->
        <tr>
          <td style="padding:28px 40px 0;text-align:center;">
            <span style="display:inline-block;background:#fff7ed;border:1px solid #fed7aa;border-radius:100px;padding:7px 16px;font-size:12px;font-weight:600;color:#c2410c;">
              ⏰ Your invite expires in less than 24 hours
            </span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:24px 40px 40px;">
            <h1 style="margin:0 0 18px;font-size:24px;font-weight:800;color:#0f172a;line-height:1.25;letter-spacing:-0.5px;">
              Don't miss your <span style="color:${WISEHIRE_BLUE};">WiseHire</span> spot
            </h1>

            <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.7;">
              Your early-access invite is still waiting for you, but it expires on
              <strong style="color:#c2410c;">${expiryFormatted}</strong>.
              After that the link will no longer work.
            </p>

            <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.7;">
              Click below to accept your invite and set up your account in under 2 minutes.
              This link is personal to <strong style="color:#0f172a;">${escapeHtml(recipientEmail)}</strong>.
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

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // ── Cron-secret gate ──
  // Callers must supply CRON_SECRET in the `x-cron-secret` header.
  try {
    requireCronSecret(req, corsHeaders);
  } catch (resp) {
    if (resp instanceof Response) return resp;
    throw resp;
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    console.error('[wisehire-invite-reminder] RESEND_API_KEY is not configured.');
    return json({ error: 'Email service not configured' }, 503, corsHeaders);
  }

  const APP_URL = Deno.env.get('WISEHIRE_APP_URL') ?? 'https://resume.thewise.cloud';
  const supabase = getServiceClient();

  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find invites expiring within the next 24 hours that are unused, not
    // revoked, and haven't had a reminder sent yet.
    const { data: expiring, error: fetchErr } = await supabase
      .from('wisehire_invites')
      .select('id, token, recipient_email, expires_at')
      .gt('expires_at', now.toISOString())
      .lte('expires_at', in24h.toISOString())
      .is('used_at', null)
      .eq('is_revoked', false)
      .is('reminder_sent_at', null);

    if (fetchErr) {
      console.error('[wisehire-invite-reminder] Failed to fetch expiring invites:', fetchErr.message);
      return json({ error: `DB error: ${fetchErr.message}` }, 500, corsHeaders);
    }

    const invites = expiring ?? [];
    console.log(`[wisehire-invite-reminder] Found ${invites.length} invite(s) needing a reminder.`);

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const invite of invites) {
      let rowClaimed = false;
      let claimedAt = '';
      try {
        // ── Claim the row atomically before sending ──
        // Update reminder_sent_at only if it is still NULL. This acts as an
        // optimistic lock: if a concurrent run already claimed this invite, the
        // update matches zero rows and we skip it, guaranteeing at-most-one send.
        claimedAt = new Date().toISOString();
        const { data: claimed, error: claimErr } = await supabase
          .from('wisehire_invites')
          .update({ reminder_sent_at: claimedAt })
          .eq('id', invite.id)
          .is('reminder_sent_at', null)
          .select('id');

        if (claimErr) {
          console.error(`[wisehire-invite-reminder] Failed to claim invite ${invite.id}:`, claimErr.message);
          failed++;
          continue;
        }

        if (!claimed || claimed.length === 0) {
          // Another concurrent run already claimed this invite — skip it.
          console.log(`[wisehire-invite-reminder] Invite ${invite.id} already claimed by another run, skipping.`);
          skipped++;
          continue;
        }

        // Row is now claimed — track so the catch block can release it on error.
        rowClaimed = true;

        // ── Send the reminder email ──
        const inviteUrl = `${APP_URL}/wisehire/signup?invite=${invite.token}`;
        const html = buildReminderEmail(invite.recipient_email, inviteUrl, invite.expires_at);
        const text = `Your WiseHire invite expires soon!\n\nYour early-access invite expires on ${new Date(invite.expires_at).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}.\n\nAccept your invite before it expires:\n${inviteUrl}\n\nThis link is personal to ${invite.recipient_email} — please don't share it.\n\n—\nthewise.cloud`;

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'WiseHire <notifications@thewise.cloud>',
            to: [invite.recipient_email],
            subject: "⏰ Your WiseHire invite expires in less than 24 hours",
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
          console.error(`[wisehire-invite-reminder] Email send failed for ${invite.recipient_email}:`, errText);
          // Release the claim so this invite can be retried on the next run.
          await supabase
            .from('wisehire_invites')
            .update({ reminder_sent_at: null })
            .eq('id', invite.id);
          rowClaimed = false;
          failed++;
          continue;
        }

        // ── Write audit log ──
        const { error: auditErr } = await supabase.from('audit_logs').insert({
          category: 'admin_email',
          action: 'wisehire_invite_reminder',
          metadata: {
            invite_id: invite.id,
            recipient_email: invite.recipient_email,
            invite_url: inviteUrl,
            expires_at: invite.expires_at,
            message_id: messageId,
            sent_at: claimedAt,
          },
        });

        if (auditErr) {
          console.error(`[wisehire-invite-reminder] Audit log failed for invite ${invite.id}:`, auditErr.message);
        }

        sent++;
      } catch (err) {
        console.error(`[wisehire-invite-reminder] Unexpected error for invite ${invite.id}:`, err);
        // Release the claim if the row was claimed before the error occurred,
        // so the next scheduled run can retry sending the reminder.
        if (rowClaimed) {
          await supabase
            .from('wisehire_invites')
            .update({ reminder_sent_at: null })
            .eq('id', invite.id)
            .catch((releaseErr: unknown) => {
              console.error(`[wisehire-invite-reminder] Failed to release claim for invite ${invite.id}:`, releaseErr);
            });
        }
        failed++;
      }
    }

    return json({ ok: true, sent, failed, skipped, total: invites.length }, 200, corsHeaders);
  } catch (err) {
    console.error('[wisehire-invite-reminder]', err);
    return json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      500,
      corsHeaders,
    );
  }
});
