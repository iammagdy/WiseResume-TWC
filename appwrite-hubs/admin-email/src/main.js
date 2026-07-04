/**
 * admin-email — Appwrite Function
 *
 * Serves EmailManagementPanel (email-actions module) and
 * EmailAutomationsPanel (resend-stats + resend-sync modules).
 *
 * Auth: Authorization: Bearer <DEVKIT_PASSWORD>
 * Runtime: Node.js 18
 *
 * Required Function Variables:
 *   DEVKIT_PASSWORD          — shared secret matching the frontend DevKit token
 *   RESEND_API_KEY           — Resend API key (re:_xxx)
 *   RESEND_FROM_EMAIL        — sender address, e.g. hello@thewise.cloud
 *   RESEND_FROM_NAME         — sender display name, e.g. "WiseResume"
 *   APPWRITE_API_KEY         — Appwrite API key with databases.read scope
 *   APPWRITE_ENDPOINT        — e.g. https://fra.cloud.appwrite.io/v1
 *   APPWRITE_PROJECT_ID      — e.g. 69fd362b001eb325a192
 *
 * Optional segment variables (preferred; any subset may be set):
 *   RESEND_SEGMENT_ALL_USERS
 *   RESEND_SEGMENT_PREMIUM_USERS
 *   RESEND_SEGMENT_FREE_USERS
 *   RESEND_SEGMENT_TRIAL_USERS
 *   RESEND_SEGMENT_INACTIVE
 *
 * Legacy audience variables remain supported as fallback:
 *   RESEND_AUDIENCE_ALL_USERS
 *   RESEND_AUDIENCE_PREMIUM_USERS
 *   RESEND_AUDIENCE_FREE_USERS
 *   RESEND_AUDIENCE_TRIAL_USERS
 *   RESEND_AUDIENCE_INACTIVE
 *
 * Database ID: main
 * Collections used: profiles (for sync)
 */

'use strict';

const sdk = require('node-appwrite');
const crypto = require('crypto');

// ─── Config ────────────────────────────────────────────────────────────────

const DB_ID         = 'main';
const RESEND_BASE   = 'https://api.resend.com';

// Audience definitions — key suffix → human label
const AUDIENCE_DEFS = [
  { key: 'ALL_USERS',     label: 'All Users',     trigger: 'On signup',    emails: ['Welcome email', 'Day-3 tips', 'Day-7 check-in'] },
  { key: 'PREMIUM_USERS', label: 'Premium Users', trigger: 'On upgrade',   emails: ['Upgrade confirmation', 'Pro tips series'] },
  { key: 'FREE_USERS',    label: 'Free Users',    trigger: 'On signup',    emails: ['Upgrade nudge (day 14)'] },
  { key: 'TRIAL_USERS',   label: 'Trial Users',   trigger: 'On trial',     emails: ['Trial welcome', 'Expiry reminder'] },
  { key: 'INACTIVE',      label: 'Inactive',      trigger: 'On 30d inactivity', emails: ['Re-engagement email'] },
];

function segmentKey(key) { return `RESEND_SEGMENT_${key}`; }
function audienceKey(key) { return `RESEND_AUDIENCE_${key}`; }

function defForKey(key) {
  return AUDIENCE_DEFS.find(def => def.key === key);
}

function resolveResendList(keyOrEnvKey) {
  const raw = String(keyOrEnvKey || '').trim();
  const key = raw.replace(/^RESEND_(SEGMENT|AUDIENCE)_/, '');
  const def = defForKey(key);
  if (!def) return null;
  const preferredKey = segmentKey(def.key);
  const legacyKey = audienceKey(def.key);
  const segmentId = process.env[preferredKey];
  const audienceId = process.env[legacyKey];
  if (segmentId) {
    return {
      key: def.key,
      label: def.label,
      id: segmentId,
      type: 'segment',
      configKey: preferredKey,
      legacyAudienceKey: legacyKey,
      configured: true,
    };
  }
  if (audienceId) {
    return {
      key: def.key,
      label: def.label,
      id: audienceId,
      type: 'audience',
      configKey: legacyKey,
      legacyAudienceKey: legacyKey,
      configured: true,
    };
  }
  return {
    key: def.key,
    label: def.label,
    id: null,
    type: 'segment',
    configKey: preferredKey,
    legacyAudienceKey: legacyKey,
    configured: false,
  };
}

