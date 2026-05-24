'use strict';

/**
 * email-service — Appwrite Function
 *
 * Single consolidated function for ALL WiseResume transactional emails.
 * Sends branded HTML emails via Resend, bypassing Appwrite's template system.
 *
 * ─── How it works ────────────────────────────────────────────────────────────
 *
 * This function calls Appwrite's own token-creation endpoints (createVerification /
 * createRecovery) to generate the secret — which gives us the real URL to embed
 * in the email.  We then send our branded email via Resend.
 *
 * Side-effect: Appwrite's built-in email pipeline also fires on those calls.
 * To suppress the duplicate (Appwrite's broken template), set both the Email
 * Verification and Password Recovery templates in Appwrite Console → Auth →
 * Templates to a single space character " ".  Appwrite will "send" an empty
 * email that users will never notice.
 *
 * ─── Actions ─────────────────────────────────────────────────────────────────
 *
 *   send-verification
 *     Requires: active user session (Appwrite injects x-appwrite-user-jwt)
 *     Body:     { action: 'send-verification' }
 *     Sends:    branded email-verification email
 *
 *   send-password-reset
 *     Requires: nothing (user is not logged in when they forget their password)
 *     Body:     { action: 'send-password-reset', email: 'user@example.com' }
 *     Sends:    branded password-recovery email
 *     Note:     always returns success to avoid email enumeration attacks
 *
 * ─── Required Function Variables (Appwrite Console → Function → Variables) ──
 *
 *   APPWRITE_API_KEY      Admin API key (users.read scope minimum)
 *   APPWRITE_ENDPOINT     e.g. https://fra.cloud.appwrite.io/v1
 *   APPWRITE_PROJECT_ID   e.g. 69fd362b001eb325a192
 *   RESEND_API_KEY        Resend API key (re_xxx)
 *   RESEND_FROM_EMAIL     e.g. noreply@thewise.cloud
 *   RESEND_FROM_NAME      e.g. WiseResume
 *   FRONTEND_URL          e.g. https://resume.thewise.cloud
 *
 * ─── Appwrite Console → Function → Settings ──────────────────────────────────
 *   Execute access: Users  (logged-in users trigger send-verification;
 *                            send-password-reset is public but validated)
 */

const sdk = require('node-appwrite');

const ENDPOINT    = (process.env.APPWRITE_ENDPOINT    || process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://fra.cloud.appwrite.io/v1').replace(/\/$/, '');
const PROJECT_ID  = process.env.APPWRITE_PROJECT_ID   || process.env.APPWRITE_FUNCTION_PROJECT_ID  || '69fd362b001eb325a192';
const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://resume.thewise.cloud').replace(/\/$/, '');
const RESEND_BASE  = 'https://api.resend.com';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function json(res, payload, status = 200) {
  return res.json(payload, status);
}

async function resendSend({ to, subject, html }) {
  const apiKey    = process.env.RESEND_API_KEY    || '';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@thewise.cloud';
  const fromName  = process.env.RESEND_FROM_NAME  || 'WiseResume';

  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');

  const res = await fetch(`${RESEND_BASE}/emails`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to:   [to],
      subject,
      html,
    }),
  });

  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }

  if (!res.ok) {
    throw new Error(parsed?.message || parsed?.error || `Resend error ${res.status}`);
  }
  return parsed;
}

// ─── Email HTML builders ─────────────────────────────────────────────────────

