import { test, expect, request } from '@playwright/test';

/**
 * Task #50 — wisehire-access merge (5 → 1) parity check.
 *
 * Asserts the merged `wisehire-access` router reproduces pre-merge
 * response envelopes for the cheapest parity surfaces of all 5 actions
 * (the validation / error branches that don't require provisioning a
 * real waitlist row, real invite token, real coupon, or real Supabase
 * session in CI).
 *
 * Skipped automatically when SUPABASE_URL / SUPABASE_ANON_KEY are not
 * configured (no remote endpoint to call).
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const skipReason = !SUPABASE_URL || !SUPABASE_ANON_KEY
  ? 'SUPABASE_URL / SUPABASE_ANON_KEY not configured'
  : null;

async function callRouter(action: string, body: Record<string, unknown>, opts: { auth?: string } = {}) {
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${opts.auth ?? SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
  const ctx = await request.newContext({ extraHTTPHeaders: headers });
  const res = await ctx.post(`${SUPABASE_URL}/functions/v1/wisehire-access`, {
    data: { action, ...body },
  });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try { json = JSON.parse(text) as Record<string, unknown>; } catch { /* leave null */ }
  await ctx.dispose();
  return { status: res.status(), json, text };
}

test.describe('wisehire-access router parity (Task #50)', () => {
  test.skip(!!skipReason, skipReason ?? '');

  test('waitlist-check-email: malformed email → 200 with valid_format=false envelope', async () => {
    const res = await callRouter('waitlist-check-email', { email: 'not-an-email' });
    expect(res.status).toBe(200);
    expect(res.json).toEqual({
      valid_format: false,
      is_consumer_domain: false,
      existing_wiseresume_user: false,
      already_on_waitlist: false,
    });
  });

  test('waitlist-join: missing fields → 400 with field-list error', async () => {
    const res = await callRouter('waitlist-join', { email: 'x@x.com' });
    expect(res.status).toBe(400);
    expect(res.json).toEqual({
      error: 'All fields are required: name, email, company_name, company_size',
    });
  });

  test('validate-early-access: empty code → 400 with required-error envelope', async () => {
    const res = await callRouter('validate-early-access', { code: '' });
    expect(res.status).toBe(400);
    expect(res.json).toEqual({ valid: false, error: 'Early access code is required' });
  });

  test('validate-invite: missing token → 400 with missing_token reason', async () => {
    const res = await callRouter('validate-invite', { token: '' });
    expect(res.status).toBe(400);
    expect(res.json).toEqual({ valid: false, reason: 'missing_token' });
  });

  test('complete-signup: no bearer token → 401 unauthorized envelope', async () => {
    // Supabase edge functions reject calls with no Authorization at all
    // before our handler runs, so we send the anon key to ensure the
    // request reaches the router; the router then sees the anon key as
    // its bearer and the supabase.auth.getUser() check fails → 401.
    const res = await callRouter('complete-signup', { invite_token: 'x' });
    expect(res.status).toBe(401);
    expect(res.json).toEqual({ success: false, error: 'unauthorized' });
  });

  test('unknown action → 400 with descriptive error', async () => {
    const res = await callRouter('does-not-exist', {});
    expect(res.status).toBe(400);
    expect(res.json?.error).toContain('Unknown action');
  });
});