function setupRequired(message) {
  return {
    setupRequired: true,
    code: 'RESEND_SEGMENT_NOT_CONFIGURED',
    message,
    total: 0,
    added: 0,
    failed: 0,
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Auth ────────────────────────────────────────────────────────────────────

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function verifySignedToken(token) {
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
  try { payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); } catch { return false; }
  return payload.purpose === 'devkit' && typeof payload.exp === 'number' && Date.now() < payload.exp;
}

function bearerToken(req, body) {
  const authHeader = body?.__headers?.Authorization || req.headers?.authorization || req.headers?.Authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
}

function timingSafeStringEqual(a, b) {
  const nonce = crypto.randomBytes(32);
  const h1 = crypto.createHmac('sha256', nonce).update(String(a)).digest();
  const h2 = crypto.createHmac('sha256', nonce).update(String(b)).digest();
  return crypto.timingSafeEqual(h1, h2);
}

function checkAuth(req, body) {
  const token = bearerToken(req, body);
  if (!token) return false;
  // Raw DEVKIT_PASSWORD bearer fallback removed (security): only short-lived
  // signed DevKit tokens (minted by admin-devkit-data after JWT + admin-label
  // verification) are accepted.
  return verifySignedToken(token);
}

// ─── SDK client ──────────────────────────────────────────────────────────────

function getClients() {
  const client = new sdk.Client();
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY || '');
  return { databases: new sdk.Databases(client) };
}

// ─── Resend HTTP helper ───────────────────────────────────────────────────────