function emailShell({ metaLabel, preheader, h1, bodyCopy, ctaLabel, ctaUrl, securityNote }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${h1} - WiseResume</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#ffffff;">

  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#09090b;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#09090b">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#141416"
               style="max-width:620px;width:100%;background:linear-gradient(180deg,#141416 0%,#0d0d10 100%);border:1px solid rgba(158,27,34,0.35);border-radius:28px;">
          <tr>
            <td style="padding:34px 34px 42px;">

              <!-- Meta row -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:34px;">
                <tr>
                  <td style="font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#a1a1aa;">${metaLabel}</td>
                  <td align="right" style="font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#a1a1aa;">
                    <span style="display:inline-block;width:7px;height:7px;background-color:#ef4444;border-radius:999px;vertical-align:middle;margin-right:8px;"></span>Secure
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:42px;">
                <tr><td style="height:1px;font-size:0;line-height:0;background-color:rgba(255,255,255,0.08);">&nbsp;</td></tr>
              </table>

              <!-- Logo -->
              <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 18px auto;">
                <tr>
                  <td align="center" width="72" style="width:72px;background-color:#121216;border:1px solid rgba(239,68,68,0.45);border-radius:18px;padding:17px;">
                    <img src="https://resume.thewise.cloud/email-logo.png" width="38" height="38" alt="WiseResume" style="display:block;border:0;width:38px;height:38px;">
                  </td>
                </tr>
              </table>

              <!-- Brand -->
              <p style="margin:0 0 30px;text-align:center;font-size:25px;letter-spacing:-0.03em;color:#ffffff;">
                Wise<span style="color:#ef4444;">Resume</span>
              </p>

              <!-- Heading -->
              <h1 style="margin:0 0 18px;text-align:center;font-size:42px;line-height:1.08;font-weight:800;letter-spacing:-0.045em;color:#ffffff;">${h1}</h1>

              <!-- Body copy -->
              <p style="margin:0 auto 38px;max-width:470px;text-align:center;font-size:17px;line-height:1.65;color:#d4d4d8;">${bodyCopy}</p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:34px;">
                <tr>
                  <td align="center">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                      href="${ctaUrl}" style="height:58px;v-text-anchor:middle;width:390px;" arcsize="6%" stroke="f" fillcolor="#9E1B22">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:'Inter',sans-serif;font-size:18px;font-weight:700;">${ctaLabel} &#8594;</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${ctaUrl}" target="_blank"
                       style="display:inline-block;width:390px;max-width:100%;padding:18px 28px;background:linear-gradient(180deg,#dc2626 0%,#9E1B22 100%);border:1px solid rgba(255,255,255,0.16);border-radius:14px;color:#ffffff;text-decoration:none;font-size:18px;font-weight:700;line-height:1.4;text-align:center;box-sizing:border-box;">
                      ${ctaLabel} &nbsp;&#8594;
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <!-- OR divider -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="height:1px;font-size:0;line-height:0;background-color:rgba(255,255,255,0.08);"></td>
                  <td align="center" width="62" style="padding:0 6px;">
                    <span style="display:inline-block;padding:8px 10px;border:1px solid rgba(255,255,255,0.1);border-radius:999px;color:#a1a1aa;font-size:12px;background-color:#111113;white-space:nowrap;">OR</span>
                  </td>
                  <td style="height:1px;font-size:0;line-height:0;background-color:rgba(255,255,255,0.08);"></td>
                </tr>
              </table>

              <!-- Alternative link -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.09);border-radius:18px;margin-bottom:18px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 12px;font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#a1a1aa;">Alternative Link</p>
                    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#c4c4cc;">If the button above doesn't work, copy and paste this link into your browser.</p>
                    <div style="background-color:#0b0b0d;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px 16px;">
                      <a href="${ctaUrl}" target="_blank"
                         style="font-family:'Courier New',Courier,monospace;font-size:12px;line-height:1.6;color:#ef4444;text-decoration:underline;word-break:break-all;">${ctaUrl}</a>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security notice -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.08);border-radius:18px;margin-bottom:34px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 6px;font-size:15px;line-height:1.6;color:#d4d4d8;">${securityNote}</p>
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#8b8b94;">
                      If you didn't request this, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr><td style="height:1px;font-size:0;line-height:0;background-color:rgba(255,255,255,0.08);">&nbsp;</td></tr>
              </table>

              <!-- Footer -->
              <p style="margin:0 0 20px;text-align:center;font-size:15px;color:#a1a1aa;">
                Build <span style="color:#ef4444;">smarter</span>. Get hired <span style="color:#ef4444;">faster</span>.
              </p>
              <p style="margin:0 0 18px;text-align:center;font-size:13px;color:#71717a;">&copy; 2026 WiseResume. All rights reserved.</p>
              <p style="margin:0;text-align:center;font-size:13px;">
                <a href="mailto:contact@thewise.cloud" style="color:#8b8b94;text-decoration:none;">Support</a>
                <span style="color:#3f3f46;margin:0 14px;">|</span>
                <a href="https://resume.thewise.cloud/privacy-policy" style="color:#8b8b94;text-decoration:none;">Privacy</a>
                <span style="color:#3f3f46;margin:0 14px;">|</span>
                <a href="https://resume.thewise.cloud/terms-of-service" style="color:#8b8b94;text-decoration:none;">Terms</a>
              </p>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function verificationEmail(verifyUrl) {
  return emailShell({
    metaLabel:   'Email Verification',
    preheader:   'Confirm your email to activate your WiseResume workspace.',
    h1:          'Verify your email',
    bodyCopy:    'Confirm your email to activate your WiseResume workspace and start building resumes tailored for modern hiring.',
    ctaLabel:    'Verify email address',
    ctaUrl:      verifyUrl,
    securityNote: 'This link will expire in <strong style="color:#ffffff;">24 hours</strong> for your security.',
  });
}

function passwordResetEmail(resetUrl) {
  return emailShell({
    metaLabel:   'Password Recovery',
    preheader:   'Reset your WiseResume password — link expires in 24 hours.',
    h1:          'Reset your password',
    bodyCopy:    'We received a request to reset the password for your WiseResume account. Click below to choose a new one.',
    ctaLabel:    'Reset password',
    ctaUrl:      resetUrl,
    securityNote: 'This link will expire in <strong style="color:#ffffff;">24 hours</strong> and can only be used once.',
  });
}

