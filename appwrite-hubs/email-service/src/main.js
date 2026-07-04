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
 *   send-password-changed
 *     Requires: active user session (in-app change) OR a userId (post-reset)
 *     Body:     { action: 'send-password-changed' }            // uses the session
 *           or  { action: 'send-password-changed', userId }    // looks up via admin key
 *     Sends:    branded "your password was changed" security notice
 *     Note:     best-effort; always returns success, never reveals account existence
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
 *   FRONTEND_URL          e.g. https://wiseresume.app
 *
 * ─── Appwrite Console → Function → Settings ──────────────────────────────────
 *   Execute access: Any  (send-password-reset is public; session/admin actions
 *                         enforce auth inside this function)
 */

const crypto = require('crypto');
const sdk = require('node-appwrite');

const ENDPOINT    = (process.env.APPWRITE_ENDPOINT    || process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://fra.cloud.appwrite.io/v1').replace(/\/$/, '');
const PROJECT_ID  = process.env.APPWRITE_PROJECT_ID   || process.env.APPWRITE_FUNCTION_PROJECT_ID  || '69fd362b001eb325a192';
const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://wiseresume.app').replace(/\/$/, '');
const RESEND_BASE  = 'https://api.resend.com';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeEmailLocale(value) {
  const raw = String(value || '').toLowerCase();
  return raw === 'ar' || raw.startsWith('ar-') ? 'ar' : 'en';
}

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
  const secrets = [
    process.env.APPWRITE_API_KEY,
    process.env.APPWRITE_FUNCTION_API_KEY,
    process.env.DEVKIT_PASSWORD,
  ].filter(Boolean);
  if (!secrets.length || !token || !token.includes('.')) return false;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return false;

  const signed = secrets.some(secret => {
    const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
    const actualBuffer = Buffer.from(sig);
    const expectedBuffer = Buffer.from(expected);
    return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
  });
  if (!signed) return false;

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
        action: 'get-deployed-hashes',
        __headers: { Authorization: `Bearer ${token}` },
      }),
      async: false,
      path: '/',
      method: 'POST',
    });

    let response = {};
    try { response = JSON.parse(execution.responseBody || '{}'); } catch {}
    return execution.status !== 'failed' && response.success === true;
  } catch {
    return false;
  }
}

async function hasDevKitAuth(req, body) {
  const devkitPassword = process.env.DEVKIT_PASSWORD || '';
  const token = bearerToken(req, body);
  if (!token) return false;
  if (verifySignedDevKitToken(token)) return true;
  if (devkitPassword && token === devkitPassword) return true;
  return verifyDevKitViaAdminHub(token);
}

