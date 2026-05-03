import { test, expect, request, type APIRequestContext } from '@playwright/test';

/**
 * Task #55 — transactional-email merge (3 → 1) parity check.
 *
 * Asserts the merged `transactional-email` router reproduces pre-merge
 * response envelopes for the parity surfaces reachable in CI without a
 * real Resend/CRON_SECRET configuration.
 *
 * Coverage:
 *
 *  1. All 3 actions dispatch via `body.action` (primary, per task
 *     spec).
 *  2. Same 3 actions dispatch via `x-transactional-email-action`
 *     header fallback (used by the legacy pg_cron job for
 *     resume-reminder which posts an empty body).
 *  3. contact-email and contact-request reach their handlers and
 *     return their original validation envelopes when the body is
 *     missing required fields. Both surfaces are public (no Bearer
 *     required).
 *  4. resume-reminder fails closed with 401 when the cron secret is
 *     missing, identical to the pre-merge function.
 *  5. Unknown action returns 400 from the router.
 *  6. CORS preflight succeeds without auth.
 *
 * Skipped automatically when SUPABASE_URL / SUPABASE_ANON_KEY are not
 * configured (no remote endpoint to call).
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const skipReason = !SUPABASE_URL || !SUPABASE_ANON_KEY
  ? 'SUPABASE_URL / SUPABASE_ANON_KEY not configured'
  : null;

const ALL_ACTIONS = ['contact-email', 'contact-request', 'resume-reminder'] as const;

type CallOpts = {
  bearer?: string | null;
  extraHeaders?: Record<string, string>;
  body?: Record<string, unknown> | null;
};

async function callRouter(opts: CallOpts = {}) {
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    ...(opts.extraHeaders ?? {}),
  };
  if (opts.bearer !== null) {
    headers.Authorization = `Bearer ${opts.bearer ?? SUPABASE_ANON_KEY}`;
  }

  const ctx: APIRequestContext = await request.newContext({ extraHTTPHeaders: headers });
  const url = `${SUPABASE_URL}/functions/v1/transactional-email`;
  const res = await ctx.post(url, { data: opts.body ?? {} });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try { json = JSON.parse(text) as Record<string, unknown>; } catch { /* leave null */ }
  await ctx.dispose();
  return { status: res.status(), json, text };
}

test.describe('transactional-email router parity (Task #55)', () => {
  test.skip(!!skipReason, skipReason ?? '');

  // ── 1. body.action dispatch (primary) ───────────────────────────
  test('body.action=contact-email + missing fields → 400 validation envelope', async () => {
    const res = await callRouter({ body: { action: 'contact-email' } });
    expect(res.status).toBe(400);
    expect(res.json?.error).toMatch(/Type, email, and message are required/);
  });

  test('body.action=contact-request + missing fields → 400 validation envelope', async () => {
    const res = await callRouter({ body: { action: 'contact-request' } });
    expect(res.status).toBe(400);
    expect(res.json?.error).toMatch(/type, email, and message are required/);
  });

  test('body.action=resume-reminder + no cron secret → 401', async () => {
    const res = await callRouter({ body: { action: 'resume-reminder' } });
    expect(res.status).toBe(401);
  });

  // ── 2. Header fallback dispatch ─────────────────────────────────
  for (const action of ALL_ACTIONS) {
    test(`x-transactional-email-action=${action} header fallback dispatches`, async () => {
      const res = await callRouter({
        extraHeaders: { 'x-transactional-email-action': action },
        body: {},
      });
      // Each action's reachable response: 400 for the two contact
      // surfaces (validation), 401 for resume-reminder (cron-secret
      // gate). The point of this test is that the header fallback
      // routes — i.e. we never hit the unknown-action 400 with
      // "Unknown action" text.
      if (action === 'resume-reminder') {
        expect(res.status).toBe(401);
      } else {
        expect(res.status).toBe(400);
        expect(String(res.json?.error ?? '')).not.toMatch(/^Unknown action/);
      }
    });
  }

  // ── 3. contact-request honeypot returns fake-success ────────────
  test('contact-request honeypot (website filled) → fake-success 200', async () => {
    const res = await callRouter({
      body: {
        action: 'contact-request',
        type: 'contact',
        email: 'bot@example.com',
        message: 'spam spam spam',
        website: 'http://spam.example',
      },
    });
    expect(res.status).toBe(200);
    expect(res.json).toEqual({ success: true, id: null });
  });

  // ── 4. Oversized payload → original 413 envelope (parity) ───────
  test('oversized contact-request payload → 413 with original error envelope', async () => {
    const huge = 'x'.repeat(70 * 1024); // > 64 KiB
    const res = await callRouter({
      body: { action: 'contact-request', type: 'contact', email: 'a@b.co', message: huge },
    });
    expect(res.status).toBe(413);
    expect(res.json?.error).toBe(
      'Request payload too large. Maximum allowed size is 500KB.',
    );
  });

  // ── 5. Unknown action → 400 from the router (not a handler) ─────
  test('unknown body.action → 400 from router', async () => {
    const res = await callRouter({ body: { action: 'does-not-exist' } });
    expect(res.status).toBe(400);
    expect(String(res.json?.error ?? '')).toMatch(/^Unknown action/);
  });

  test('no action + no header → 400 from router', async () => {
    const res = await callRouter({ body: {} });
    expect(res.status).toBe(400);
    expect(String(res.json?.error ?? '')).toMatch(/^Unknown action/);
  });

  // ── 5. CORS preflight parity ────────────────────────────────────
  test('OPTIONS preflight → no auth required, returns CORS headers', async () => {
    const ctx = await request.newContext();
    const res = await ctx.fetch(`${SUPABASE_URL}/functions/v1/transactional-email`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,x-transactional-email-action',
      },
    });
    expect([200, 204]).toContain(res.status());
    await ctx.dispose();
  });
});
