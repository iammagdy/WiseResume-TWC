/**
 * admin-testmail — Appwrite Function
 *
 * Modules:
 *   testmail-inbox      — fetch emails from Testmail.app inbox (optional tag filter)
 *   testmail-send-test  — send a sample welcome email via sendAppEmail
 *
 * Auth: Authorization: Bearer <DEVKIT_PASSWORD>
 * Runtime: Node.js 18
 *
 * Required Function Variables:
 *   DEVKIT_PASSWORD      — shared secret matching the frontend DevKit token
 *   TESTMAIL_NAMESPACE   — Testmail namespace, e.g. ajku9
 *   TESTMAIL_API_KEY     — Testmail API key
 *   RESEND_API_KEY       — Resend API key (re:_xxx)
 *   RESEND_FROM_EMAIL    — sender address, e.g. hello@thewise.cloud
 *   RESEND_FROM_NAME     — sender display name, e.g. WiseResume
 *
 * Optional:
 *   EMAIL_TEST_MODE      — when "true", sendAppEmail redirects to Testmail instead of real recipient
 */

'use strict';

// ─── Auth ───────────────────────────────────────────────────────────────────

function checkAuth(req) {
  const expected = process.env.DEVKIT_PASSWORD;
  if (!expected) return false;
  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) return false;
  return authHeader.slice(7) === expected;
}

// ─── sendAppEmail helper ─────────────────────────────────────────────────────

/**
 * Send a transactional email via Resend.
 * When EMAIL_TEST_MODE=true, redirects `to` → `{namespace}.{tag}@inbox.testmail.app`
 * so the email lands in the Testmail catch-all instead of the real inbox.
 *
 * @param {{ to: string, subject: string, html: string, text?: string, tag: string }} opts
 * @returns {{ sentTo: string, originalTo: string, testMode: boolean, tag: string, messageId: string|null }}
 */
async function sendAppEmail({ to, subject, html, text, tag }) {
  const apiKey     = process.env.RESEND_API_KEY || '';
  const fromEmail  = process.env.RESEND_FROM_EMAIL || 'hello@thewise.cloud';
  const fromName   = process.env.RESEND_FROM_NAME  || 'WiseResume';
  const from       = `${fromName} <${fromEmail}>`;
  const namespace  = process.env.TESTMAIL_NAMESPACE || 'ajku9';
  const testMode   = process.env.EMAIL_TEST_MODE === 'true';

  const sentTo = testMode
    ? `${namespace}.${tag}@inbox.testmail.app`
    : to;

  const payload = { from, to: sentTo, subject, html };
  if (text) payload.text = text;

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  let json;
  try { json = JSON.parse(raw); } catch { json = { raw }; }

  if (!res.ok) {
    const msg = json?.message || json?.error || `Resend HTTP ${res.status}`;
    throw new Error(msg);
  }

  return {
    sentTo,
    originalTo: to,
    testMode,
    tag,
    messageId: json.id || null,
  };
}

// ─── Module: testmail-inbox ──────────────────────────────────────────────────

async function handleTestmailInbox(tag) {
  const namespace = process.env.TESTMAIL_NAMESPACE || 'ajku9';
  const apiKey    = process.env.TESTMAIL_API_KEY   || '';

  if (!apiKey) {
    throw new Error('TESTMAIL_API_KEY is not configured in Appwrite Function Variables');
  }

  let url = `https://api.testmail.app/api/json?namespace=${encodeURIComponent(namespace)}&limit=50`;
  if (tag && tag !== 'all') {
    url += `&tag=${encodeURIComponent(tag)}`;
  }

  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });

  const raw = await res.text();
  let json;
  try { json = JSON.parse(raw); } catch { json = { raw }; }

  if (!res.ok) {
    throw new Error(json?.message || `Testmail API HTTP ${res.status}`);
  }

  /**
   * Coerce a Testmail address field (may be string, {address, name}, or array of either)
   * to a guaranteed display string.
   */
  function coerceAddress(raw) {
    if (!raw) return '';
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) {
      return raw.map(coerceAddress).filter(Boolean).join(', ');
    }
    if (typeof raw === 'object') {
      const name = raw.name || '';
      const addr = raw.address || raw.email || '';
      return name && addr ? `${name} <${addr}>` : (addr || name || JSON.stringify(raw));
    }
    return String(raw);
  }

  const emails = (json.emails || []).map(e => ({
    id:         e.id    || e.envelope_from || `${Date.now()}-${Math.random()}`,
    subject:    typeof e.subject === 'string' ? e.subject : '(no subject)',
    from:       coerceAddress(e.from),
    to:         coerceAddress(e.to),
    receivedAt: (() => { try { if (!e.timestamp) return null; const d = new Date(e.timestamp); return isNaN(d.getTime()) ? null : d.toISOString(); } catch { return null; } })(),
    tag:        typeof e.tag === 'string' ? e.tag : null,
    html:       typeof e.html === 'string' ? e.html : null,
    text:       typeof e.text === 'string' ? e.text : null,
  }));

  return {
    emails,
    total:     json.count    ?? emails.length,
    namespace,
    testMode:  process.env.EMAIL_TEST_MODE === 'true',
  };
}

// ─── Module: testmail-send-test ──────────────────────────────────────────────

async function handleTestmailSendTest() {
  const result = await sendAppEmail({
    to:      'dev@thewise.cloud',
    subject: 'WiseResume — Test Email from DevKit',
    tag:     'welcome',
    html:    `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:32px;background:#f9fafb;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
  <div style="background:#6366f1;padding:20px 28px;">
    <span style="color:#fff;font-size:18px;font-weight:700;">WiseResume</span>
  </div>
  <div style="padding:28px;">
    <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Test Email from DevKit</h2>
    <p style="color:#374151;line-height:1.6;margin:0 0 16px;">
      This is a test email sent from the Testmail DevKit panel to confirm email routing is working.
    </p>
    <p style="color:#6b7280;font-size:13px;margin:0;">
      Sent via DevKit → admin-testmail → sendAppEmail (tag: <code>welcome</code>)
    </p>
  </div>
</div>
</body></html>`,
    text: 'This is a test email sent from the Testmail DevKit panel.',
  });

  return result;
}

// ─── Main entry point ────────────────────────────────────────────────────────

module.exports = async ({ req, res, log, error }) => {
  if (!checkAuth(req)) {
    return res.json({ success: false, error: 'Unauthorized' }, 401);
  }

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return res.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const mod = body.module;
  log(`admin-testmail: module=${mod}`);

  try {
    // ── testmail-inbox ────────────────────────────────────────────────────
    if (mod === 'testmail-inbox') {
      const data = await handleTestmailInbox(body.tag || null);
      return res.json({ success: true, ...data });
    }

    // ── testmail-send-test ────────────────────────────────────────────────
    if (mod === 'testmail-send-test') {
      const data = await handleTestmailSendTest();
      return res.json({ success: true, ...data });
    }

    error(`admin-testmail: unknown module=${mod}`);
    return res.json({ success: false, error: `Unknown module: ${mod}` }, 400);

  } catch (e) {
    error(`admin-testmail: unhandled error module=${mod}: ${e}`);
    return res.json({ success: false, error: String(e) }, 500);
  }
};