function decodeVerifiedDevKitActor(req, body) {
  const token = bearerToken(req, body);
  if (!verifySignedDevKitToken(token)) return null;
  try {
    const [encoded] = token.split('.');
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return typeof payload.uid === 'string' ? payload.uid : null;
  } catch {
    return null;
  }
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

function emailShell({
  locale = 'en',
  variant = 'secure',
  eyebrow = '',
  title = '',
  lead = '',
  bodyCopy = '',
  ctaLabel = '',
  ctaUrl = '',
  otpCode = '',
  otpLabel = '',
  noteTitle = '',
  noteBody = '',
  statusLabel = '',
  footerHint = '',
  showCta = true,
  showBackupLink = true,
  disclaimer = '',
}) {
  const isArabic = normalizeEmailLocale(locale) === 'ar';

  const defaultStatusLabel = statusLabel || (
    variant === 'ready'
      ? (isArabic ? 'جاهز' : 'Ready')
      : variant === 'security'
        ? (isArabic ? 'أمان' : 'Security')
        : (isArabic ? 'آمن' : 'Secure')
  );

  const defaultFooterHint = footerHint || (
    isArabic
      ? 'WiseResume — مساحة عمل ذكية لسيرتك المهنية.'
      : 'WiseResume — your AI career workspace.'
  );

  const subtitleText = isArabic
    ? 'مساحة عمل مهنية بالذكاء الاصطناعي'
    : 'AI Career Workspace';

  const safeDisclaimer = disclaimer || (
    isArabic
      ? 'إذا لم تطلب هذا الإجراء، يمكنك تجاهل هذه الرسالة بأمان.'
      : "If you didn't request this, you can safely ignore this message."
  );

  const fontFamily = isArabic
    ? "'Noto Sans Arabic', Tahoma, Arial, sans-serif"
    : "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

  let otpSection = '';
  if (otpCode) {
    const defaultOtpLabel = otpLabel || (isArabic ? 'رمز التحقق' : 'Verification code');
    otpSection = `
              <!-- OTP Display Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 28px 0;">
                <tr>
                  <td align="center" style="background-color:#121215;border:1px solid #27272a;border-radius:16px;padding:22px 24px;">
                    <p style="margin:0 0 8px 0;font-family:${fontFamily};font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#8b8b94;">${defaultOtpLabel}</p>
                    <span style="font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:800;color:#ef4444;letter-spacing:8px;user-select:all;display:inline-block;direction:ltr;">${otpCode}</span>
                  </td>
                </tr>
              </table>`;
  }

  let ctaSection = '';
  if (showCta && ctaUrl && ctaLabel) {
    let backupLinkSection = '';
    if (showBackupLink) {
      const backupTitle = isArabic ? 'رابط مباشر' : 'Direct Link';
      const backupText = isArabic
        ? 'إذا لم يعمل الزر أعلاه، انسخ هذا الرابط والصقه في متصفحك:'
        : "If the button above doesn't work, copy and paste this link into your browser:";
      backupLinkSection = `
              <!-- Alternative link -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:#121215;border:1px solid #232328;border-radius:12px;margin-top:20px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 6px 0;font-family:${fontFamily};font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#8b8b94;">${backupTitle}</p>
                    <p style="margin:0 0 10px 0;font-size:13px;line-height:1.5;color:#a1a1aa;">${backupText}</p>
                    <div style="background-color:#0a0a0d;border:1px solid #1e1e24;border-radius:8px;padding:10px 12px;direction:ltr;text-align:left;">
                      <a href="${ctaUrl}" target="_blank"
                         style="font-family:'Courier New',Courier,monospace;font-size:12px;line-height:1.5;color:#ef4444;text-decoration:underline;word-break:break-all;">${ctaUrl}</a>
                    </div>
                  </td>
                </tr>
              </table>`;
    }

    ctaSection = `
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px 0;">
                <tr>
                  <td align="center">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                      href="${ctaUrl}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="12%" stroke="f" fillcolor="#9E1B22">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:${fontFamily};font-size:16px;font-weight:700;">${ctaLabel}</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${ctaUrl}" target="_blank"
                       style="display:inline-block;width:100%;max-width:320px;padding:15px 28px;background:linear-gradient(180deg,#dc2626 0%,#9E1B22 100%);border:1px solid rgba(255,255,255,0.12);border-radius:12px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;line-height:1.4;text-align:center;box-sizing:border-box;">
                      ${ctaLabel}
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
              ${backupLinkSection}`;
  }

  let noteSection = '';
  if (noteTitle || noteBody) {
    noteSection = `
              <!-- Security / Info Note -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:#121215;border:1px solid #232328;border-radius:12px;margin:24px 0;">
                <tr>
                  <td style="padding:16px 20px;">
                    ${noteTitle ? `<p style="margin:0 0 6px 0;font-size:14px;font-weight:600;color:#ffffff;">${noteTitle}</p>` : ''}
                    ${noteBody ? `<p style="margin:0 0 6px 0;font-size:13px;line-height:1.55;color:#a1a1aa;">${noteBody}</p>` : ''}
                    <p style="margin:0;font-size:12px;line-height:1.5;color:#71717a;">${safeDisclaimer}</p>
                  </td>
                </tr>
              </table>`;
  } else {
    noteSection = `
              <!-- Simple Disclaimer -->
              <p style="margin:24px 0 0 0;font-size:12px;line-height:1.5;color:#71717a;text-align:center;">
                ${safeDisclaimer}
              </p>`;
  }

  return `<!DOCTYPE html>
<html lang="${isArabic ? 'ar' : 'en'}" dir="${isArabic ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title} - WiseResume</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:#f4f1ee;font-family:${fontFamily};color:#ffffff;direction:${isArabic ? 'rtl' : 'ltr'};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#f4f1ee;">${lead || title}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <!-- Outer Canvas -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f1ee" style="background-color:#f4f1ee;width:100%;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Main Dark Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0a0a0d"
               style="max-width:580px;width:100%;background-color:#0a0a0d;border:1px solid #242429;border-radius:24px;box-shadow:0 12px 32px rgba(0,0,0,0.12);overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 36px 32px;">

              <!-- Header Row -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <!-- Logo & Wordmark -->
                  <td align="${isArabic ? 'right' : 'left'}" style="vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;padding-${isArabic ? 'left' : 'right'}:12px;">
                          <div style="width:36px;height:36px;background-color:#141418;border:1px solid #27272a;border-radius:10px;text-align:center;line-height:36px;padding:3px;box-sizing:border-box;">
                            <img src="https://wiseresume.app/email-logo.png" width="28" height="28" alt="WiseResume" style="display:inline-block;border:0;width:28px;height:28px;vertical-align:middle;">
                          </div>
                        </td>
                        <td style="vertical-align:middle;">
                          <span style="font-size:20px;font-weight:800;letter-spacing:-0.03em;color:#ffffff;line-height:1.2;display:block;">Wise<span style="color:#ef4444;">Resume</span></span>
                          <span style="font-size:11px;font-weight:500;color:#71717a;display:block;line-height:1.2;margin-top:2px;">${subtitleText}</span>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- Status Chip -->
                  <td align="${isArabic ? 'left' : 'right'}" style="vertical-align:middle;">
                    <span style="display:inline-block;padding:5px 12px;background-color:#141418;border:1px solid #27272a;border-radius:999px;font-family:${fontFamily};font-size:11px;font-weight:600;color:#a1a1aa;white-space:nowrap;">
                      <span style="display:inline-block;width:6px;height:6px;background-color:#ef4444;border-radius:999px;vertical-align:middle;margin-${isArabic ? 'left' : 'right'}:6px;"></span>${defaultStatusLabel}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr><td style="height:1px;font-size:0;line-height:0;background-color:#1e1e24;">&nbsp;</td></tr>
              </table>

              ${eyebrow ? `<p style="margin:0 0 10px 0;font-family:${fontFamily};font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#ef4444;">${eyebrow}</p>` : ''}

              <!-- Title -->
              <h1 style="margin:0 0 14px 0;font-size:28px;line-height:1.2;font-weight:800;letter-spacing:-0.03em;color:#ffffff;">${title}</h1>

              <!-- Lead -->
              ${lead ? `<p style="margin:0 0 14px 0;font-size:16px;line-height:1.55;font-weight:500;color:#d4d4d8;">${lead}</p>` : ''}

              <!-- Body copy -->
              ${bodyCopy ? `<p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#a1a1aa;">${bodyCopy}</p>` : ''}

              ${otpSection}

              ${ctaSection}

              ${noteSection}

              <!-- Divider -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 24px 0;">
                <tr><td style="height:1px;font-size:0;line-height:0;background-color:#1e1e24;">&nbsp;</td></tr>
              </table>

              <!-- Footer -->
              <p style="margin:0 0 12px 0;text-align:center;font-size:13px;font-weight:500;color:#a1a1aa;">
                ${defaultFooterHint}
              </p>
              <p style="margin:0 0 12px 0;text-align:center;font-size:12px;color:#71717a;">&copy; 2026 WiseResume. All rights reserved.</p>
              <p style="margin:0;text-align:center;font-size:12px;direction:ltr;">
                <a href="mailto:contact@thewise.cloud" style="color:#8b8b94;text-decoration:none;">Support</a>
                <span style="color:#27272a;margin:0 10px;">|</span>
                <a href="https://wiseresume.app/privacy-policy" style="color:#8b8b94;text-decoration:none;">Privacy</a>
                <span style="color:#27272a;margin:0 10px;">|</span>
                <a href="https://wiseresume.app/terms-of-service" style="color:#8b8b94;text-decoration:none;">Terms</a>
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

function verificationEmail(verifyUrl, rawLocale = 'en') {
  const locale = normalizeEmailLocale(rawLocale);
  const isArabic = locale === 'ar';

  return emailShell({
    locale,
    variant: 'secure',
    eyebrow: isArabic ? 'تأكيد البريد الإلكتروني' : 'Email verification',
    title: isArabic ? 'أكّد بريدك الإلكتروني' : 'Verify your email',
    lead: isArabic ? 'أكّد بريدك الإلكتروني لتفعيل مساحة عمل WiseResume.' : 'Confirm your email to activate your WiseResume workspace.',
    bodyCopy: isArabic ? 'خطوة واحدة فقط وسيصبح حسابك جاهزاً. بعد التأكيد، يمكنك إنشاء سيرتك الذاتية وتحسينها وتخصيصها للوظائف باستخدام الذكاء الاصطناعي.' : 'One quick step and your account will be ready. After verification, you can continue building, tailoring, and improving your resume with AI.',
    ctaLabel: isArabic ? 'تأكيد البريد الإلكتروني' : 'Verify email',
    ctaUrl: verifyUrl,
    noteTitle: isArabic ? 'تأكيد آمن' : 'Secure verification',
    noteBody: isArabic ? 'ينتهي هذا الرابط خلال 24 ساعة. إذا لم تقم بإنشاء حساب في WiseResume، يمكنك تجاهل هذه الرسالة.' : 'This verification link expires in 24 hours. If you did not create a WiseResume account, you can ignore this message.',
    statusLabel: isArabic ? 'آمن' : 'Secure',
    showCta: true,
    showBackupLink: true,
  });
}

function passwordResetEmail(resetUrl, rawLocale = 'en') {
  const locale = normalizeEmailLocale(rawLocale);
  const isArabic = locale === 'ar';

  return emailShell({
    locale,
    variant: 'secure',
    eyebrow: isArabic ? 'استعادة كلمة المرور' : 'Password recovery',
    title: isArabic ? 'إعادة تعيين كلمة المرور' : 'Reset your password',
    lead: isArabic ? 'تلقينا طلباً لإعادة تعيين كلمة مرور حسابك في WiseResume.' : 'We received a request to reset the password for your WiseResume account.',
    bodyCopy: isArabic ? 'اضغط أدناه لاختيار كلمة مرور جديدة.' : 'Click below to choose a new one.',
    ctaLabel: isArabic ? 'إعادة تعيين كلمة المرور' : 'Reset password',
    ctaUrl: resetUrl,
    noteTitle: isArabic ? 'رابط مؤقت' : 'Temporary link',
    noteBody: isArabic ? 'ستنتهي صلاحية هذا الرابط خلال ساعة واحدة ولا يمكن استخدامه إلا مرة واحدة.' : 'This link will expire in 1 hour and can only be used once.',
    statusLabel: isArabic ? 'آمن' : 'Secure',
    showCta: true,
    showBackupLink: true,
  });
}

function adminPasswordResetLinkEmail(resetUrl, rawLocale = 'en') {
  const locale = normalizeEmailLocale(rawLocale);
  const isArabic = locale === 'ar';

  return emailShell({
    locale,
    variant: 'secure',
    eyebrow: isArabic ? 'إعادة تعيين بواسطة المسؤول' : 'Admin password reset',
    title: isArabic ? 'تعيين كلمة مرور جديدة' : 'Set your new password',
    lead: isArabic ? 'قام مسؤول النظام ببدء إعادة تعيين آمنة لكلمة المرور لحسابك في WiseResume.' : 'An administrator started a secure password reset for your WiseResume account.',
    bodyCopy: isArabic ? 'استخدم الزر أدناه لاختيار كلمة مرور جديدة.' : 'Use the button below to choose a new password.',
    ctaLabel: isArabic ? 'تعيين كلمة مرور جديدة' : 'Set new password',
    ctaUrl: resetUrl,
    noteTitle: isArabic ? 'رابط مؤقت (15 دقيقة)' : '15-minute temporary link',
    noteBody: isArabic ? 'ستنتهي صلاحية هذا الرابط خلال 15 دقيقة ويمكن استخدامه لمرة واحدة فقط. إذا لم تكن تتوقع هذا الإجراء، يُرجى التواصل مع الدعم الفني.' : 'This link will expire in 15 minutes and can only be used once. If you were not expecting this, contact support.',
    statusLabel: isArabic ? 'آمن' : 'Secure',
    showCta: true,
    showBackupLink: true,
  });
}

function passwordChangedEmail(name, rawLocale = 'en') {
  const locale = normalizeEmailLocale(rawLocale);
  const isArabic = locale === 'ar';
  return emailShell({
    locale,
    variant: 'security',
    eyebrow: isArabic ? 'تنبيه أمني' : 'Security alert',
    title: isArabic ? 'تم تغيير كلمة المرور' : 'Password changed',
    lead: isArabic ? 'تم تغيير كلمة مرور WiseResume بنجاح.' : 'Your WiseResume password was changed successfully.',
    bodyCopy: isArabic ? `مرحباً ${firstName}، هذه رسالة تأكيد بأن كلمة مرور حسابك تم تحديثها للتو.` : `Hi ${firstName}, this is a confirmation that your account password has just been updated.`,
    noteTitle: isArabic ? 'هل قمت بهذا التغيير؟' : 'Was this you?',
    noteBody: isArabic ? 'إذا كنت أنت من أجريت هذا التغيير، فلا يلزم اتخاذ أي إجراء إضافي. إذا لم تكن أنت، فأعد تعيين كلمة مرورك فوراً وتواصل مع contact@thewise.cloud.' : 'No action is needed if you made this change. If you did not, reset your password immediately and contact contact@thewise.cloud.',
    statusLabel: isArabic ? 'أمان' : 'Security',
    showCta: false,
  });
}

function welcomeEmail(name, dashboardUrl, rawLocale = 'en') {
  const locale = normalizeEmailLocale(rawLocale);
  const isArabic = locale === 'ar';
  const firstName = name || (isArabic ? 'عزيزي' : 'there');
  const targetUrl = dashboardUrl || `${FRONTEND_URL}${isArabic ? '/ar' : ''}/dashboard`;

  return emailShell({
    locale,
    variant: 'ready',
    eyebrow: isArabic ? 'مساحة العمل جاهزة' : 'Workspace ready',
    title: isArabic ? `مرحباً، ${firstName}` : `Welcome, ${firstName}`,
    lead: isArabic ? 'حسابك في WiseResume مفعّل وجاهز.' : 'Your WiseResume account is active and ready to go.',
    bodyCopy: isArabic ? 'ابدأ من لوحة التحكم لرفع سيرتك الذاتية، تحسين الأقسام الضعيفة، تخصيص ملفك للوظائف، ومتابعة تقدمك بإرشاد الذكاء الاصطناعي.' : 'Start from your dashboard to upload your resume, improve weak sections, tailor your profile to jobs, and track your progress with AI guidance.',
    ctaLabel: isArabic ? 'فتح لوحة التحكم' : 'Open dashboard',
    ctaUrl: targetUrl,
    noteTitle: isArabic ? 'الخطوة الأولى المقترحة' : 'Recommended first step',
    noteBody: isArabic ? 'ارفع أحدث نسخة من سيرتك الذاتية أولاً حتى يتمكن WiseResume من تحليل درجة ATS واقتراح أفضل خطوة تالية.' : 'Upload your latest resume first so WiseResume can analyze your current ATS score and suggest the next best action.',
    statusLabel: isArabic ? 'جاهز' : 'Ready',
    showCta: true,
    showBackupLink: false,
  });
}

// ─── Action handlers ──────────────────────────────────────────────────────────

async function handleSendVerification({ req, res, log, error, body }) {
  const locale = body?.locale === 'ar' ? 'ar' : 'en';
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
    const redirectUrl = `${FRONTEND_URL}${locale === 'ar' ? '/ar' : ''}/auth/verify-email`;
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
        subject: locale === 'ar' ? 'تأكيد بريدك الإلكتروني في WiseResume' : 'Verify your WiseResume email address',
        html:    verificationEmail(verifyUrl, locale),
      });
      log(`Verification email sent via Resend (single token) to ${sessionUser.email}`);
      return json(res, { success: true, delivery: 'resend' });
    }

    // Token was created but Appwrite did not return a secret — Resend email cannot be sent.
    error(`Verification token created for ${sessionUser.email} but no secret returned — cannot send Resend email`);
    return json(res, {
      error: 'Verification email could not be sent. Please try again.',
    }, 500);

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

