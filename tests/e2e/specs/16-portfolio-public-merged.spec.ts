import { test, expect, request } from '@playwright/test';

/**
 * Task #49 — portfolio-public merge (4 → 1) parity check.
 *
 * Asserts the merged `portfolio-public` router reproduces the
 * pre-merge response shapes for the four consolidated actions, AND
 * that both supported dispatch mechanisms work:
 *
 *   - body.action  : the literal task contract (POST handlers)
 *   - ?action=     : query-string fallback (used by GET handlers, by
 *                    sendBeacon callers, and by the apiFnUrl helper)
 *
 * Cheapest-to-test parity surfaces (no real DB rows / users required):
 *   - meta               : GET ?action=meta (no username) → 400
 *                          { error: 'username required' }
 *   - interest           : POST { action: 'interest' } (no username)
 *                          → 400 { error: 'Missing username' }
 *   - track-view         : POST { action: 'track-view' } (no username)
 *                          → 400 { error: 'Missing username' }
 *   - resolve-short-link : GET ?action=resolve-short-link&id=x
 *                          → 400 { error: 'Missing or invalid id' }
 *
 * Auto-skips when SUPABASE_URL / SUPABASE_ANON_KEY are not configured.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const skipReason = !SUPABASE_URL || !SUPABASE_ANON_KEY
  ? 'SUPABASE_URL / SUPABASE_ANON_KEY not configured'
  : null;

const ROUTER_URL = `${SUPABASE_URL}/functions/v1/portfolio-public`;
const ALLOWED_ORIGIN = 'https://resume.thewise.cloud';

async function postBody(body: unknown, opts: { origin?: string } = {}) {
  const ctx = await request.newContext({
    extraHTTPHeaders: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Origin: opts.origin ?? ALLOWED_ORIGIN,
    },
  });
  const res = await ctx.post(ROUTER_URL, { data: body });
  const text = await res.text();
  let json: unknown = null;
  try { json = JSON.parse(text); } catch { /* leave null */ }
  const headers = res.headers();
  await ctx.dispose();
  return { status: res.status(), json, text, headers };
}

async function getQuery(query: Record<string, string>, opts: { origin?: string } = {}) {
  const ctx = await request.newContext({
    extraHTTPHeaders: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Origin: opts.origin ?? ALLOWED_ORIGIN,
    },
  });
  const url = `${ROUTER_URL}?${new URLSearchParams(query).toString()}`;
  const res = await ctx.get(url);
  const text = await res.text();
  let json: unknown = null;
  try { json = JSON.parse(text); } catch { /* leave null */ }
  const headers = res.headers();
  await ctx.dispose();
  return { status: res.status(), json, text, headers };
}

test.describe('portfolio-public router parity (Task #49)', () => {
  test.skip(!!skipReason, skipReason ?? '');

  // ── Body.action dispatch (literal task contract) ─────────────────────

  test('interest via body.action: missing username → 400 with original envelope', async () => {
    const r = await postBody({ action: 'interest' });
    expect(r.status).toBe(400);
    expect(r.json).toEqual({ error: 'Missing username' });
    // Original portfolio-interest used the standard origin-allow-list CORS.
    expect(r.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    expect(r.headers['content-type']).toMatch(/application\/json/);
  });

  test('track-view via body.action: missing username → 400 with original envelope', async () => {
    const r = await postBody({ action: 'track-view' });
    expect(r.status).toBe(400);
    expect(r.json).toEqual({ error: 'Missing username' });
    expect(r.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
  });

  // ── Query.action dispatch (sendBeacon / GET fallback) ────────────────

  test('meta via ?action=: missing username → 400 with original envelope', async () => {
    const r = await getQuery({ action: 'meta' });
    expect(r.status).toBe(400);
    expect(r.json).toEqual({ error: 'username required' });
    expect(r.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
  });

  test('resolve-short-link via ?action=: invalid id → 400 with original envelope', async () => {
    const r = await getQuery({ action: 'resolve-short-link', id: 'x' });
    expect(r.status).toBe(400);
    expect(r.json).toEqual({ error: 'Missing or invalid id' });
    // resolve-short-link deliberately serves wildcard CORS so any
    // origin can follow a /l/<slug> redirect — verify that survived.
    expect(r.headers['access-control-allow-origin']).toBe('*');
  });

  // ── Cross-dispatch fallback parity ───────────────────────────────────

  test('interest via ?action= query (no body.action) also dispatches', async () => {
    const ctx = await request.newContext({
      extraHTTPHeaders: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Origin: ALLOWED_ORIGIN,
      },
    });
    const res = await ctx.post(`${ROUTER_URL}?action=interest`, { data: {} });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing username' });
    await ctx.dispose();
  });

  test('track-view via ?action= query (sendBeacon-style, no body.action) also dispatches', async () => {
    const ctx = await request.newContext({
      extraHTTPHeaders: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Origin: ALLOWED_ORIGIN,
      },
    });
    const res = await ctx.post(`${ROUTER_URL}?action=track-view`, { data: {} });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing username' });
    await ctx.dispose();
  });

  // ── Malformed-JSON parity (handler surfaces its native envelope) ────

  test('interest with malformed JSON body but ?action= query → handler returns native Invalid JSON', async () => {
    const ctx = await request.newContext({
      extraHTTPHeaders: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Origin: ALLOWED_ORIGIN,
      },
    });
    const res = await ctx.post(`${ROUTER_URL}?action=interest`, { data: '{not-valid-json' });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid JSON' });
    await ctx.dispose();
  });

  test('track-view with malformed JSON body but ?action= query → handler returns native Invalid JSON', async () => {
    const ctx = await request.newContext({
      extraHTTPHeaders: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Origin: ALLOWED_ORIGIN,
      },
    });
    const res = await ctx.post(`${ROUTER_URL}?action=track-view`, { data: '{not-valid-json' });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid JSON' });
    await ctx.dispose();
  });

  // ── Router-level errors ──────────────────────────────────────────────

  test('unknown action → 400', async () => {
    const r = await postBody({ action: 'not-a-real-action' });
    expect(r.status).toBe(400);
    expect((r.json as { error?: string } | null)?.error).toContain('Unknown or missing action');
  });

  test('missing action (no body, no query) → 400', async () => {
    const ctx = await request.newContext({
      extraHTTPHeaders: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Origin: ALLOWED_ORIGIN,
      },
    });
    const res = await ctx.post(ROUTER_URL, { data: {} });
    expect(res.status()).toBe(400);
    await ctx.dispose();
  });
});