async function resendRequest(method, path, body) {
  const apiKey = process.env.RESEND_API_KEY || '';
  const url = `${RESEND_BASE}${path}`;

  const init = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) init.body = JSON.stringify(body);

  const res = await fetch(url, init);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  if (!res.ok) {
    const msg = json?.message || json?.error || `Resend HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

// ─── Resend audience contact count ───────────────────────────────────────────

function listPath(config) {
  return config.type === 'segment'
    ? `/segments/${encodeURIComponent(config.id)}/contacts`
    : `/audiences/${encodeURIComponent(config.id)}/contacts`;
}

function detailPath(config) {
  return config.type === 'segment'
    ? `/segments/${encodeURIComponent(config.id)}`
    : `/audiences/${encodeURIComponent(config.id)}`;
}

async function getAudienceContactCount(config) {
  try {
    const res = await resendRequest('GET', listPath(config));
    const contacts = res.data || [];
    return contacts.length;
  } catch {
    return null;
  }
}

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || undefined,
    lastName: parts.slice(1).join(' ') || undefined,
  };
}

async function createGlobalContact(email, profile = {}) {
  const name = splitName(profile.full_name || profile.name || '');
  try {
    await resendRequest('POST', '/contacts', {
      email,
      firstName: name.firstName,
      lastName: name.lastName,
      unsubscribed: false,
    });
  } catch (e) {
    if (!/already|exist|duplicate/i.test(e.message || '')) throw e;
  }
}

async function addContactToList(config, email, profile = {}) {
  if (config.type === 'segment') {
    await createGlobalContact(email, profile);
    await sleep(250);
    try {
      await resendRequest('POST', `/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(config.id)}`);
    } catch (e) {
      if (!/already|exist|duplicate/i.test(e.message || '')) throw e;
    }
    return;
  }
  const name = splitName(profile.full_name || profile.name || '');
  try {
    await resendRequest('POST', `/audiences/${encodeURIComponent(config.id)}/contacts`, {
      email,
      first_name: name.firstName,
      last_name: name.lastName,
      unsubscribed: false,
    });
  } catch (e) {
    if (!/already|exist|duplicate/i.test(e.message || '')) throw e;
  }
}

async function removeContactFromList(config, email) {
  if (config.type === 'segment') {
    await resendRequest('DELETE', `/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(config.id)}`);
    return;
  }
  await resendRequest('DELETE', `/audiences/${encodeURIComponent(config.id)}/contacts`, { email });
}

// ─── Module: resend-stats / action: stats ────────────────────────────────────

/**
 * @param {number} days - rolling window for delivery stats (default 30)
 */
async function handleResendStats(days) {
  const window = Math.max(1, Math.min(365, Number(days) || 30));
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      audiences: AUDIENCE_DEFS.map(def => ({
        key: def.key,
        label: def.label,
        configured: false,
        id: null,
        contactCount: null,
      })),
      checklist: buildChecklist(),
      recentBroadcasts: [],
      broadcastsNote: 'RESEND_API_KEY is not configured in Appwrite Function Variables.',
      deliveryStats: { days: window, sent: 0, bounced: 0, complained: 0, opened: 0, clicked: 0, bounceRate: 0, openRate: 0, clickRate: 0 },
    };
  }

  const sinceDate = new Date(Date.now() - window * 86400000).toISOString().slice(0, 10);

  // Build audience stats and fetch delivery stats + broadcasts concurrently
  const [audiences, deliveryStats, broadcastResult] = await Promise.all([
    // Audience stats
    Promise.all(
      AUDIENCE_DEFS.map(async (def) => {
        const config = resolveResendList(def.key);
        const id = config.id;
        const configured = config.configured;
        const contactCount = configured ? await getAudienceContactCount(config) : null;

        let name;
        if (id) {
          try {
            const r = await resendRequest('GET', detailPath(config));
            name = r.name;
          } catch {
            name = undefined;
          }
        }

        return {
          key: def.key,
          label: def.label,
          configured,
          id,
          contactCount,
          name,
          type: config.type,
          configKey: config.configKey,
          legacyAudienceKey: config.legacyAudienceKey,
        };
      }),
    ),

    // Delivery stats — aggregate from sent emails in the window
    (async () => {
      try {
        // Resend's /emails endpoint returns a list of sent emails.
        // We filter by created_at >= sinceDate in the response (no server-side date filter in v1 API).
        const res = await resendRequest('GET', '/emails?limit=100');
        const emails = res.data || [];

        const inWindow = emails.filter(e => {
          const created = (e.created_at || '').slice(0, 10);
          return created >= sinceDate;
        });

        const sent       = inWindow.length;
        const bounced    = inWindow.filter(e => e.last_event === 'bounced'   || e.status === 'bounced').length;
        const complained = inWindow.filter(e => e.last_event === 'complained' || e.status === 'complained').length;
        const opened     = inWindow.filter(e => e.last_event === 'opened'    || e.status === 'opened' || (e.opens && e.opens > 0)).length;
        const clicked    = inWindow.filter(e => e.last_event === 'clicked'   || e.status === 'clicked' || (e.clicks && e.clicks > 0)).length;

        return {
          days:       window,
          sent,
          bounced,
          complained,
          opened,
          clicked,
          bounceRate: sent > 0 ? Math.round((bounced / sent) * 1000) / 10 : 0,
          openRate:   sent > 0 ? Math.round((opened  / sent) * 1000) / 10 : 0,
          clickRate:  sent > 0 ? Math.round((clicked / sent) * 1000) / 10 : 0,
        };
      } catch {
        return { days: window, sent: 0, bounced: 0, complained: 0, opened: 0, clicked: 0, bounceRate: 0, openRate: 0, clickRate: 0 };
      }
    })(),

    // Recent broadcasts
    (async () => {
      try {
        const res = await resendRequest('GET', '/broadcasts');
        const items = (res.data || [])
          .filter(b => b.status === 'sent' && (!b.sent_at || b.sent_at.slice(0, 10) >= sinceDate))
          .slice(0, 10)
          .map(b => ({
            id:         b.id,
            name:       b.name || '(untitled)',
            status:     b.status,
            sentAt:     b.sent_at || null,
            recipients: b.metrics?.recipients ?? null,
            openRate:   b.metrics?.open_rate  ?? null,
            clickRate:  b.metrics?.click_rate ?? null,
          }));
        return { broadcasts: items, note: undefined };
      } catch (e) {
        return { broadcasts: [], note: `Could not fetch broadcasts: ${e.message}` };
      }
    })(),
  ]);

  return {
    audiences,
    checklist:        buildChecklist(),
    recentBroadcasts: broadcastResult.broadcasts,
    broadcastsNote:   broadcastResult.note,
    deliveryStats,
  };
}

function buildChecklist() {
  return AUDIENCE_DEFS.map(def => ({
    key:        def.key,
    name:       def.label,
    audienceKey: segmentKey(def.key),
    legacyAudienceKey: audienceKey(def.key),
    trigger:    def.trigger,
    emails:     def.emails,
  }));
}

// ─── Module: resend-stats / action: lookup ───────────────────────────────────

async function handleLookup(email) {
  if (!email) throw new Error('email is required');

  const foundIn = [];
  await Promise.all(
    AUDIENCE_DEFS.map(async (def) => {
      const config = resolveResendList(def.key);
      if (!config?.configured) return;
      try {
        const res = await resendRequest('GET', listPath(config));
        const contacts = res.data || [];
        const found = contacts.some(c => (c.email || '').toLowerCase() === email.toLowerCase());
        if (found) foundIn.push(def.label);
      } catch {
        // Skip audiences that error
      }
    }),
  );

  return { foundIn };
}

// ─── Module: resend-stats / action: add ──────────────────────────────────────

async function handleAddContact(audienceKey, email) {
  const config = resolveResendList(audienceKey);
  if (!config?.configured) throw new Error(`Set ${config?.configKey || 'RESEND_SEGMENT_*'} or ${config?.legacyAudienceKey || 'RESEND_AUDIENCE_*'} first`);
  if (!email) throw new Error('email is required');

  await addContactToList(config, email);
  return { ok: true };
}

// ─── Module: resend-stats / action: remove ───────────────────────────────────

async function handleRemoveContact(audienceKey, email) {
  const config = resolveResendList(audienceKey);
  if (!config?.configured) throw new Error(`Set ${config?.configKey || 'RESEND_SEGMENT_*'} or ${config?.legacyAudienceKey || 'RESEND_AUDIENCE_*'} first`);
  if (!email) throw new Error('email is required');

  await removeContactFromList(config, email);
  return { ok: true };
}

// ─── Module: resend-sync ─────────────────────────────────────────────────────

async function handleSync(databases) {
  if (!process.env.RESEND_API_KEY) {
    return setupRequired('RESEND_API_KEY is not configured on admin-email.');
  }
  const config = resolveResendList('ALL_USERS');
  if (!config?.configured) {
    return setupRequired('Set RESEND_SEGMENT_ALL_USERS on admin-email. RESEND_AUDIENCE_ALL_USERS is still accepted as a legacy fallback.');
  }

  // Fetch all profiles from Appwrite (page through all)
  const profiles = [];
  let cursor = null;
  while (true) {
    const q = [sdk.Query.limit(500)];
    if (cursor) q.push(sdk.Query.cursorAfter(cursor));
    let page;
    try {
      page = await databases.listDocuments(DB_ID, 'profiles', q);
    } catch {
      break;
    }
    const docs = page.documents || [];
    profiles.push(...docs);
    if (docs.length < 500) break;
    cursor = docs[docs.length - 1].$id;
  }

  let added = 0;
  let failed = 0;
  const failureReasons = {};

  // Upsert each profile into the configured Resend segment or legacy audience.
  // Keep this sequential to stay under Resend's contact/segment rate limits.
  for (const profile of profiles) {
    const email = profile.email || profile.contact_email;
    if (!email) { failed++; continue; }
    try {
      await addContactToList(config, email, profile);
      added++;
    } catch (e) {
      failed++;
      const reason = String(e.message || 'unknown').slice(0, 120);
      failureReasons[reason] = (failureReasons[reason] || 0) + 1;
    }
    await sleep(250);
  }

  return { total: profiles.length, added, failed, failureReasons, type: config.type, configKey: config.configKey };
}

// ─── Module: email-actions / action: diagnose ────────────────────────────────

/**
 * Called by EmailManagementPanel on mount to check if RESEND_API_KEY is set.
 * Returns { resend_api_key_configured: boolean, note?: string }.
 */
function handleDiagnose() {
  const configured = !!process.env.RESEND_API_KEY;
  return {
    resend_api_key_configured: configured,
    note: configured
      ? 'RESEND_API_KEY is present. Verify thewise.cloud domain in Resend for delivery to work.'
      : 'RESEND_API_KEY is not set. Add it in Appwrite Console → Functions → admin-email → Variables.',
  };
}

// ─── sendAppEmail helper ──────────────────────────────────────────────────────
// Mirrors the same helper in admin-testmail/src/main.js.
// When EMAIL_TEST_MODE=true, replaces `to` with `{namespace}.{tag}@inbox.testmail.app`
// so outgoing emails land in Testmail instead of the real inbox.

async function sendAppEmail({ to, subject, html, text, tag, fromEmail, fromName }) {
  const apiKey    = process.env.RESEND_API_KEY || '';
  const resolvedFromEmail = fromEmail || process.env.RESEND_FROM_EMAIL || 'hello@thewise.cloud';
  const resolvedFromName  = fromName  || process.env.RESEND_FROM_NAME  || 'WiseResume';
  const from      = `${resolvedFromName} <${resolvedFromEmail}>`;
  const namespace = process.env.TESTMAIL_NAMESPACE || 'ajku9';
  const testMode  = process.env.EMAIL_TEST_MODE === 'true';

  const sentTo = testMode
    ? `${namespace}.${tag}@inbox.testmail.app`
    : to;

  const payload = { from, to: sentTo, subject, html };
  if (text) payload.text = text;

  const result = await resendRequest('POST', '/emails', payload);
  return {
    email:      to,
    sentTo,
    testMode,
    tag,
    message_id: result.id || null,
  };
}

// ─── Module: email-actions ────────────────────────────────────────────────────

async function handleEmailAction(action, body) {
  // diagnose doesn't need the API key — it just checks presence
  if (action === 'diagnose') return handleDiagnose();

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured in Appwrite Function Variables');

  const to = body.target_email || body.to;
  if (!to) throw new Error('target_email is required');

  let subject, html, tag;

  switch (action) {
    case 'resend_confirmation':
      subject = 'Confirm your WiseResume email address';
      html    = confirmationEmailHtml(to);
      tag     = 'signup';
      break;

    case 'send_magic_link':
      subject = 'Your WiseResume sign-in link';
      html    = magicLinkEmailHtml(to);
      tag     = 'magic-link';
      break;

    case 'send_otp':
      subject = 'Your WiseResume verification code';
      html    = otpEmailHtml();
      tag     = 'otp';
      break;

    case 'send_password_reset':
      throw new Error('Password reset links are generated by admin-devkit-data. Use send-admin-password-reset-link.');

    case 'send_test_template': {
      const template = String(body.template || 'welcome').trim();
      const displayName = String(body.name || 'Tester').trim() || 'Tester';
      const previewVerificationUrl = 'https://wiseresume.app/auth/verify-email?userId=test&secret=TEST_TOKEN_PREVIEW';
      const previewResetUrl = 'https://wiseresume.app/auth/reset-password?userId=test&secret=TEST_TOKEN_PREVIEW';

      switch (template) {
        case 'verification':
          subject = '[TEST] Verify your WiseResume email address';
          html = confirmationEmailHtml(to, previewVerificationUrl);
          tag = 'verification-preview';
          break;
        case 'password-reset':
          subject = '[TEST] Reset your WiseResume password';
          html = passwordResetEmailHtml(to, previewResetUrl);
          tag = 'password-reset-preview';
          break;
        case 'welcome':
        default:
          subject = '[TEST] Welcome to WiseResume';
          html = welcomeEmailHtml(displayName);
          tag = 'welcome-preview';
          break;
      }

      const result = await sendAppEmail({
        to,
        subject,
        html,
        tag,
        fromEmail: body.from_email || null,
        fromName: body.from_name || null,
      });
      return { email: result.email, message_id: result.message_id };
    }

    case 'send_custom': {
      const customSubject = body.custom_subject;
      const customBody    = body.custom_body;
      if (!customSubject || !customBody) {
        throw new Error('custom_subject and custom_body are required for send_custom');
      }
      subject = customSubject;
      html    = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;"><p style="white-space:pre-wrap">${escapeHtml(customBody)}</p></div>`;
      tag     = 'custom';
      break;
    }

    default:
      throw new Error(`Unknown email action: ${action}`);
  }

  const result = await sendAppEmail({ to, subject, html, tag });
  return { email: result.email, message_id: result.message_id };
}

