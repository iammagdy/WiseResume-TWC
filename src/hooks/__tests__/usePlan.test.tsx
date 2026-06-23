import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePlan } from '../usePlan';
import * as useAuthHook from '@/hooks/useAuth';
import * as useMeHook from '@/hooks/useMe';
import * as planCache from '@/lib/planCache';

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('@/hooks/useMe', () => ({ useMe: vi.fn() }));
vi.mock('@/lib/planCache', () => ({
  readPlanCache: vi.fn(),
  writePlanCache: vi.fn(),
  clearPlanCache: vi.fn(),
}));

function mockAuth(over: Partial<ReturnType<typeof useAuthHook.useAuth>>) {
  vi.mocked(useAuthHook.useAuth).mockReturnValue({
    isAuthenticated: true,
    loading: false,
    ...over,
  } as ReturnType<typeof useAuthHook.useAuth>);
}
function mockMe(over: Partial<ReturnType<typeof useMeHook.useMe>>) {
  vi.mocked(useMeHook.useMe).mockReturnValue({
    data: undefined,
    isLoading: false,
    refetch: vi.fn(),
    ...over,
  } as ReturnType<typeof useMeHook.useMe>);
}

describe('usePlan — cache resolution (B1)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('serves a fresh cached plan as RESOLVED (isLoading:false) while auth is still validating', () => {
    mockAuth({ loading: true });
    mockMe({ isLoading: true });
    vi.mocked(planCache.readPlanCache).mockReturnValue({
      plan: 'pro', trialPlan: null, trialExpiresAt: null, cachedAt: Date.now(),
    });

    const { result } = renderHook(() => usePlan());
    // The whole point of B1: a returning user's cached plan shows instantly.
    expect(result.current.isLoading).toBe(false);
    expect(result.current.plan).toBe('pro');
    expect(result.current.isPro).toBe(true);
    // Entitlement is NOT verified from cache — hard gates must still wait.
    expect(result.current.subscriptionVerified).toBe(false);
  });

  it('serves cached plan as resolved while useMe is in flight (authenticated)', () => {
    mockAuth({ loading: false, isAuthenticated: true });
    mockMe({ isLoading: true });
    vi.mocked(planCache.readPlanCache).mockReturnValue({
      plan: 'premium', trialPlan: null, trialExpiresAt: null, cachedAt: Date.now(),
    });

    const { result } = renderHook(() => usePlan());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.plan).toBe('premium');
    expect(result.current.isPremium).toBe(true);
  });

  it('stays loading on a genuine cold load (no cache) while validating', () => {
    mockAuth({ loading: true });
    mockMe({ isLoading: true });
    vi.mocked(planCache.readPlanCache).mockReturnValue(null);

    const { result } = renderHook(() => usePlan());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.plan).toBe('free');
  });

  it('resolves live data and writes the cache when settled', () => {
    mockAuth({ loading: false, isAuthenticated: true });
    mockMe({
      isLoading: false,
      data: {
        subscription: { effective_plan: 'pro' },
        subscriptionVerified: true,
      },
    } as Partial<ReturnType<typeof useMeHook.useMe>>);
    vi.mocked(planCache.readPlanCache).mockReturnValue(null);

    const { result } = renderHook(() => usePlan());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.plan).toBe('pro');
    expect(result.current.subscriptionVerified).toBe(true);
    expect(planCache.writePlanCache).toHaveBeenCalledWith('pro', null, null);
  });

  it('clears the cache and resolves free when confirmed unauthenticated', () => {
    mockAuth({ loading: false, isAuthenticated: false });
    mockMe({ isLoading: false });

    const { result } = renderHook(() => usePlan());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.plan).toBe('free');
    expect(planCache.clearPlanCache).toHaveBeenCalled();
  });
});
