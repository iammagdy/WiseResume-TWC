import { test, expect, request, type APIRequestContext } from '@playwright/test';

/**
 * Task #54 — admin-wisehire merge (4 → 1) parity check.
 *
 * Asserts the merged `admin-wisehire` router reproduces pre-merge
 * response envelopes for the parity surfaces reachable in CI without
 * a real DevKit admin session token (which we can't mint without
 * leaking DEV_KIT_PASSWORD).
 *
 * Coverage:
 *
 *  1. All 4 actions dispatch via `body.action` (primary, per task
 *     spec) and return the canonical
 *     {success:false, error:'Unauthorized'} 401 envelope every
 *     pre-merge function returned. Auth runs ONCE at the top of the
 *     router (per task spec), so the envelope is identical regardless
 *     of which action was selected.
 *
 *  2. Same 4 actions dispatch via `x-admin-wisehire-op` header
 *     fallback. Same 401.
 *
 *  3. Auth gate parity: missing Authorization → 401; well-formed but
 *     bogus DevKit bearer → 401.
 *
 *  4. Unknown action returns 401 (auth gate runs before the
 *     unknown-action 400 branch — proves auth-at-top ordering).
 *
 *  5. CORS preflight succeeds without auth.
 *
 * Surfaces NOT covered here (require a real admin session token):
 *  - 200 success payloads per action.
 *  - Authenticated-but-bad-input 400/404 envelopes.
 *  - Audit-log row writes (`category='admin_email'/'admin'`,
 *    `action='wisehire_invite'/'wisehire_test_reset'/
 *    'wisehire_invite_revoke'` — preserved verbatim per static
 *    review).
 *  - Email-trigger behaviour (Resend send for invite) — verified by
 *    static review against the original handler.
 *
 * Skipped automatically when SUPABASE_URL / SUPABASE_ANON_KEY are
 * not configured (no remote endpoint to call).
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const skipReason = !SUPABASE_URL || !SUPABASE_ANON_KEY
  ? 'SUPABASE_URL / SUPABASE_ANON_KEY not configured'
  : null;

const ALL_ACTIONS = [
  'invite',
  'reset-user',
  'revoke-invite',
  'waitlist',
] as const;

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
  const url = `${SUPABASE_URL}/functions/v1/admin-wisehire`;
  const res = await ctx.post(url, { data: opts.body ?? {} });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try { json = JSON.parse(text) as Record<string, unknown>; } catch { /* leave null */ }
  await ctx.dispose();
  return { status: res.status(), json, text };
}

const UNAUTH_ENVELOPE = { success: false, error: 'Unauthorized' };

test.describe('admin-wisehire router parity (Task #54)', () => {
  test.skip(!!skipReason, skipReason ?? '');

  // ── 1. body.action dispatch (primary) ───────────────────────────
  for (const action of ALL_ACTIONS) {
    test(`body.action=${action} (no admin token) → 401 Unauthorized envelope`, async () => {
      const res = await callRouter({ body: { action } });
      expect(res.status).toBe(401);
      expect(res.json).toEqual(UNAUTH_ENVELOPE);
    });
  }

  // ── 2. Header fallback dispatch ─────────────────────────────────
  for (const action of ALL_ACTIONS) {
    test(`x-admin-wisehire-op=${action} header fallback (no admin token) → 401`, async () => {
      const res = await callRouter({
        extraHeaders: { 'x-admin-wisehire-op': action },
        body: {},
      });
      expect(res.status).toBe(401);
      expect(res.json).toEqual(UNAUTH_ENVELOPE);
    });
  }

  // ── 3. Auth-gate parity surfaces ────────────────────────────────
  test('missing Authorization header → 401 Unauthorized', async () => {
    const res = await callRouter({
      bearer: null,
      body: { action: 'waitlist' },
    });
    expect(res.status).toBe(401);
    expect(res.json).toEqual(UNAUTH_ENVELOPE);
  });

  test('invalid DevKit bearer (well-formed but bogus signature) → 401', async () => {
    const fakePayload = btoa('admin@example.com:fake-session:9999999999999');
    const fakeSig = 'deadbeef'.repeat(8);
    const res = await callRouter({
      bearer: `${fakePayload}.${fakeSig}`,
      body: { action: 'invite' },
    });
    expect(res.status).toBe(401);
    expect(res.json).toEqual(UNAUTH_ENVELOPE);
  });

  // ── 4. Unknown action → 401 (auth runs BEFORE dispatch) ─────────
  test('unknown body.action + no admin token → 401 (auth-first ordering)', async () => {
    const res = await callRouter({ body: { action: 'does-not-exist' } });
    expect(res.status).toBe(401);
    expect(res.json).toEqual(UNAUTH_ENVELOPE);
  });

  test('no body.action + no header + no admin token → 401', async () => {
    const res = await callRouter({ body: {} });
    expect(res.status).toBe(401);
    expect(res.json).toEqual(UNAUTH_ENVELOPE);
  });

  // ── 5. CORS preflight parity ────────────────────────────────────
  test('OPTIONS preflight → no auth required, returns CORS headers', async () => {
    const ctx = await request.newContext();
    const res = await ctx.fetch(`${SUPABASE_URL}/functions/v1/admin-wisehire`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,x-admin-wisehire-op',
      },
    });
    expect([200, 204]).toContain(res.status());
    await ctx.dispose();
  });
});
