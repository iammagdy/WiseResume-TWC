'use strict';

/**
 * email-service — Appwrite Function
 *
 * Single consolidated function for ALL WiseResume transactional emails.
 * Sends branded HTML emails via Resend, bypassing Appwrite's template system.
 *
 * ─── How it works ────────────────────────────────────────────────────────────
 *
 * Verification and password-reset: create Appwrite tokens, then send branded
 * HTML via Resend (reliable delivery). Appwrite Messaging templates are also
 * synced (`syncAuthEmailTemplates`) as a fallback if SMTP is enabled.
 *
 * Welcome email and DevKit `send-test` go through Resend directly.
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
 *   send-welcome
 *     Requires: active user session (Appwrite injects x-appwrite-user-jwt)
 *     Body:     { action: 'send-welcome' }
 *     Sends:    branded welcome email (triggered after email verification)
 *
 *   send-admin-verification
 *     Requires: DevKit admin session
 *     Body:     { action: 'send-admin-verification', target_user_id: '...' }
 *     Sends:    branded email-verification email for an admin-selected user
 *
 *   send-test   (DevKit admin only)
 *     Body:     { action: 'send-test', to: 'email', template: 'welcome|verification|password-reset',
 *                 name: 'Name', from_email: 'noreply@thewise.cloud', from_name: 'WiseResume' }
 *     Sends:    a test render of any template to any address
 *
 * ─── Required Function Variables (Appwrite Console → Function → Variables) ──
 *
 *   APPWRITE_API_KEY      Admin API key (users.read scope minimum)
 *   APPWRITE_ENDPOINT     e.g. https://fra.cloud.appwrite.io/v1
 *   APPWRITE_PROJECT_ID   e.g. 69fd362b001eb325a192
 *   DEVKIT_PASSWORD       Admin DevKit password (guards send-test)
 *   RESEND_API_KEY        Resend API key (re_xxx)
 *   RESEND_FROM_EMAIL     Default sender e.g. noreply@thewise.cloud
 *   RESEND_FROM_NAME      Default sender name e.g. WiseResume
 *   FRONTEND_URL          e.g. https://resume.thewise.cloud
 *
 * ─── Appwrite Console → Function → Settings ──────────────────────────────────
 *   Execute access: Any  (send-password-reset is public; session/admin actions
 *                         enforce auth inside this function)
 */

const crypto = require('crypto');
const sdk = require('node-appwrite');

