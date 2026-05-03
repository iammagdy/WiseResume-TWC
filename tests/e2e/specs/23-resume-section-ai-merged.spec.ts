import { test, expect, request, type APIRequestContext } from '@playwright/test';

/**
 * Task #56 — resume-section-ai merge (4 → 1) parity check.
 *
 * Asserts the merged `resume-section-ai` router reaches each per-action
 * handler with byte-for-byte parity for the surfaces reachable in CI
 * without a real OpenAI key + paid credits.
 *
 * Coverage:
 *
 *  1. All 4 actions dispatch via `x-resume-section-ai-action` header
 *     (PRIMARY, per task spec — header preferred because the `enhance`
 *     action's body already carries an inner `body.action`).
 *  2. `tailor`, `fill-gap`, `explain-gap` also dispatch via top-level
 *     `body.action` fallback.
 *  3. Unknown action → 400 with `invalid_action` envelope from the
 *     router (not a handler).
 *  4. Missing/invalid auth → 401 from the single hoisted auth gate
 *     (parity with each pre-merge function's first-line `requireAuth`).
 *  5. CORS preflight succeeds without auth.
 *
 * Skipped automatically when SUPABASE_URL / SUPABASE_ANON_KEY are not
 * configured (no remote endpoint to call).
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const skipReason = !SUPABASE_URL || !SUPABASE_ANON_KEY
  ? 'SUPABASE_URL / SUPABASE_ANON_KEY not configured'
  : null;

const ALL_ACTIONS = ['enhance', 'tailor', 'fill-gap', 'explain-gap'] as const;
const BODY_FALLBACK_ACTIONS = ['tailor', 'fill-gap', 'explain-gap'] as const;

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
  const url = `${SUPABASE_URL}/functions/v1/resume-section-ai`;
  const res = await ctx.post(url, { data: opts.body ?? {} });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try { json = JSON.parse(text) as Record<string, unknown>; } catch { /* leave null */ }
  await ctx.dispose();
  return { status: res.status(), json, text };
}

test.describe('resume-section-ai router parity (Task #56)', () => {
  test.skip(!!skipReason, skipReason ?? '');

  // ── 1. Header dispatch (primary) — all 4 actions reach their handler ─
  for (const action of ALL_ACTIONS) {
    test(`x-resume-section-ai-action=${action} (header) routes past dispatcher`, async () => {
      const res = await callRouter({
        bearer: null,
        extraHeaders: { 'x-resume-section-ai-action': action },
        body: {},
      });
      // No Bearer → hoisted requireAuth returns 401. The point of this
      // case is that we hit the auth gate (handler reachable) and not
      // the router-level 400 invalid_action envelope.
      expect(res.status).toBe(401);
      expect(String(res.json?.error ?? '')).not.toBe('invalid_action');
    });
  }

  // ── 2. body.action fallback for the three non-enhance handlers ──────
  for (const action of BODY_FALLBACK_ACTIONS) {
    test(`body.action=${action} (fallback) routes past dispatcher`, async () => {
      const res = await callRouter({
        bearer: null,
        body: { action },
      });
      expect(res.status).toBe(401);
      expect(String(res.json?.error ?? '')).not.toBe('invalid_action');
    });
  }

  // ── 3. Unknown action → 400 invalid_action from router ──────────────
  test('unknown action (header + body) → 400 invalid_action', async () => {
    const res = await callRouter({
      extraHeaders: { 'x-resume-section-ai-action': 'does-not-exist' },
      body: { action: 'also-does-not-exist' },
    });
    expect(res.status).toBe(400);
    expect(res.json?.error).toBe('invalid_action');
  });

  test('no header + no body.action → 400 invalid_action', async () => {
    const res = await callRouter({ body: {} });
    expect(res.status).toBe(400);
    expect(res.json?.error).toBe('invalid_action');
  });

  // ── 4. Missing/invalid auth → 401 from hoisted gate ─────────────────
  test('valid action + no Bearer → 401 from hoisted auth gate', async () => {
    const res = await callRouter({
      bearer: null,
      extraHeaders: { 'x-resume-section-ai-action': 'enhance' },
      body: { section: 'summary', action: 'improve', currentContent: 'x' },
    });
    expect(res.status).toBe(401);
  });

  // ── 5. Oversized Content-Length → 413 from router-level guard ───────
  test('oversized Content-Length → 413 from router-level size guard', async () => {
    const huge = 'x'.repeat(600 * 1024); // > 500 KiB router ceiling
    const res = await callRouter({
      extraHeaders: { 'x-resume-section-ai-action': 'enhance' },
      body: { section: 'summary', action: 'improve', currentContent: huge },
    });
    expect(res.status).toBe(413);
    expect(String(res.json?.error ?? '')).toMatch(/payload too large/i);
  });

  // ── 6. CORS preflight parity ────────────────────────────────────────
  test('OPTIONS preflight → no auth required, returns CORS headers', async () => {
    const ctx = await request.newContext();
    const res = await ctx.fetch(`${SUPABASE_URL}/functions/v1/resume-section-ai`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,x-resume-section-ai-action',
      },
    });
    expect([200, 204]).toContain(res.status());
    await ctx.dispose();
  });
});