// ─── Action handlers ──────────────────────────────────────────────────────────

async function handleSendVerification({ req, res, log, error }) {
  // ── Get user JWT ────────────────────────────────────────────────────────────
  // Appwrite automatically injects this when the function is called via SDK
  // with an active user session.
  const userJwt = req.headers['x-appwrite-user-jwt'];
  const userId  = req.headers['x-appwrite-user-id'];

  if (!userJwt || !userId) {
    error('send-verification called without active user session');
    return json(res, { error: 'Authentication required' }, 401);
  }

  // ── Create user-context Account client ────────────────────────────────────
  // We call account.createVerification() AS THE USER (using their JWT), not as
  // admin.  This is correct — the verification token is tied to the user session.
  const userClient = new sdk.Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setJWT(userJwt);

  const acct = new sdk.Account(userClient);

  try {
    const redirectUrl = `${FRONTEND_URL}/auth/verify-email`;

    // createVerification() returns a Token with .secret.
    // It also triggers Appwrite's built-in email pipeline — set the Console
    // Email Verification template to a single space to suppress that send.
    const token = await acct.createVerification(redirectUrl);

    const verifyUrl = `${redirectUrl}?userId=${encodeURIComponent(userId)}&secret=${encodeURIComponent(token.secret)}`;

    // Get user email via admin SDK (so we know where to send)
    const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
    const adminClient = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(apiKey);
    const user = await new sdk.Users(adminClient).get(userId);

    if (!user.email) {
      error(`User ${userId} has no email address`);
      return json(res, { error: 'User has no email address' }, 400);
    }

    log(`Sending verification email to ${user.email}`);
    await resendSend({
      to:      user.email,
      subject: 'Verify your WiseResume email address',
      html:    verificationEmail(verifyUrl),
    });

    log(`Verification email sent to ${user.email}`);
    return json(res, { success: true });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    // Appwrite throws "Invalid credentials" if the JWT is expired or invalid.
    if (/credentials|unauthorized|invalid/i.test(msg)) {
      return json(res, { error: 'Session expired — please sign in again' }, 401);
    }

    // If the user is already verified, Appwrite returns an error.
    // Treat this as success (email was already confirmed, nothing to do).
    if (/already verified|verification.*exist/i.test(msg)) {
      log(`User ${userId} is already verified`);
      return json(res, { success: true, alreadyVerified: true });
    }

    error(`send-verification failed for user ${userId}: ${msg}`);
    return json(res, { error: msg }, 500);
  }
}

async function handleSendPasswordReset({ req, res, log, error, body }) {
  const email = (body?.email || '').trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return json(res, { error: 'Valid email address required' }, 400);
  }

  // ── Create public Account client (no session needed for createRecovery) ────
  const publicClient = new sdk.Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID);

  const acct = new sdk.Account(publicClient);

  try {
    const redirectUrl = `${FRONTEND_URL}/auth/reset-password`;

    // createRecovery() returns a Token with .userId and .secret.
    // It also triggers Appwrite's built-in recovery email — set the Console
    // Password Recovery template to a single space to suppress that send.
    const token = await acct.createRecovery(email, redirectUrl);

    const resetUrl = `${redirectUrl}?userId=${encodeURIComponent(token.userId)}&secret=${encodeURIComponent(token.secret)}`;

    log(`Sending password reset email to ${email}`);
    await resendSend({
      to:      email,
      subject: 'Reset your WiseResume password',
      html:    passwordResetEmail(resetUrl),
    });

    log(`Password reset email sent to ${email}`);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    // IMPORTANT: Always return success for password reset.
    // Revealing whether an email exists is a security vulnerability.
    if (/not found|no user|invalid/i.test(msg)) {
      log(`Password reset requested for unknown email: ${email} — returning silent success`);
    } else {
      error(`send-password-reset failed for ${email}: ${msg}`);
    }
  }

  // Always return success — never reveal whether the email is registered.
  return json(res, { success: true });
}

// ─── Main handler ─────────────────────────────────────────────────────────────

module.exports = async ({ req, res, log, error }) => {
  if (req.method !== 'POST') {
    return json(res, { error: 'Method not allowed' }, 405);
  }

  // Parse body — Appwrite runtime delivers it as an object when Content-Type is JSON
  const body = typeof req.body === 'string'
    ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })()
    : (req.body ?? {});

  const action = body?.action;

  switch (action) {
    case 'send-verification':
      return handleSendVerification({ req, res, log, error });

    case 'send-password-reset':
      return handleSendPasswordReset({ req, res, log, error, body });

    default:
      error(`Unknown action: ${action}`);
      return json(res, { error: `Unknown action: ${action || '(none)'}` }, 400);
  }
};