const ENDPOINT    = (process.env.APPWRITE_ENDPOINT    || process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://fra.cloud.appwrite.io/v1').replace(/\/$/, '');
const PROJECT_ID  = process.env.APPWRITE_PROJECT_ID   || process.env.APPWRITE_FUNCTION_PROJECT_ID  || '69fd362b001eb325a192';
const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://resume.thewise.cloud').replace(/\/$/, '');
const RESEND_BASE  = 'https://api.resend.com';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function json(res, payload, status = 200) {
  return res.json(payload, status);
}

function headerValue(req, body, names) {
  const stores = [req.headers || {}, body?.__headers || {}];
  for (const store of stores) {
    for (const [key, value] of Object.entries(store)) {
      if (names.some(name => key.toLowerCase() === name.toLowerCase())) {
        return Array.isArray(value) ? value[0] : String(value || '');
      }
    }
  }
  return '';
}

function bearerToken(req, body) {
  const authHeader = headerValue(req, body, ['authorization']);
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
}

function verifySignedDevKitToken(token) {
  const secret = process.env.DEVKIT_PASSWORD || '';
  if (!secret || !token || !token.includes('.')) return false;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return false;

  const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  const actualBuffer = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  if (!crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return false;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return false;
  }
  return payload.purpose === 'devkit' && typeof payload.exp === 'number' && Date.now() < payload.exp;
}

async function verifyDevKitViaAdminHub(token) {
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
  if (!apiKey || !token) return false;

  try {
    const adminClient = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(apiKey);
    const functions = new sdk.Functions(adminClient);
    const execution = await functions.createExecution({
      functionId: 'admin-devkit-data',
      body: JSON.stringify({
        action: 'diagnostics',
        __headers: { Authorization: `Bearer ${token}` },
      }),
      async: false,
      path: '/',
      method: 'POST',
    });

    return execution.status !== 'failed' && execution.responseStatusCode < 400;
  } catch {
    return false;
  }
}

async function hasDevKitAuth(req, body) {
  const devkitPassword = process.env.DEVKIT_PASSWORD || '';
  const token = bearerToken(req, body);
  if (!token) return false;
  if (devkitPassword && (token === devkitPassword || verifySignedDevKitToken(token))) return true;
  return verifyDevKitViaAdminHub(token);
}

function appwriteApiKey() {
  return process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
}

/** Create an email-verification token; Appwrite sends the synced auth template. */
async function createEmailVerificationToken(userId, redirectUrl) {
  const apiKey = appwriteApiKey();
  if (!apiKey) {
    throw new Error('APPWRITE_API_KEY is not configured');
  }

  const tokenRes = await fetch(`${ENDPOINT}/users/${encodeURIComponent(userId)}/verification`, {
    method: 'POST',
    headers: {
      'X-Appwrite-Project': PROJECT_ID,
      'X-Appwrite-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: redirectUrl }),
  });

  const tokenText = await tokenRes.text();
  let token;
  try { token = JSON.parse(tokenText); } catch { token = { raw: tokenText }; }

  if (!tokenRes.ok || !token?.secret) {
    const msg = token?.message || token?.error || `Appwrite token creation failed (${tokenRes.status})`;
    throw new Error(msg);
  }

  return token;
}

function buildVerificationUrl(redirectUrl, userId, secret) {
  return `${redirectUrl}?userId=${encodeURIComponent(userId)}&secret=${encodeURIComponent(secret)}`;
}

/**
 * Create exactly ONE Appwrite verification token.
 * Each POST /account/verifications/email triggers an Appwrite email — never call more than once.
 */
async function createUserVerificationTokenOnce({ userJwt, userId, redirectUrl, log }) {
  let jwt = userJwt;

  if (!jwt && userId && appwriteApiKey()) {
    const adminClient = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(appwriteApiKey());
    const jwtDoc = await new sdk.Users(adminClient).createJWT(userId);
    jwt = jwtDoc?.jwt || jwtDoc;
  }

  if (!jwt) {
    throw new Error('No user JWT available to create verification token');
  }

  const res = await fetch(`${ENDPOINT}/account/verifications/email`, {
    method: 'POST',
    headers: {
      'X-Appwrite-Project': PROJECT_ID,
      'X-Appwrite-JWT': jwt,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: redirectUrl }),
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 200) }; }

  if (!res.ok) {
    const msg = data?.message || text.slice(0, 200) || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  const secret = data?.secret || '';
  const tokenUserId = data?.userId || userId;
  if (!secret) {
    log(`verification token created for ${tokenUserId} but secret not returned to function runtime`);
  }

  return { userId: tokenUserId, secret: secret || null };
}

/** Complete email verification (no session required). */
async function confirmEmailVerification(userId, secret) {
  const verifyRes = await fetch(`${ENDPOINT}/account/verifications/email`, {
    method: 'PUT',
    headers: {
      'X-Appwrite-Project': PROJECT_ID,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, secret }),
  });

  if (verifyRes.ok) {
    return { success: true, alreadyVerified: false };
  }

  const verifyBody = await verifyRes.text();
  let verifyJson;
  try { verifyJson = JSON.parse(verifyBody); } catch { verifyJson = { message: verifyBody }; }
  const verifyMsg = verifyJson?.message || verifyBody || `Verification failed (${verifyRes.status})`;

  const apiKey = appwriteApiKey();
  if (!apiKey) {
    throw new Error(verifyMsg);
  }

  const adminClient = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(apiKey);
  const user = await new sdk.Users(adminClient).get(userId);
  if (user.emailVerification === true) {
    return { success: true, alreadyVerified: true };
  }

  throw new Error(verifyMsg);
}

