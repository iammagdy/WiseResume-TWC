import { test, expect, request } from '@playwright/test';
import baseline from '../fixtures/coupons-baseline.json' assert { type: 'json' };

/**
 * Task #48 — coupons merge (3 → 1) parity check.
 *
 * Asserts the merged `coupons` router reproduces the baseline response
 * envelopes captured from the pre-merge originals (see
 * tests/e2e/fixtures/coupons-baseline.json). We test the safe parity
 * surfaces that don't require provisioning a real user / DevKit token
 * in CI:
 *
 *   - redeem    : unauthenticated → original requireAuth threw, the outer
 *                 catch returned 500 + { success:false, error: msg }.
 *   - validate  : unauthenticated → same shape but { valid:false, ... }.
 *   - admin-mgr : unauthenticated → original requireAdminAuth returned a
 *                 401 Response with an { error } envelope.
 *
 * Skipped automatically when SUPABASE_URL / SUPABASE_ANON_KEY are not
 * configured (no remote endpoint to call).
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const skipReason = !SUPABASE_URL || !SUPABASE_ANON_KEY
  ? 'SUPABASE_URL / SUPABASE_ANON_KEY not configured'
  : null;

type BaselineEntry = { status: number; body?: Record<string, unknown>; body_keys?: string[] };

async function callMerged(action: string, body: unknown) {
  const ctx = await request.newContext({
    extraHTTPHeaders: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'x-coupons-action': action,
    },
  });
  const res = await ctx.post(`${SUPABASE_URL}/functions/v1/coupons`, { data: body });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try { json = JSON.parse(text) as Record<string, unknown>; } catch { /* leave null */ }
  await ctx.dispose();
  return { status: res.status(), json, text };
}

function assertMatchesBaseline(actual: { status: number; json: Record<string, unknown> | null }, expected: BaselineEntry) {
  expect(actual.status).toBe(expected.status);
  if (expected.body) {
    expect(actual.json).toEqual(expected.body);
  }
  if (expected.body_keys) {
    expect(Object.keys(actual.json ?? {}).sort()).toEqual([...expected.body_keys].sort());
  }
}

test.describe('coupons router parity (Task #48)', () => {
  test.skip(!!skipReason, skipReason ?? '');

  test('redeem: unauthenticated request matches baseline envelope', async () => {
    const merged = await callMerged('redeem', { code: '' });
    const expected = (baseline as Record<string, BaselineEntry>)['redeem.missing_code'];
    assertMatchesBaseline(merged, expected);
  });

  test('validate: unauthenticated request matches baseline envelope', async () => {
    const merged = await callMerged('validate', { code: '' });
    const expected = (baseline as Record<string, BaselineEntry>)['validate.missing_code'];
    assertMatchesBaseline(merged, expected);
  });

  test('admin-manage: unauthenticated list matches baseline envelope', async () => {
    const merged = await callMerged('admin-manage', { action: 'list' });
    const expected = (baseline as Record<string, BaselineEntry>)['admin_manage.list_unauth'];
    assertMatchesBaseline(merged, expected);
  });
});
