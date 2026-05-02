import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Tests for apiFetch's auth-resolution precedence.
 *
 * The behavior under test was added in Task #35: when an admin has claimed
 * an impersonation OTP (same-tab Act As OR /act-as fresh tab) the request
 * MUST carry the impersonation JWT, never the admin's Kinde→Supabase
 * bridge token. Any regression here would let admin-context queries leak
 * into impersonated dashboards (or vice-versa) under RLS.
 */

vi.mock('@/lib/supabaseBridge', () => ({
  getToken: vi.fn(() => 'KINDE_BRIDGE_TOKEN'),
  getUserId: vi.fn(() => 'kinde-user-uuid'),
}));

vi.mock('@/lib/impersonationStore', () => ({
  isImpersonating: vi.fn(() => false),
  getImpersonationToken: vi.fn(() => null),
  getImpersonationState: vi.fn(() => ({
    token: null, userId: null, email: null, expiresAt: null,
  })),
}));

import { apiFetch } from '../apiFetch';
import * as bridge from '@/lib/supabaseBridge';
import * as imp from '@/lib/impersonationStore';

function mockFetchOk(body: unknown = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function getAuthHeader(fetchMock: ReturnType<typeof vi.fn>): string | undefined {
  const call = fetchMock.mock.calls[0];
  const init = call?.[1] as RequestInit | undefined;
  const headers = (init?.headers ?? {}) as Record<string, string>;
  return headers.Authorization;
}

describe('apiFetch — impersonation precedence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: not impersonating
    vi.mocked(imp.isImpersonating).mockReturnValue(false);
    vi.mocked(imp.getImpersonationToken).mockReturnValue(null);
    vi.mocked(imp.getImpersonationState).mockReturnValue({
      token: null, userId: null, email: null, expiresAt: null,
    });
    vi.mocked(bridge.getToken).mockReturnValue('KINDE_BRIDGE_TOKEN');
    vi.mocked(bridge.getUserId).mockReturnValue('kinde-user-uuid');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the Kinde bridge token when no impersonation is active', async () => {
    const fetchMock = mockFetchOk({ ok: true });

    await apiFetch('/api/data/me');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAuthHeader(fetchMock)).toBe('Bearer KINDE_BRIDGE_TOKEN');
  });

  it('uses the impersonation JWT (not the Kinde bridge token) when impersonating', async () => {
    vi.mocked(imp.isImpersonating).mockReturnValue(true);
    vi.mocked(imp.getImpersonationToken).mockReturnValue('IMPERSONATION_JWT');
    vi.mocked(imp.getImpersonationState).mockReturnValue({
      token: 'IMPERSONATION_JWT',
      userId: 'impersonated-user-uuid',
      email: 'target@example.com',
      expiresAt: Date.now() + 60_000,
    });

    const fetchMock = mockFetchOk({ ok: true });

    await apiFetch('/api/data/me');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const auth = getAuthHeader(fetchMock);
    expect(auth).toBe('Bearer IMPERSONATION_JWT');
    expect(auth).not.toContain('KINDE_BRIDGE_TOKEN');
  });

  it('omits the Authorization header entirely when neither identity has a token', async () => {
    vi.mocked(bridge.getToken).mockReturnValue(null);
    vi.mocked(imp.isImpersonating).mockReturnValue(false);

    const fetchMock = mockFetchOk({ ok: true });

    await apiFetch('/api/data/me');

    expect(getAuthHeader(fetchMock)).toBeUndefined();
  });
});
