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
 * Optional audience variables (any subset may be set):
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

// ─── Auth ────────────────────────────────────────────────────────────────────

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function verifySignedToken(token) {
  const secret = process.env.DEVKIT_PASSWORD;
  if (!secret || !token || !token.includes('.')) return false;
  const [encoded, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  let payload;
  try { payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); } catch { return false; }
  return payload.purpose === 'devkit' && typeof payload.exp === 'number' && Date.now() < payload.exp;
}

function bearerToken(req, body) {
  const authHeader = body?.__headers?.Authorization || req.headers?.authorization || req.headers?.Authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
}

function checkAuth(req, body) {
  const token = bearerToken(req, body);
  const password = process.env.DEVKIT_PASSWORD;
  if (!password || !token) return false;
  if (token === password) return true;
  return verifySignedToken(token);
}

// ─── SDK client ──────────────────────────────────────────────────────────────

function getClients() {
  const client = new sdk.Client();
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192')
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

async function getAudienceContactCount(audienceId) {
  try {
    const res = await resendRequest('GET', `/audiences/${audienceId}/contacts`);
    const contacts = res.data || [];
    return contacts.length;
  } catch {
    return null;
  }
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
        const envKey  = `RESEND_AUDIENCE_${def.key}`;
        const id      = process.env[envKey] || null;
        const configured = !!id;
        const contactCount = configured ? await getAudienceContactCount(id) : null;

        let name;
        if (id) {
          try {
            const r = await resendRequest('GET', `/audiences/${id}`);
            name = r.name;
          } catch {
            name = undefined;
          }
        }

        return { key: def.key, label: def.label, configured, id, contactCount, name };
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
    audienceKey: `RESEND_AUDIENCE_${def.key}`,
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
      const id = process.env[`RESEND_AUDIENCE_${def.key}`];
      if (!id) return;
      try {
        const res = await resendRequest('GET', `/audiences/${id}/contacts`);
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
  const id = process.env[audienceKey];
  if (!id) throw new Error(`Audience variable ${audienceKey} is not configured`);
  if (!email) throw new Error('email is required');

  await resendRequest('POST', `/audiences/${id}/contacts`, { email });
  return { ok: true };
}

// ─── Module: resend-stats / action: remove ───────────────────────────────────

async function handleRemoveContact(audienceKey, email) {
  const id = process.env[audienceKey];
  if (!id) throw new Error(`Audience variable ${audienceKey} is not configured`);
  if (!email) throw new Error('email is required');

  // Resend delete-by-email endpoint
  await resendRequest('DELETE', `/audiences/${id}/contacts`, { email });
  return { ok: true };
}

// ─── Module: resend-sync ─────────────────────────────────────────────────────

async function handleSync(databases) {
  const audienceId = process.env.RESEND_AUDIENCE_ALL_USERS;
  if (!audienceId) {
    throw new Error('RESEND_AUDIENCE_ALL_USERS is not configured');
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

  // Upsert each profile into Resend audience
  await Promise.all(
    profiles.map(async (profile) => {
      const email = profile.email || profile.contact_email;
      if (!email) { failed++; return; }
      try {
        await resendRequest('POST', `/audiences/${audienceId}/contacts`, {
          email,
          first_name: (profile.full_name || '').split(' ')[0] || undefined,
          last_name:  (profile.full_name || '').split(' ').slice(1).join(' ') || undefined,
          unsubscribed: false,
        });
        added++;
      } catch {
        failed++;
      }
    }),
  );

  return { total: profiles.length, added, failed };
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

async function sendAppEmail({ to, subject, html, text, tag }) {
  const apiKey    = process.env.RESEND_API_KEY || '';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'hello@thewise.cloud';
  const fromName  = process.env.RESEND_FROM_NAME  || 'WiseResume';
  const from      = `${fromName} <${fromEmail}>`;
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

  const to = body.target_email;
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
      subject = 'Reset your WiseResume password';
      html    = passwordResetEmailHtml(to);
      tag     = 'reset-password';
      break;

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
  <div style="background:#6366f1;padding:24px 32px;">
    <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">WiseResume</span>
  </div>
  <div style="padding:32px;">${content}</div>
  <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
    This email was sent via the WiseResume admin panel. thewise.cloud
  </div>
</div>
</body></html>`;
}

function confirmationEmailHtml(email) {
  return baseTemplate(`
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Confirm your email address</h2>
    <p style="color:#374151;line-height:1.6;">Hi there,</p>
    <p style="color:#374151;line-height:1.6;">
      Please confirm your email address (${escapeHtml(email)}) by clicking the button below.
      This link was sent by the admin panel — please ignore it if you didn't request it.
    </p>
    <div style="margin:24px 0;">
      <a href="https://thewise.cloud/confirm" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Confirm Email</a>
    </div>
    <p style="font-size:13px;color:#6b7280;">If the button doesn't work, copy this link: https://thewise.cloud/confirm</p>
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
      <a href="https://thewise.cloud/auth/magic" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Sign In</a>
    </div>
    <p style="font-size:13px;color:#6b7280;">This sign-in link was triggered by the admin panel.</p>
  `);
}

function otpEmailHtml() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  return baseTemplate(`
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Your verification code</h2>
    <p style="color:#374151;line-height:1.6;">Use the code below to verify your identity. It expires in 10 minutes.</p>
    <div style="margin:24px 0;text-align:center;">
      <span style="display:inline-block;font-size:36px;font-weight:700;letter-spacing:8px;color:#6366f1;background:#f5f3ff;padding:16px 32px;border-radius:12px;font-family:monospace;">${otp}</span>
    </div>
    <p style="font-size:13px;color:#6b7280;">If you didn't request this, please ignore this email.</p>
  `);
}

function passwordResetEmailHtml(email) {
  return baseTemplate(`
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Reset your password</h2>
    <p style="color:#374151;line-height:1.6;">Hi there,</p>
    <p style="color:#374151;line-height:1.6;">
      We received a request to reset the password for ${escapeHtml(email)}.
      Click the button below to choose a new password.
    </p>
    <div style="margin:24px 0;">
      <a href="https://thewise.cloud/auth/reset" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Reset Password</a>
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