async function handleSendPasswordReset({ res }) {
  return json(res, { error: 'Link-based password reset is disabled. Please use the verification code flow.' }, 400);
}

async function handleSendWelcome({ req, res, log, error, body }) {
  const locale = body?.locale === 'ar' ? 'ar' : 'en';
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
      subject: locale === 'ar' ? 'مرحباً بك في WiseResume' : 'Welcome to WiseResume — Your AI Resume Builder',
      html:    welcomeEmail(firstName, undefined, locale),
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

/**
 * Notify a user that their account password was just changed.
 *
 * Two entry points:
 *   • In-app change (Settings → Change password): the caller has an active session,
 *     so we derive the recipient from the injected user JWT (most secure).
 *   • Reset flow (logged out, after updateRecovery): no session — the page supplies
 *     the userId and we look up the email with the admin API key.
 *
 * Best-effort and fail-open: always returns { success: true } and never reveals
 * whether an account exists. It only ever sends a benign security notice, so the
 * worst-case abuse (someone POSTing a known userId) is a single rate-limited
 * "your password changed" notice — not data disclosure.
 */
async function handleSendPasswordChanged({ req, res, log, error, body }) {
  const locale = body?.locale === 'ar' ? 'ar' : 'en';
  const userJwt = headerValue(req, body, ['x-appwrite-user-jwt', 'X-Appwrite-JWT']);

  try {
    let email = '';
    let displayName = '';

    if (userJwt) {
      const userClient = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setJWT(userJwt);
      const user = await new sdk.Account(userClient).get();
      email = user.email || '';
      displayName = (user.name || '').trim();
    } else {
      const userId = (body?.userId || body?.user_id || '').trim();
      if (!userId) return json(res, { success: true });
      if (!appwriteApiKey()) {
        error('send-password-changed: APPWRITE_API_KEY not configured — cannot look up user by id');
        return json(res, { success: true });
      }
      const adminClient = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(appwriteApiKey());
      const user = await new sdk.Users(adminClient).get(userId);
      email = user.email || '';
      displayName = (user.name || '').trim();
    }

    if (!email) return json(res, { success: true });

    const firstName = displayName ? displayName.split(' ')[0] : email.split('@')[0];
    await resendSend({
      to:      email,
      subject: locale === 'ar' ? 'تم تغيير كلمة مرور WiseResume' : 'Your WiseResume password was changed',
      html:    passwordChangedEmail(firstName, locale),
    });
    log(`Password-changed notification sent to ${email}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    error(`send-password-changed failed: ${msg}`);
  }

  // Non-critical notification — never surface failure to the caller.
  return json(res, { success: true });
}

async function handleGetVerificationStatus({ req, res, log, error, body }) {
  const userId = (body?.userId || body?.user_id || '').trim();
  if (!userId) {
    return json(res, { error: 'userId is required' }, 400);
  }

  const userJwt = headerValue(req, body, ['x-appwrite-user-jwt', 'X-Appwrite-JWT']);
  if (!userJwt) {
    return json(res, { error: 'Authentication required' }, 401);
  }

  try {
    const userClient = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setJWT(userJwt);
    const user = await new sdk.Account(userClient).get();
    if (String(user.$id || '') !== userId) {
      return json(res, { error: 'Forbidden' }, 403);
    }
    return json(res, {
      success: true,
      emailVerification: user.emailVerification === true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    error(`get-verification-status failed for ${userId}: ${msg}`);
    return json(res, { error: 'Verification status is unavailable.' }, 401);
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

  const locale = normalizeEmailLocale(body?.locale);
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

    const redirectUrl = `${FRONTEND_URL}${locale === 'ar' ? '/ar' : ''}/auth/verify-email`;
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
        subject: locale === 'ar' ? 'تأكيد بريدك الإلكتروني في WiseResume' : 'Verify your WiseResume email address',
        html: verificationEmail(verifyUrl, locale),
      });
      log(`send-admin-verification: Resend email sent to ${user.email} (locale=${locale})`);
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
  const locale     = normalizeEmailLocale(body?.locale);

  if (!to || !to.includes('@')) {
    return json(res, { error: 'Valid recipient email (to) is required' }, 400);
  }

  const testVerifyUrl = `${FRONTEND_URL}${locale === 'ar' ? '/ar' : ''}/auth/verify-email?userId=test&secret=TEST_TOKEN_PREVIEW`;

  let html, subject;
  switch (template) {
    case 'verification':
      html    = verificationEmail(testVerifyUrl, locale);
      subject = locale === 'ar' ? '[TEST] تأكيد بريدك الإلكتروني في WiseResume' : '[TEST] Verify your WiseResume email address';
      break;
    case 'password-reset':
      html    = passwordResetOtpEmail('482913', locale);
      subject = locale === 'ar' ? '[TEST] رمز التحقق لإعادة تعيين كلمة المرور' : '[TEST] Password Reset Verification Code';
      break;
    case 'welcome':
    default:
      html    = welcomeEmail(name, undefined, locale);
      subject = locale === 'ar' ? '[TEST] مرحباً بك في WiseResume' : '[TEST] Welcome to WiseResume — Your AI Resume Builder';
      break;
  }

  try {
    const result = await resendSend({ to, subject, html, fromEmail, fromName });
    log(`Test email (${template}, locale=${locale}) sent to ${to} from ${fromEmail || 'default'}`);
    return json(res, { success: true, message_id: result?.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    error(`send-test (${template}) failed for ${to}: ${msg}`);
    return json(res, { error: msg }, 500);
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

const DB_ID = 'main';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getOtpSecret() {
  const secret = process.env.PASSWORD_RESET_OTP_SECRET;
  if (!secret) {
    throw new Error('PASSWORD_RESET_OTP_SECRET is not configured on the serverless environment.');
  }
  return secret;
}

function passwordResetOtpEmail(otpCode, rawLocale = 'en') {
  const locale = normalizeEmailLocale(rawLocale);
  const isArabic = locale === 'ar';

  return emailShell({
    locale,
    variant: 'secure',
    eyebrow: isArabic ? 'استعادة الحساب' : 'Account recovery',
    title: isArabic ? 'رمز استعادة الحساب' : 'Your reset code',
    lead: isArabic ? 'استخدم هذا الرمز لمرة واحدة لإعادة تعيين كلمة مرور WiseResume.' : 'Use this one-time code to reset your WiseResume password.',
    bodyCopy: isArabic ? 'تلقينا طلباً لإعادة تعيين كلمة مرور حسابك في WiseResume. أدخل الرمز التالي في صفحة الاستعادة للمتابعة.' : 'We received a password reset request for your WiseResume account. Enter the code below in the reset screen to continue.',
    otpCode,
    otpLabel: isArabic ? 'رمز التحقق' : 'Verification code',
    noteTitle: isArabic ? 'ينتهي خلال 15 دقيقة' : 'Expires in 15 minutes',
    noteBody: isArabic ? 'هذا الرمز صالح لمرة واحدة فقط. لا تشاركه مع أي شخص، حتى دعم WiseResume.' : 'This code can only be used once. Never share it with anyone, including WiseResume support.',
    statusLabel: isArabic ? 'آمن' : 'Secure',
    footerHint: isArabic ? 'WiseResume — مساحة عمل ذكية لسيرتك المهنية.' : 'WiseResume — your AI career workspace.',
    showCta: false,
  });
}

async function handleSendPasswordResetOtp({ req, res, log, error, body, adminAudit = null }) {
  const locale = normalizeEmailLocale(body?.locale);
  const email = (body?.email || '').trim().toLowerCase();
  const clientIp = headerValue(req, body, ['x-forwarded-for', 'x-real-ip', 'client-ip']) || '127.0.0.1';
  const userAgent = (headerValue(req, body, ['user-agent']) || '').slice(0, 512);

  if (!email || !email.includes('@')) {
    return json(res, { error: 'Valid email address required' }, 400);
  }

  let secret;
  try {
    secret = getOtpSecret();
  } catch (err) {
    error(`OTP configuration error: ${err.message}`);
    return json(res, { error: 'Internal server configuration error' }, 500);
  }

  const apiKey = appwriteApiKey();
  const adminClient = new sdk.Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(apiKey);

  const db = new sdk.Databases(adminClient);
  const users = new sdk.Users(adminClient);

  try {
    const now = new Date();

    // 1. Cooldown check (60 seconds)
    const recentOtps = await db.listDocuments(DB_ID, 'password_reset_otps', [
      sdk.Query.equal('email', email),
      sdk.Query.greaterThan('created_at', new Date(Date.now() - 60000).toISOString()),
      sdk.Query.equal('used', false),
    ]);

    if (recentOtps.total > 0) {
      return json(res, { error: 'Please wait 60 seconds before requesting another code.' }, 429);
    }

    // 2. Check if user exists (silent exit for non-existing user)
    let userExists = false;
    try {
      const userList = await users.list([sdk.Query.equal('email', email)]);
      if (userList.total > 0) {
        userExists = true;
      }
    } catch (usersErr) {
      error(`Users list check failed: ${usersErr.message}`);
    }

    if (!userExists) {
      // Timing parity: Perform a synthetic hash calculation and sleep
      const dummyCode = '987654';
      crypto.createHmac('sha256', secret).update(dummyCode).digest('hex');
      await sleep(100);
      log(`Password reset OTP requested for unregistered email: ${email} (silently bypassed)`);
      return json(res, { success: true });
    }

    // 3. Revoke all old unused OTPs
    const activeOtps = await db.listDocuments(DB_ID, 'password_reset_otps', [
      sdk.Query.equal('email', email),
      sdk.Query.equal('used', false),
      sdk.Query.isNull('revoked_at'),
    ]);

    for (const doc of activeOtps.documents) {
      await db.updateDocument(DB_ID, 'password_reset_otps', doc.$id, {
        revoked_at: now.toISOString(),
      });
    }

    // 4. Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHmac('sha256', secret).update(otpCode).digest('hex');

    // 5. Store OTP document (with clientIp and sanitized userAgent)
    await db.createDocument(DB_ID, 'password_reset_otps', sdk.ID.unique(), {
      email,
      otp_hash: otpHash,
      purpose: 'password_reset',
      attempts: 0,
      max_attempts: 5,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      used: false,
      created_at: now.toISOString(),
      request_ip: clientIp.slice(0, 64),
      device_metadata: userAgent,
    });

    // 6. Send OTP email via Resend
    await resendSend({
      to: email,
      subject: locale === 'ar' ? 'رمز التحقق لإعادة تعيين كلمة المرور' : 'Password Reset Verification Code',
      html: passwordResetOtpEmail(otpCode, locale),
    });

    if (adminAudit?.targetUserId) {
      try {
        await db.createDocument(DB_ID, 'admin_audit_logs', sdk.ID.unique(), {
          user_id: adminAudit.targetUserId,
          category: 'devkit',
          action: 'admin-password-reset-code-sent',
          metadata: JSON.stringify({ actor_user_id: adminAudit.actorUserId || null }),
        });
      } catch {
        error('Admin password reset code delivered but audit logging failed');
        return json(res, { success: true, warning: 'Password reset code sent, but audit logging failed.' });
      }
    }

    log(adminAudit ? 'Admin password reset code delivered' : 'Password reset code delivered');
    return json(res, { success: true });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    error(adminAudit ? 'Admin password reset code delivery failed' : `send-password-reset-otp failed: ${msg}`);
    return json(res, { error: 'Failed to send password reset code.' }, 500);
  }
}

function getInternalHmacSecret() {
  return process.env.EMAIL_SERVICE_INTERNAL_HMAC_SECRET || '';
}

function verifyInternalRequestSignature(body) {
  const secret = getInternalHmacSecret();
  if (!secret) return false;

  const timestamp = Number(body?.timestamp);
  const targetUserId = String(body?.target_user_id || '').trim();
  const targetEmail = String(body?.target_email || '').trim();
  const actorUserId = body?.actor_user_id != null ? String(body.actor_user_id) : '';
  const signature = String(body?.signature || '').trim();

  if (!timestamp || !targetUserId || !targetEmail || !signature) return false;

  if (Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) return false;

  const message = `${timestamp}:${targetUserId}:${targetEmail}:${actorUserId}`;
  const expected = crypto.createHmac('sha256', secret).update(message).digest('base64url');

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

async function handleInternalSendAdminPasswordResetOtp({ req, res, log, error, body }) {
  if (!verifyInternalRequestSignature(body)) {
    error('internal-send-admin-password-reset-otp: invalid or missing internal HMAC signature');
    return json(res, { error: 'Unauthorized' }, 401);
  }

  const targetUserId = String(body?.target_user_id || '').trim();
  const targetEmail = String(body?.target_email || '').trim();
  const actorUserId = body?.actor_user_id || null;

  return handleSendPasswordResetOtp({
    req,
    res,
    log,
    error,
    body: { email: targetEmail, locale: body?.locale },
    adminAudit: {
      targetUserId,
      actorUserId,
    },
  });
}

async function handleSendAdminPasswordResetOtp({ res, error }) {
  error('send-admin-password-reset-otp: direct caller access deprecated');
  return json(res, { error: 'Direct caller access to admin password reset is deprecated. Route through admin-devkit-data.' }, 401);
}

async function handleInternalSendAdminPasswordResetLink({ req, res, log, error, body }) {
  if (!verifyInternalRequestSignature(body)) {
    error('internal-send-admin-password-reset-link: invalid or missing internal HMAC signature');
    return json(res, { error: 'Unauthorized' }, 401);
  }

  const targetUserId = String(body?.target_user_id || '').trim();
  const targetEmail = String(body?.target_email || '').trim().toLowerCase();
  const actorUserId = body?.actor_user_id || null;
  const locale = body?.locale === 'ar' ? 'ar' : 'en';
  const clientIp = headerValue(req, body, ['x-forwarded-for', 'x-real-ip', 'client-ip']) || '127.0.0.1';
  const userAgent = (headerValue(req, body, ['user-agent']) || '').slice(0, 512);

  if (!targetEmail || !targetEmail.includes('@')) {
    return json(res, { error: 'Valid target email address required' }, 400);
  }

  let secret;
  try {
    secret = getOtpSecret();
  } catch (err) {
    error(`OTP configuration error: ${err.message}`);
    return json(res, { error: 'Internal server configuration error' }, 500);
  }

  const apiKey = appwriteApiKey();
  const adminClient = new sdk.Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(apiKey);

  const db = new sdk.Databases(adminClient);
  const users = new sdk.Users(adminClient);

  try {
    const now = new Date();

    let userExists = false;
    try {
      const userList = await users.list([sdk.Query.equal('email', targetEmail)]);
      if (userList.total > 0) {
        userExists = true;
      }
    } catch (usersErr) {
      error(`Users list check failed: ${usersErr.message}`);
    }

    if (!userExists) {
      const dummyCode = '98765432101234567890';
      crypto.createHmac('sha256', secret).update(dummyCode).digest('hex');
      await sleep(100);
      log(`Admin password reset link requested for unregistered email: ${targetEmail} (silently bypassed)`);
      return json(res, { success: true });
    }

    const activeOtps = await db.listDocuments(DB_ID, 'password_reset_otps', [
      sdk.Query.equal('email', targetEmail),
      sdk.Query.equal('used', false),
      sdk.Query.isNull('revoked_at'),
    ]);

    for (const doc of activeOtps.documents) {
      await db.updateDocument(DB_ID, 'password_reset_otps', doc.$id, {
        revoked_at: now.toISOString(),
      });
    }

    const rawChallengeToken = crypto.randomBytes(32).toString('base64url');
    const challengeTokenHash = crypto.createHmac('sha256', secret).update(rawChallengeToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await db.createDocument(DB_ID, 'password_reset_otps', sdk.ID.unique(), {
      email: targetEmail,
      otp_hash: 'ADMIN_LINK_' + crypto.randomBytes(8).toString('hex'),
      purpose: 'admin_password_reset_link',
      attempts: 0,
      max_attempts: 5,
      expires_at: expiresAt,
      used: false,
      created_at: now.toISOString(),
      request_ip: clientIp.slice(0, 64),
      device_metadata: userAgent,
      challenge_token_hash: challengeTokenHash,
      challenge_expires_at: expiresAt,
    });

    const path = locale === 'ar' ? '/ar/auth/reset-password' : '/auth/reset-password';
    const resetUrl = `${FRONTEND_URL}${path}?email=${encodeURIComponent(targetEmail)}&challengeToken=${encodeURIComponent(rawChallengeToken)}`;

    await resendSend({
      to: targetEmail,
      subject: locale === 'ar' ? 'تعيين كلمة مرور جديدة لحساب WiseResume' : 'Set your new WiseResume password',
      html: adminPasswordResetLinkEmail(resetUrl, locale),
    });

    if (targetUserId) {
      try {
        await db.createDocument(DB_ID, 'admin_audit_logs', sdk.ID.unique(), {
          user_id: targetUserId,
          category: 'devkit',
          action: 'admin-password-reset-link-sent',
          metadata: JSON.stringify({ actor_user_id: actorUserId || null }),
        });
      } catch {
        error('Admin password reset link delivered but audit logging failed');
        return json(res, { success: true, warning: 'Password reset link sent, but audit logging failed.' });
      }
    }

    log('Admin password reset link delivered');
    return json(res, { success: true });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    error(`internal-send-admin-password-reset-link failed: ${msg}`);
    return json(res, { error: 'Failed to send password reset link.' }, 500);
  }
}

async function handleSendAdminPasswordResetLink({ res, error }) {
  error('send-admin-password-reset-link: direct caller access deprecated');
  return json(res, { error: 'Direct caller access to admin password reset link is deprecated. Route through admin-devkit-data.' }, 401);
}

async function handleVerifyPasswordResetOtp({ req, res, log, error, body }) {
  const email = (body?.email || '').trim().toLowerCase();
  const otp = (body?.otp || '').trim();

  if (!email || !otp) {
    return json(res, { error: 'Email and OTP code are required' }, 400);
  }

  let secret;
  try {
    secret = getOtpSecret();
  } catch (err) {
    error(`OTP configuration error: ${err.message}`);
    return json(res, { error: 'Internal server error' }, 500);
  }

  const apiKey = appwriteApiKey();
  const adminClient = new sdk.Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(apiKey);

  const db = new sdk.Databases(adminClient);

  try {
    const now = new Date().toISOString();

    const otps = await db.listDocuments(DB_ID, 'password_reset_otps', [
      sdk.Query.equal('email', email),
      sdk.Query.equal('used', false),
      sdk.Query.isNull('revoked_at'),
      sdk.Query.greaterThan('expires_at', now),
      sdk.Query.orderDesc('created_at'),
      sdk.Query.limit(1),
    ]);

    if (otps.total === 0) {
      return json(res, { error: 'Invalid or expired code.' }, 400);
    }

    const doc = otps.documents[0];

    let attempts = doc.attempts;
    if (attempts >= doc.max_attempts) {
      await db.updateDocument(DB_ID, 'password_reset_otps', doc.$id, {
        revoked_at: new Date().toISOString(),
      });
      return json(res, { error: 'Too many failed attempts. Please request a new code.' }, 400);
    }

    attempts += 1;
    await db.updateDocument(DB_ID, 'password_reset_otps', doc.$id, { attempts });

    if (attempts >= doc.max_attempts) {
      await db.updateDocument(DB_ID, 'password_reset_otps', doc.$id, {
        revoked_at: new Date().toISOString(),
      });
    }

    // Timing-safe check
    const inputHash = crypto.createHmac('sha256', secret).update(otp).digest('hex');
    const inputBuffer = Buffer.from(inputHash);
    const storedBuffer = Buffer.from(doc.otp_hash);
    const isMatch = inputBuffer.length === storedBuffer.length && crypto.timingSafeEqual(inputBuffer, storedBuffer);

    if (!isMatch) {
      return json(res, { error: 'Invalid code.' }, 400);
    }

    // OTP correct! Generate challenge token & save challenge_token_hash
    const rawChallengeToken = crypto.randomBytes(32).toString('hex');
    const challengeTokenHash = crypto.createHmac('sha256', secret).update(rawChallengeToken).digest('hex');

    await db.updateDocument(DB_ID, 'password_reset_otps', doc.$id, {
      challenge_token_hash: challengeTokenHash,
      challenge_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    log(`OTP verified successfully for ${email}. Challenge generated.`);
    return json(res, { success: true, challengeToken: rawChallengeToken });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    error(`verify-password-reset-otp failed: ${msg}`);
    return json(res, { error: 'Verification failed.' }, 500);
  }
}

async function handleCompletePasswordReset({ res, log, error, body }) {
  const locale = normalizeEmailLocale(body?.locale);
  const email = (body?.email || '').trim().toLowerCase();
  const challengeToken = (body?.challengeToken || '').trim();
  const password = body?.password;

  if (!email || !challengeToken || !password) {
    return json(res, { error: 'Email, challenge token, and new password are required' }, 400);
  }

  if (password.length < 8) {
    return json(res, { error: 'Password must be at least 8 characters long.' }, 400);
  }

  let secret;
  try {
    secret = getOtpSecret();
  } catch (err) {
    error(`OTP configuration error: ${err.message}`);
    return json(res, { error: 'Internal server error' }, 500);
  }

  const apiKey = appwriteApiKey();
  const adminClient = new sdk.Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(apiKey);

  const db = new sdk.Databases(adminClient);
  const users = new sdk.Users(adminClient);

  try {
    const now = new Date().toISOString();
    const challengeTokenHash = crypto.createHmac('sha256', secret).update(challengeToken).digest('hex');

    const otps = await db.listDocuments(DB_ID, 'password_reset_otps', [
      sdk.Query.equal('email', email),
      sdk.Query.equal('challenge_token_hash', challengeTokenHash),
      sdk.Query.equal('used', false),
      sdk.Query.isNull('revoked_at'),
      sdk.Query.greaterThan('challenge_expires_at', now),
    ]);

    if (otps.total === 0) {
      return json(res, { error: 'Invalid or expired reset challenge. Please request a new code.' }, 400);
    }

    const doc = otps.documents[0];

    // timing-safe challenge comparison
    const challengeBuffer = Buffer.from(challengeTokenHash);
    const storedChallengeBuffer = Buffer.from(doc.challenge_token_hash);
    const isChallengeMatch = challengeBuffer.length === storedChallengeBuffer.length && crypto.timingSafeEqual(challengeBuffer, storedChallengeBuffer);

    if (!isChallengeMatch) {
      return json(res, { error: 'Security verification failed.' }, 400);
    }

    // Look up user ID and update password
    const userList = await users.list([sdk.Query.equal('email', email)]);
    if (userList.total === 0) {
      return json(res, { error: 'User account not found.' }, 404);
    }

    const appwriteUser = userList.users[0];
    await users.updatePassword(appwriteUser.$id, password);

    // Consume challenge & mark used
    await db.updateDocument(DB_ID, 'password_reset_otps', doc.$id, {
      used: true,
      used_at: new Date().toISOString(),
      challenge_token_hash: '', // clear challenge hash to prevent reuse
    });

    // Send email alert
    try {
      await resendSend({
        to: email,
        subject: locale === 'ar' ? 'تم تغيير كلمة مرور WiseResume' : 'Your WiseResume password was changed',
        html: passwordChangedEmail(appwriteUser.name, locale),
      });
    } catch (emailErr) {
      error(`Failed to send password-changed email to ${email}: ${emailErr.message}`);
    }

    log(`Password reset completed successfully for user ID ${appwriteUser.$id} (${email})`);
    return json(res, { success: true });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    error(`reset-password-with-otp failed: ${msg}`);
    return json(res, { error: 'Failed to reset password.' }, 500);
  }
}

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

    case 'send-password-reset-otp':
      return handleSendPasswordResetOtp({ req, res, log, error, body });

    case 'send-admin-password-reset-otp':
      return handleSendAdminPasswordResetOtp({ req, res, log, error, body });

    case 'internal-send-admin-password-reset-otp':
      return handleInternalSendAdminPasswordResetOtp({ req, res, log, error, body });

    case 'send-admin-password-reset-link':
      return handleSendAdminPasswordResetLink({ req, res, log, error, body });

    case 'internal-send-admin-password-reset-link':
      return handleInternalSendAdminPasswordResetLink({ req, res, log, error, body });

    case 'verify-password-reset-otp':
      return handleVerifyPasswordResetOtp({ req, res, log, error, body });

    case 'reset-password-with-otp':
      return handleCompletePasswordReset({ res, log, error, body });

    case 'send-welcome':
      return handleSendWelcome({ req, res, log, error, body });

    case 'send-password-changed':
      return handleSendPasswordChanged({ req, res, log, error, body });

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

module.exports._test = {
  getOtpSecret,
  getInternalHmacSecret,
  verifyInternalRequestSignature,
  handleInternalSendAdminPasswordResetOtp,
  handleInternalSendAdminPasswordResetLink,
};
