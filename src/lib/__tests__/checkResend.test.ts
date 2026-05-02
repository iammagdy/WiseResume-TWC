import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { checkResend } from '../../../supabase/functions/admin-devkit-data/checkResend';

// jsdom (vitest's default test env) doesn't ship `AbortSignal.timeout` —
// the helper uses it for a request-level timeout that is harmless to stub
// out in unit tests. The production runtime (Deno on Supabase Edge) has
// it natively, so this polyfill only ever runs in the test process.
beforeAll(() => {
  if (typeof (AbortSignal as unknown as { timeout?: unknown }).timeout !== 'function') {
    (AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout = (ms: number) => {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), ms);
      return ctrl.signal;
    };
  }
});

/**
 * Unit tests for the Resend health-check helper used by admin-devkit-data
 * Mission Control. Locks in the `restricted_api_key` translation so a
 * future refactor of the helper can't quietly drop the friendly reason.
 */
describe('checkResend', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns missing_key when no apiKey is supplied (no network call)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const result = await checkResend('');

    expect(result).toEqual({
      reachable: false,
      httpStatus: 0,
      sends24h: null,
      reason: 'missing_key',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('translates a 401 with name="restricted_api_key" into reason=restricted_key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({
        statusCode: 401,
        name: 'restricted_api_key',
        message: 'This API key is restricted to only send emails',
      }),
    }));

    const result = await checkResend('re_restricted_xxx');

    expect(result).toEqual({
      reachable: false,
      httpStatus: 401,
      sends24h: null,
      reason: 'restricted_key',
    });
  });

  it('falls back to a plain 401 when the body is not the restricted shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ name: 'invalid_api_key', message: 'Invalid' }),
    }));

    const result = await checkResend('re_bad_xxx');

    expect(result).toEqual({
      reachable: false,
      httpStatus: 401,
      sends24h: null,
    });
    // No `reason` field on the generic-401 branch.
    expect((result as Record<string, unknown>).reason).toBeUndefined();
  });

  it('falls back to a plain 401 when the body is not valid JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'unauthorized',
    }));

    const result = await checkResend('re_bad_xxx');

    expect(result).toEqual({
      reachable: false,
      httpStatus: 401,
      sends24h: null,
    });
  });

  it('returns reachable + counts sends in the last 24h on a 200 response', async () => {
    const now = Date.now();
    const within = new Date(now - 60_000).toISOString();        // 1m  ago — counted
    const outside = new Date(now - 30 * 3600_000).toISOString(); // 30h ago — excluded

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          { created_at: within },
          { created_at: within },
          { created_at: outside },
        ],
      }),
    }));

    const result = await checkResend('re_live_xxx');

    expect(result).toEqual({
      reachable: true,
      httpStatus: 200,
      sends24h: 2,
    });
  });

  it('returns unreachable on a network error (fetch rejects)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));

    const result = await checkResend('re_anything');

    expect(result).toEqual({
      reachable: false,
      httpStatus: 0,
      sends24h: null,
    });
  });
});
