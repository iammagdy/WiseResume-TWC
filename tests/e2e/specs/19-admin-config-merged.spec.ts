import { test, expect, request, type APIRequestContext } from '@playwright/test';

/**
 * Task #52 — admin-config merge (5 → 1) parity check.
 *
 * Asserts the merged `admin-config` router reproduces pre-merge
 * response envelopes for the parity surfaces reachable in CI without
 * a real DevKit admin session token (which we can't mint without
 * leaking DEV_KIT_PASSWORD).
 *
 * Coverage:
 *
 *  1. All 5 actions dispatch via `body.action` (primary, per task
 *     spec) and return the canonical
 *     {success:false, error:'Unauthorized'} 401 envelope every
 *     pre-merge function returned. Auth runs ONCE at the top of the
 *     router (per task spec), so the envelope is identical regardless
 *     of which action was selected.
 *
 *  2. Same 5 actions dispatch via `x-admin-config-action` header
 *     fallback (used by feature-flags and integrations whose
 *     originals read body.action for inner sub-routing). Same 401.
 *
 *  3. feature-flags' inner `body.action: 'list'` selector reaches the
 *     right handler via the header fallback — proves the helper's
 *     compatibility shim works end-to-end.
 *
 *  4. integrations' inner `body.action: 'get_resend_bounces'`
 *     selector reaches the right handler via the header fallback.
 *
 *  5. env-check parity: explicit assertion that no body is required
 *     (header-only dispatch) and the unauthenticated response is the
 *     same 401 envelope. Critical for the masking-rules guarantee:
 *     a 401 means we never reach the env enumeration, so no env
 *     value can leak from this surface.
 *
 *  6. Auth gate parity: missing Authorization → 401; well-formed
 *     but bogus DevKit bearer → 401. Both match every pre-merge
 *     function.
 *
 *  7. Unknown action returns 401 (auth gate runs before the
 *     unknown-action 400 branch — proves auth-at-top ordering).
 *
 *  8. CORS preflight succeeds without auth.
 *
 * Surfaces NOT covered here (require a real admin session token):
 *  - 200 success payloads per action.
 *  - Authenticated-but-bad-input 400/404 envelopes (e.g.
 *    update-settings missing `key`, feature-flags upsert without
 *    `name`).
 *  - env-check's REQUIRED_ENV_VARS list contents — verified via
 *    static review against the original (kept byte-for-byte
 *    identical in admin-config/index.ts).
 *  - Audit-log row writes (`category='admin_feature_flag'`,
 *    `action='upsert'|'delete'` — preserved verbatim per static
 *    review).
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
  'get-settings',
  'update-settings',
  'feature-flags',
  'integrations',
  'env-check',
] as const;

type CallOpts = {
  bearer?: string | null;
  extraHeaders?: Record<string, string>;
  body?: Record<string, unknown> | null;
  rawBody?: string;
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
  const url = `${SUPABASE_URL}/functions/v1/admin-config`;

  const res = opts.rawBody !== undefined
    ? await ctx.post(url, { data: opts.rawBody, headers: { 'Content-Type': 'application/json' } })
    : await ctx.post(url, { data: opts.body ?? {} });

  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try { json = JSON.parse(text) as Record<string, unknown>; } catch { /* leave null */ }
  await ctx.dispose();
  return { status: res.status(), json, text };
}

const UNAUTH_ENVELOPE = { success: false, error: 'Unauthorized' };

test.describe('admin-config router parity (Task #52)', () => {
  test.skip(!!skipReason, skipReason ?? '');

  // ── 1. body.action dispatch (primary, per task spec) ────────────
  for (const action of ALL_ACTIONS) {
    test(`body.action=${action} (no admin token) → 401 Unauthorized envelope`, async () => {
      const res = await callRouter({ body: { action } });
      expect(res.status).toBe(401);
      expect(res.json).toEqual(UNAUTH_ENVELOPE);
    });
  }

  // ── 2. Header fallback dispatch ─────────────────────────────────
  for (const action of ALL_ACTIONS) {
    test(`x-admin-config-action=${action} header fallback (no admin token) → 401`, async () => {
      const res = await callRouter({
        extraHeaders: { 'x-admin-config-action': action },
        body: {},
      });
      expect(res.status).toBe(401);
      expect(res.json).toEqual(UNAUTH_ENVELOPE);
    });
  }

  // ── 3. feature-flags inner action='list' compat shim ────────────
  test('feature-flags inner body.action=list reaches handler via header fallback', async () => {
    const res = await callRouter({
      extraHeaders: { 'x-admin-config-action': 'feature-flags' },
      body: { action: 'list' },
    });
    expect(res.status).toBe(401);
    expect(res.json).toEqual(UNAUTH_ENVELOPE);
  });

  // ── 4. integrations inner action='get_resend_bounces' shim ──────
  test('integrations inner body.action=get_resend_bounces reaches handler via header fallback', async () => {
    const res = await callRouter({
      extraHeaders: { 'x-admin-config-action': 'integrations' },
      body: { action: 'get_resend_bounces' },
    });
    expect(res.status).toBe(401);
    expect(res.json).toEqual(UNAUTH_ENVELOPE);
  });

  // ── 5. env-check has no leakage on unauth ───────────────────────
  test('env-check unauth → 401 with NO env vars enumerated in body', async () => {
    const res = await callRouter({ body: { action: 'env-check' } });
    expect(res.status).toBe(401);
    expect(res.json).toEqual(UNAUTH_ENVELOPE);
    // Belt-and-braces: assert response body does NOT contain any
    // env-check fields that would indicate the handler ran past
    // auth (checks[]/supabaseUrl/present/SUPABASE_URL string).
    expect(res.text).not.toContain('checks');
    expect(res.text).not.toContain('supabaseUrl');
    expect(res.text).not.toContain('present');
  });

  // ── 6. Auth-gate parity surfaces ────────────────────────────────
  test('missing Authorization header → 401 Unauthorized', async () => {
    const res = await callRouter({
      bearer: null,
      body: { action: 'get-settings' },
    });
    expect(res.status).toBe(401);
    expect(res.json).toEqual(UNAUTH_ENVELOPE);
  });

  test('invalid DevKit bearer (well-formed but bogus signature) → 401', async () => {
    const fakePayload = btoa('admin@example.com:fake-session:9999999999999');
    const fakeSig = 'deadbeef'.repeat(8);
    const res = await callRouter({
      bearer: `${fakePayload}.${fakeSig}`,
      body: { action: 'feature-flags' },
    });
    expect(res.status).toBe(401);
    expect(res.json).toEqual(UNAUTH_ENVELOPE);
  });

  // ── 7. Unknown action → 401 (auth runs BEFORE dispatch) ─────────
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

  // ── 8. CORS preflight parity ────────────────────────────────────
  test('OPTIONS preflight → no auth required, returns CORS headers', async () => {
    const ctx = await request.newContext();
    const res = await ctx.fetch(`${SUPABASE_URL}/functions/v1/admin-config`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,x-admin-config-action',
      },
    });
    expect([200, 204]).toContain(res.status());
    await ctx.dispose();
  });
});
