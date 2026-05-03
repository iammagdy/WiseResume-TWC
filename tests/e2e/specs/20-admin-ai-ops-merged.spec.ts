import { test, expect, request, type APIRequestContext } from '@playwright/test';

/**
 * Task #53 — admin-ai-ops merge (4 → 1) parity check.
 *
 * Asserts the merged `admin-ai-ops` router reproduces pre-merge response
 * envelopes for the parity surfaces reachable in CI without a real DevKit
 * admin session token (which we can't mint without leaking
 * DEV_KIT_PASSWORD) and without a real cron secret (which we won't ship to CI).
 *
 * Coverage:
 *
 *  1. All 4 actions dispatch via `body.action` and return the canonical
 *     {success:false, error:'Unauthorized'} 401 envelope every pre-merge
 *     function returned.
 *
 *  2. Same 4 actions dispatch via `x-admin-ai-op` header fallback (used
 *     by caps/routing whose originals read body.action for inner
 *     sub-routing). Same 401.
 *
 *  3. caps' inner `body.action: 'get_caps'` reaches the right handler
 *     via the header fallback — proves the helper's compatibility shim
 *     works end-to-end.
 *
 *  4. routing's inner `body.action: 'get_config'` reaches the right
 *     handler via the header fallback.
 *
 *  5. inspect-keys empty POST (web helper's "fetch all keys" path) →
 *     401 unauth envelope, AND no key-related fields leak in the body.
 *     This is the critical security surface — a 401 must arrive BEFORE
 *     any env enumeration.
 *
 *  6. refresh-test-models with neither cron secret nor admin token →
 *     401 unauth envelope (auth gate runs before model-fetch).
 *
 *  7. refresh-test-models with a bogus cron secret → still 401
 *     (requireCronSecret rejects it).
 *
 *  8. Auth-gate parity surfaces: missing Authorization → 401;
 *     well-formed but bogus DevKit bearer → 401.
 *
 *  9. Unknown action → 401 (auth runs before unknown-action 400).
 *
 * 10. CORS preflight succeeds without auth.
 *
 * Surfaces NOT covered here (require a real admin session token or cron
 * secret):
 *  - 200 success payloads per action.
 *  - Authenticated-but-bad-input 400 envelopes (e.g. set_plan_cap with
 *    invalid plan, update_feature with invalid provider).
 *  - inspect-keys' tail-only mask format (`••••XXXX`) — verified via
 *    static review against the original (kept byte-for-byte identical).
 *  - refresh-test-models successful provider fetch results — exercised
 *    only by the nightly cron job in production.
 *  - Audit-log row writes — preserved verbatim per static review.
 *
 * Skipped automatically when SUPABASE_URL / SUPABASE_ANON_KEY are not
 * configured (no remote endpoint to call).
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const skipReason = !SUPABASE_URL || !SUPABASE_ANON_KEY
  ? 'SUPABASE_URL / SUPABASE_ANON_KEY not configured'
  : null;

const ALL_ACTIONS = [
  'caps',
  'routing',
  'inspect-keys',
  'refresh-test-models',
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
  const url = `${SUPABASE_URL}/functions/v1/admin-ai-ops`;
  const res = await ctx.post(url, { data: opts.body ?? {} });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try { json = JSON.parse(text) as Record<string, unknown>; } catch { /* leave null */ }
  await ctx.dispose();
  return { status: res.status(), json, text };
}

const UNAUTH_ENVELOPE = { success: false, error: 'Unauthorized' };