/**
 * Send an email via Resend.
 *
 * @param {object} opts
 * @param {string}  opts.to        Recipient email
 * @param {string}  opts.subject   Subject line
 * @param {string}  opts.html      Full HTML body
 * @param {string=} opts.fromEmail Override sender email (default: RESEND_FROM_EMAIL env)
 * @param {string=} opts.fromName  Override sender name (default: RESEND_FROM_NAME env)
 */
async function resendSend({ to, subject, html, fromEmail, fromName }) {
  const apiKey         = process.env.RESEND_API_KEY    || '';
  const resolvedEmail  = fromEmail || process.env.RESEND_FROM_EMAIL || 'noreply@thewise.cloud';
  const resolvedName   = fromName  || process.env.RESEND_FROM_NAME  || 'WiseResume';

  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');

  const res = await fetch(`${RESEND_BASE}/emails`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${resolvedName} <${resolvedEmail}>`,
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

function emailShell({ metaLabel, preheader, h1, bodyCopy, ctaLabel, ctaUrl, securityNote, showCta = true }) {
  const ctaSection = showCta ? `
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
              </table>` : '';

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

              ${ctaSection}

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
    showCta:     true,
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
    showCta:     true,
  });
}

function welcomeEmail(name, dashboardUrl) {
  const safeUrl = dashboardUrl || `${FRONTEND_URL}/dashboard`;
  const safeName = name || 'there';
  return emailShell({
    metaLabel:    'Welcome',
    preheader:    `Welcome to WiseResume, ${safeName}! Your AI-powered resume builder is ready.`,
    h1:           `Welcome, ${safeName}!`,
    bodyCopy:     `Your WiseResume account is active and ready to go. Build AI-powered resumes tailored for modern hiring — <strong style="color:#ffffff;">smarter, faster, and built to impress</strong>.`,
    ctaLabel:     'Go to my dashboard',
    ctaUrl:       safeUrl,
    securityNote: 'You received this because you just verified your WiseResume account.',
    showCta:      true,
  });
}

// ─── Action handlers ──────────────────────────────────────────────────────────

async function handleSendVerification({ req, res, log, error, body }) {
  // ── Get user JWT ────────────────────────────────────────────────────────────
  // Appwrite automatically injects this when the function is called via SDK
  // with an active user session.
  const userJwt = headerValue(req, body, ['x-appwrite-user-jwt', 'X-Appwrite-JWT']);
  let userId = headerValue(req, body, ['x-appwrite-user-id']);

  if (!userJwt) {
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
    const sessionUser = await acct.get();
    userId = userId || sessionUser.$id;

    if (!sessionUser.email) {
      error(`User ${userId} has no email address`);
      return json(res, { error: 'User has no email address' }, 400);
    }

    if (sessionUser.emailVerification === true) {
      log(`User ${userId} is already verified — no email sent`);
      return json(res, {
        success: true,
        alreadyVerified: true,
        message: 'Your email is already verified. Sign out and sign in again, or go to the dashboard.',
      });
    }

    const token = await createUserVerificationTokenOnce({ userJwt, userId, redirectUrl, log });

    if (token.secret) {
      const verifyUrl = buildVerificationUrl(redirectUrl, token.userId, token.secret);
      await resendSend({
        to:      sessionUser.email,
        subject: 'Verify your WiseResume email address',
        html:    verificationEmail(verifyUrl),
      });
      log(`Verification email sent via Resend (single token) to ${sessionUser.email}`);
      return json(res, { success: true, delivery: 'resend' });
    }

    // Token was created once; Appwrite may have sent its template email already.
    log(`Verification token created for ${sessionUser.email}; Appwrite mailer only (no Resend secret)`);
    return json(res, {
      success: true,
      delivery: 'appwrite',
      message: 'Verification email sent — check your inbox.',
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    if (/credentials|unauthorized|invalid jwt/i.test(msg)) {
      return json(res, { error: 'Session expired — please sign in again' }, 401);
    }

    if (/rate limit/i.test(msg)) {
      return json(res, {
        error: 'Too many verification emails requested. Please wait about an hour before requesting another.',
      }, 429);
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
    await resendSend({
      to:      email,
      subject: 'Reset your WiseResume password',
      html:    passwordResetEmail(resetUrl),
    });

    log(`Password reset email sent via Resend to ${email}`);

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

async function handleSendWelcome({ req, res, log, error, body }) {
  // ── Get user JWT ────────────────────────────────────────────────────────────
  const userJwt = headerValue(req, body, ['x-appwrite-user-jwt', 'X-Appwrite-JWT']);

  if (!userJwt) {
    error('send-welcome called without active user session');
    return json(res, { error: 'Authentication required' }, 401);
  }

  try {
    const userClient = new sdk.Client()
      .setEndpoint(ENDPOINT)
      .setProject(PROJECT_ID)
      .setJWT(userJwt);
    const user = await new sdk.Account(userClient).get();

    if (!user.email) {
      error(`User ${user.$id} has no email address for welcome email`);
      return json(res, { error: 'User has no email address' }, 400);
    }

    // Derive a friendly first name: use the Appwrite display name if set,
    // otherwise fall back to the part before @ in their email.
    const displayName = (user.name || '').trim();
    const firstName   = displayName
      ? displayName.split(' ')[0]
      : user.email.split('@')[0];

    log(`Sending welcome email to ${user.email} (name: ${firstName})`);
    await resendSend({
      to:      user.email,
      subject: 'Welcome to WiseResume — Your AI Resume Builder',
      html:    welcomeEmail(firstName),
    });

    log(`Welcome email sent to ${user.email}`);
    return json(res, { success: true });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Non-fatal for the user (they're already verified), but log the failure.
    error(`send-welcome failed: ${msg}`);
    return json(res, { error: msg }, 500);
  }
}

async function handleGetVerificationStatus({ res, log, error, body }) {
  const userId = (body?.userId || body?.user_id || '').trim();
  if (!userId) {
    return json(res, { error: 'userId is required' }, 400);
  }

  const apiKey = appwriteApiKey();
  if (!apiKey) {
    return json(res, { error: 'APPWRITE_API_KEY is not configured' }, 500);
  }

  try {
    const adminClient = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(apiKey);
    const user = await new sdk.Users(adminClient).get(userId);
    return json(res, {
      success: true,
      emailVerification: user.emailVerification === true,
      email: user.email || null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    error(`get-verification-status failed for ${userId}: ${msg}`);
    return json(res, { error: msg }, 404);
  }
}

async function handleCompleteEmailVerification({ res, log, error, body }) {
  const userId = (body?.userId || body?.user_id || '').trim();
  const secret = (body?.secret || '').trim();

  if (!userId || !secret) {
    return json(res, { error: 'userId and secret are required' }, 400);
  }

  try {
    const result = await confirmEmailVerification(userId, secret);
    log(`complete-email-verification: success for ${userId} (alreadyVerified=${result.alreadyVerified})`);
    return json(res, { success: true, alreadyVerified: result.alreadyVerified });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    error(`complete-email-verification failed for ${userId}: ${msg}`);
    return json(res, { error: msg }, 400);
  }
}

async function handleSendAdminVerification({ req, res, log, error, body }) {
  if (!(await hasDevKitAuth(req, body))) {
    error('send-admin-verification: unauthorized attempt');
    return json(res, { error: 'Unauthorized' }, 401);
  }

  const targetUserId = (body?.target_user_id || '').trim();
  if (!targetUserId) {
    return json(res, { error: 'target_user_id is required' }, 400);
  }

  if (!appwriteApiKey()) {
    return json(res, { error: 'APPWRITE_API_KEY is not configured' }, 500);
  }

  try {
    const adminClient = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(appwriteApiKey());
    const user = await new sdk.Users(adminClient).get(targetUserId);

    if (user.emailVerification) {
      log(`send-admin-verification: ${targetUserId} is already verified`);
      return json(res, { success: true, alreadyVerified: true, email: user.email });
    }

    if (!user.email) {
      return json(res, { error: 'User has no email address' }, 400);
    }

    const redirectUrl = `${FRONTEND_URL}/auth/verify-email`;
    const jwtDoc = await new sdk.Users(adminClient).createJWT(targetUserId);
    const adminUserJwt = jwtDoc?.jwt || jwtDoc;

    const token = await createUserVerificationTokenOnce({
      userJwt: adminUserJwt,
      userId: targetUserId,
      redirectUrl,
      log,
    });

    if (token.secret) {
      const verifyUrl = buildVerificationUrl(redirectUrl, token.userId, token.secret);
      await resendSend({
        to: user.email,
        subject: 'Verify your WiseResume email address',
        html: verificationEmail(verifyUrl),
      });
      log(`send-admin-verification: Resend email sent to ${user.email}`);
      return json(res, { success: true, email: user.email, delivery: 'resend' });
    }

    log(`send-admin-verification: Appwrite mailer only for ${user.email}`);
    return json(res, { success: true, email: user.email, delivery: 'appwrite' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    error(`send-admin-verification failed for ${targetUserId}: ${msg}`);
    return json(res, { error: msg }, 500);
  }
}

/**
 * DevKit admin-only: send a test render of any template to any address.
 * Guarded by raw DEVKIT_PASSWORD or a signed DevKit session token.
 */
async function handleSendTest({ req, res, log, error, body }) {
  if (!(await hasDevKitAuth(req, body))) {
    error('send-test: unauthorized attempt');
    return json(res, { error: 'Unauthorized' }, 401);
  }

  const to         = (body?.to         || '').trim().toLowerCase();
  const template   = (body?.template   || 'welcome').trim();
  const name       = (body?.name       || 'Tester').trim();
  const fromEmail  = (body?.from_email || '').trim() || null;
  const fromName   = (body?.from_name  || '').trim() || null;

  if (!to || !to.includes('@')) {
    return json(res, { error: 'Valid recipient email (to) is required' }, 400);
  }

  const testVerifyUrl = `${FRONTEND_URL}/auth/verify-email?userId=test&secret=TEST_TOKEN_PREVIEW`;
  const testResetUrl  = `${FRONTEND_URL}/auth/reset-password?userId=test&secret=TEST_TOKEN_PREVIEW`;

  let html, subject;
  switch (template) {
    case 'verification':
      html    = verificationEmail(testVerifyUrl);
      subject = '[TEST] Verify your WiseResume email address';
      break;
    case 'password-reset':
      html    = passwordResetEmail(testResetUrl);
      subject = '[TEST] Reset your WiseResume password';
      break;
    case 'welcome':
    default:
      html    = welcomeEmail(name);
      subject = '[TEST] Welcome to WiseResume';
      break;
  }

  try {
    const result = await resendSend({ to, subject, html, fromEmail, fromName });
    log(`Test email (${template}) sent to ${to} from ${fromEmail || 'default'}`);
    return json(res, { success: true, message_id: result?.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    error(`send-test (${template}) failed for ${to}: ${msg}`);
    return json(res, { error: msg }, 500);
  }
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
      return handleSendVerification({ req, res, log, error, body });

    case 'send-password-reset':
      return handleSendPasswordReset({ req, res, log, error, body });

    case 'send-welcome':
      return handleSendWelcome({ req, res, log, error, body });

    case 'send-admin-verification':
      return handleSendAdminVerification({ req, res, log, error, body });

    case 'send-test':
      return handleSendTest({ req, res, log, error, body });

    case 'complete-email-verification':
      return handleCompleteEmailVerification({ res, log, error, body });

    case 'get-verification-status':
      return handleGetVerificationStatus({ res, log, error, body });

    default:
      error(`Unknown action: ${action}`);
      return json(res, { error: `Unknown action: ${action || '(none)'}` }, 400);
  }
};