// ─── Email HTML templates ─────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function baseTemplate(content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WiseResume</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
  <div style="background:#9E1B22;padding:24px 32px;">
    <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">WiseResume</span>
  </div>
  <div style="padding:32px;">${content}</div>
  <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
    WiseResume · The Wise Cloud · thewise.cloud
  </div>
</div>
</body></html>`;
}

function confirmationEmailHtml(email, confirmUrl = 'https://thewise.cloud/confirm') {
  return baseTemplate(`
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Confirm your email address</h2>
    <p style="color:#374151;line-height:1.6;">Hi there,</p>
    <p style="color:#374151;line-height:1.6;">
      Please confirm your email address (${escapeHtml(email)}) by clicking the button below.
      If you did not request this email, you can ignore it.
    </p>
    <div style="margin:24px 0;">
      <a href="${escapeHtml(confirmUrl)}" style="display:inline-block;background:#9E1B22;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Confirm Email</a>
    </div>
    <p style="font-size:13px;color:#6b7280;">If the button doesn't work, copy this link: ${escapeHtml(confirmUrl)}</p>
  `);
}

function magicLinkEmailHtml(email) {
  return baseTemplate(`
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Sign in to WiseResume</h2>
    <p style="color:#374151;line-height:1.6;">Hi there,</p>
    <p style="color:#374151;line-height:1.6;">
      Click the button below to sign in to your account (${escapeHtml(email)}).
      This link expires in 1 hour.
    </p>
    <div style="margin:24px 0;">
      <a href="https://thewise.cloud/auth/magic" style="display:inline-block;background:#9E1B22;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Sign In</a>
    </div>
    <p style="font-size:13px;color:#6b7280;">This sign-in link was triggered by the admin panel.</p>
  `);
}

function generateSecureOtp() {
  const buf = crypto.randomBytes(4);
  return (buf.readUInt32BE(0) % 900000 + 100000).toString();
}

function otpEmailHtml() {
  const otp = generateSecureOtp();
  return baseTemplate(`
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Your verification code</h2>
    <p style="color:#374151;line-height:1.6;">Use the code below to verify your identity. It expires in 10 minutes.</p>
    <div style="margin:24px 0;text-align:center;">
      <span style="display:inline-block;font-size:36px;font-weight:700;letter-spacing:8px;color:#9E1B22;background:#fef2f2;padding:16px 32px;border-radius:12px;font-family:monospace;">${otp}</span>
    </div>
    <p style="font-size:13px;color:#6b7280;">If you didn't request this, please ignore this email.</p>
  `);
}

function welcomeEmailHtml(name = 'there') {
  return baseTemplate(`
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Welcome to WiseResume</h2>
    <p style="color:#374151;line-height:1.6;">Hi ${escapeHtml(name)},</p>
    <p style="color:#374151;line-height:1.6;">
      Your WiseResume account is active and ready to go. Build AI-powered resumes tailored for modern hiring — smarter, faster, and built to impress.
    </p>
    <div style="margin:24px 0;">
      <a href="https://wiseresume.app/dashboard" style="display:inline-block;background:#9E1B22;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Go to Dashboard</a>
    </div>
    <p style="font-size:13px;color:#6b7280;">This is a preview-only test render sent from the DevKit email studio.</p>
  `);
}

function passwordResetEmailHtml(email, resetUrl = 'https://wiseresume.app/auth/reset-password') {
  return baseTemplate(`
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Reset your password</h2>
    <p style="color:#374151;line-height:1.6;">Hi there,</p>
    <p style="color:#374151;line-height:1.6;">
      We received a request to reset the password for ${escapeHtml(email)}.
      Click the button below to choose a new password.
    </p>
    <div style="margin:24px 0;">
      <a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#9E1B22;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Reset Password</a>
    </div>
    <p style="font-size:13px;color:#6b7280;">This link expires in 1 hour. If you didn't request a reset, you can ignore this email.</p>
  `);
}

// ─── Main entry point ────────────────────────────────────────────────────────

module.exports = async ({ req, res, log, error }) => {
  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return res.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  if (!checkAuth(req, body)) {
    return res.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const mod    = body.module;
  const action = body.action;
  log(`admin-email: module=${mod} action=${action}`);

  const { databases } = getClients();

  try {
    // ── resend-stats module ───────────────────────────────────────────────
    if (mod === 'resend-stats') {
      switch (action) {
        case 'stats': {
          const data = await handleResendStats(body.days);
          return res.json({ success: true, ...data });
        }
        case 'lookup': {
          const data = await handleLookup(body.email);
          return res.json({ success: true, ...data });
        }
        case 'add': {
          const data = await handleAddContact(body.audienceKey, body.email);
          return res.json({ success: true, ...data });
        }
        case 'remove': {
          const data = await handleRemoveContact(body.audienceKey, body.email);
          return res.json({ success: true, ...data });
        }
        default:
          error(`admin-email: unknown resend-stats action=${action}`);
          return res.json({ success: false, error: `Unknown resend-stats action: ${action}` }, 400);
      }
    }

    // ── resend-sync module ────────────────────────────────────────────────
    if (mod === 'resend-sync') {
      const data = await handleSync(databases);
      return res.json({ success: true, ...data });
    }

    // ── email-actions module ──────────────────────────────────────────────
    if (mod === 'email-actions') {
      const data = await handleEmailAction(action, body);
      return res.json({ success: true, ...data });
    }

    error(`admin-email: unknown module=${mod}`);
    return res.json({ success: false, error: `Unknown module: ${mod}` }, 400);

  } catch (e) {
    error(`admin-email: unhandled error module=${mod} action=${action}: ${e}`);
    return res.json({ success: false, error: String(e) }, 500);
  }
};