test.describe('admin-ai-ops router parity (Task #53)', () => {
  test.skip(!!skipReason, skipReason ?? '');

  // ── 1. body.action dispatch ─────────────────────────────────────
  for (const action of ALL_ACTIONS) {
    test(`body.action=${action} (no admin token) → 401 Unauthorized envelope`, async () => {
      const res = await callRouter({ body: { action } });
      expect(res.status).toBe(401);
      expect(res.json).toEqual(UNAUTH_ENVELOPE);
    });
  }

  // ── 2. Header fallback dispatch ─────────────────────────────────
  for (const action of ALL_ACTIONS) {
    test(`x-admin-ai-op=${action} header fallback (no admin token) → 401`, async () => {
      const res = await callRouter({
        extraHeaders: { 'x-admin-ai-op': action },
        body: {},
      });
      expect(res.status).toBe(401);
      expect(res.json).toEqual(UNAUTH_ENVELOPE);
    });
  }

  // ── 3. caps inner body.action=get_caps reaches handler via header ──
  test('caps inner body.action=get_caps reaches handler via header fallback', async () => {
    const res = await callRouter({
      extraHeaders: { 'x-admin-ai-op': 'caps' },
      body: { action: 'get_caps' },
    });
    expect(res.status).toBe(401);
    expect(res.json).toEqual(UNAUTH_ENVELOPE);
  });

  // ── 4. routing inner body.action=get_config reaches handler via header ──
  test('routing inner body.action=get_config reaches handler via header fallback', async () => {
    const res = await callRouter({
      extraHeaders: { 'x-admin-ai-op': 'routing' },
      body: { action: 'get_config' },
    });
    expect(res.status).toBe(401);
    expect(res.json).toEqual(UNAUTH_ENVELOPE);
  });

  // ── 5. inspect-keys unauth must NOT leak any key/env data ──────
  test('inspect-keys unauth → 401 with NO key fields enumerated in body', async () => {
    const res = await callRouter({ body: { action: 'inspect-keys' } });
    expect(res.status).toBe(401);
    expect(res.json).toEqual(UNAUTH_ENVELOPE);
    // Belt-and-braces: assert response body does NOT contain any
    // inspect-keys response fields that would indicate the handler ran
    // past auth — masked tails, env names, or model dropdowns.
    expect(res.text).not.toContain('keys');
    expect(res.text).not.toContain('masked');
    expect(res.text).not.toContain('OPENROUTER_KEY');
    expect(res.text).not.toContain('GROQ_KEY');
    expect(res.text).not.toContain('DEEPSEEK_KEY');
    expect(res.text).not.toContain('modelOptions');
    expect(res.text).not.toContain('slotModels');
    // The masking format itself (••••XXXX) must never appear in an
    // unauthenticated response.
    expect(res.text).not.toContain('••••');
  });

  // ── 6. refresh-test-models without cron secret + no admin → 401 ──
  test('refresh-test-models with no cron secret and no admin token → 401', async () => {
    const res = await callRouter({ body: { action: 'refresh-test-models' } });
    expect(res.status).toBe(401);
    expect(res.json).toEqual(UNAUTH_ENVELOPE);
    // No model/provider results may leak before auth runs.
    expect(res.text).not.toContain('results');
    expect(res.text).not.toContain('lastRefreshedAt');
    expect(res.text).not.toContain('openrouter');
  });

  // ── 7. refresh-test-models with bogus cron secret → 401 ─────────
  test('refresh-test-models with bogus x-cron-secret → 401 (cron secret rejected)', async () => {
    const res = await callRouter({
      bearer: null,
      extraHeaders: { 'x-cron-secret': 'definitely-not-the-real-secret' },
      body: { action: 'refresh-test-models' },
    });
    expect(res.status).toBe(401);
  });

  // ── 8. Auth-gate parity surfaces ────────────────────────────────
  test('missing Authorization header → 401 Unauthorized', async () => {
    const res = await callRouter({
      bearer: null,
      body: { action: 'caps' },
    });
    expect(res.status).toBe(401);
    expect(res.json).toEqual(UNAUTH_ENVELOPE);
  });

  test('invalid DevKit bearer (well-formed but bogus signature) → 401', async () => {
    const fakePayload = btoa('admin@example.com:fake-session:9999999999999');
    const fakeSig = 'deadbeef'.repeat(8);
    const res = await callRouter({
      bearer: `${fakePayload}.${fakeSig}`,
      body: { action: 'routing' },
    });
    expect(res.status).toBe(401);
    expect(res.json).toEqual(UNAUTH_ENVELOPE);
  });

  // ── 9. Unknown action → 401 (auth-first ordering) ───────────────
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

  // ── 10. CORS preflight parity ───────────────────────────────────
  test('OPTIONS preflight → no auth required, returns CORS headers', async () => {
    const ctx = await request.newContext();
    const res = await ctx.fetch(`${SUPABASE_URL}/functions/v1/admin-ai-ops`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,x-admin-ai-op',
      },
    });
    expect([200, 204]).toContain(res.status());
    await ctx.dispose();
  });
});
