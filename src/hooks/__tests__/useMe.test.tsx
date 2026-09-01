import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMe } from '../useMe';
import * as useAuthHook from '@/hooks/useAuth';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { databases, client } from '@/lib/appwrite';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

let realtimeCallback: ((event: { payload?: { user_id?: string } }) => void) | null = null;
const mockUnsubscribe = vi.fn();

vi.mock('@/lib/appwrite', () => ({
  databases: {
    listDocuments: vi.fn(),
  },
  client: {
    subscribe: vi.fn((_channel: string, cb: (event: any) => void) => {
      realtimeCallback = cb;
      return mockUnsubscribe;
    }),
  },
  DATABASE_ID: 'main',
  Query: {
    equal: (attr: string, val: string) => `equal("${attr}", "${val}")`,
  },
}));

vi.mock('@/lib/appwrite-functions', () => ({
  appwriteFunctions: {
    invoke: vi.fn(),
  },
}));

describe('useMe hook — P2-1 polling and realtime behavior', () => {
  let queryClient: QueryClient;

  const mockUser = { id: 'user-123', email: 'user@example.com' };

  const defaultSubscriptionResponse = {
    data: {
      plan: 'pro',
      effective_plan: 'pro',
      status: 'active',
      trial_plan: null,
      trial_expires_at: null,
      coupon_code: null,
    },
    error: null,
  };

  const defaultCreditsResponse = {
    documents: [
      {
        daily_usage: 1,
        daily_limit: 50,
        total_usage: 5,
        usage_date: new Date().toISOString().split('T')[0],
      },
    ],
    total: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    realtimeCallback = null;
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      authReady: true,
      loading: false,
    } as unknown as ReturnType<typeof useAuthHook.useAuth>);

    vi.mocked(appwriteFunctions.invoke).mockResolvedValue(defaultSubscriptionResponse);
    vi.mocked(databases.listDocuments).mockResolvedValue(defaultCreditsResponse as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('unauthenticated query remains disabled', async () => {
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      authReady: true,
      loading: false,
    } as unknown as ReturnType<typeof useAuthHook.useAuth>);

    const { result } = renderHook(() => useMe(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.status).toBe('pending');
    expect(result.current.data).toBeUndefined();
    expect(appwriteFunctions.invoke).not.toHaveBeenCalled();
    expect(databases.listDocuments).not.toHaveBeenCalled();
  });

  it('proves no refetch occurs at 15 seconds and no interval refetch occurs before 5 minutes', async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useMe(), { wrapper });

    // Allow initial query promise to settle
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.isSuccess).toBe(true);
    expect(appwriteFunctions.invoke).toHaveBeenCalledTimes(1);
    expect(databases.listDocuments).toHaveBeenCalledTimes(1);

    // Advance to 15 seconds: proves old 15s polling interval is eliminated
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 1000);
    });
    expect(appwriteFunctions.invoke).toHaveBeenCalledTimes(1);
    expect(databases.listDocuments).toHaveBeenCalledTimes(1);

    // Advance to 4 minutes 59 seconds: proves no interval refetch happens before 5 minutes
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4 * 60 * 1000 + 44 * 1000); // 15s + 284s = 299s (4m 59s)
    });
    expect(appwriteFunctions.invoke).toHaveBeenCalledTimes(1);
    expect(databases.listDocuments).toHaveBeenCalledTimes(1);
  });

  it('proves refetch occurs at 5 minutes while actively observed', async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useMe(), { wrapper });

    // Allow initial query promise to settle
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.isSuccess).toBe(true);
    expect(appwriteFunctions.invoke).toHaveBeenCalledTimes(1);

    // Advance 5 minutes (300,000 ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    });

    expect(appwriteFunctions.invoke).toHaveBeenCalledTimes(2);
    expect(databases.listDocuments).toHaveBeenCalledTimes(2);
  });

  it('matching subscription Realtime event invalidates current user', async () => {
    const { result } = renderHook(() => useMe(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(appwriteFunctions.invoke).toHaveBeenCalledTimes(1);
    expect(client.subscribe).toHaveBeenCalledWith(
      'databases.main.collections.subscriptions.documents',
      expect.any(Function),
    );
    expect(realtimeCallback).toBeTypeOf('function');

    // Simulate Appwrite Realtime pushing a subscription document event for current user
    realtimeCallback!({ payload: { user_id: 'user-123' } });

    // Expect queryClient to invalidate and re-query
    await waitFor(() => {
      expect(appwriteFunctions.invoke).toHaveBeenCalledTimes(2);
    });
  });

  it('unrelated user Realtime event does not trigger invalidation', async () => {
    const { result } = renderHook(() => useMe(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(appwriteFunctions.invoke).toHaveBeenCalledTimes(1);
    expect(realtimeCallback).toBeTypeOf('function');

    // Simulate Appwrite Realtime pushing an event for a different user
    realtimeCallback!({ payload: { user_id: 'different-user-999' } });

    // Query must NOT refetch
    expect(appwriteFunctions.invoke).toHaveBeenCalledTimes(1);
  });
});
