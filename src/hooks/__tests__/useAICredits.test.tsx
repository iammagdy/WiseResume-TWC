import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAICredits, useAICreditsMutations } from '../useAICredits';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as useAuthHook from '@/hooks/useAuth';
import * as useMeHook from '@/hooks/useMe';
import React from 'react';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useMe', () => ({
  useMe: vi.fn(),
}));

vi.mock('@/store/settingsStore', () => {
  const state = { aiProvider: 'wiseresume', geminiKeyValidated: false, ollamaKeyValidated: false };
  const mockStore = vi.fn((selector: (s: typeof state) => unknown) => selector ? selector(state) : state);
  (mockStore as { getState: () => typeof state }).getState = () => state;
  return { useSettingsStore: mockStore };
});

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), warning: vi.fn() }
}));

describe('useAICredits', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should return credits data from useMe (Scenario 2.2 Client-side blocking)', () => {
    vi.mocked(useAuthHook.useAuth).mockReturnValue({ user: { id: 'user-123' }, isAuthenticated: true } as ReturnType<typeof useAuthHook.useAuth>);

    const mockAICredits = {
      daily_usage: 5,
      daily_limit: 20,
      usage_date: new Date().toISOString().split('T')[0],
      total_usage: 100,
      updated_at: new Date().toISOString(),
    };

    vi.mocked(useMeHook.useMe).mockReturnValue({
      data: { userId: 'uuid-123', kinde_sub: null, profile: null, preferences: null, subscription: null, ai_credits: mockAICredits },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useMeHook.useMe>);

    const { result } = renderHook(() => useAICredits(), { wrapper });

    expect(result.current.data).toEqual(expect.objectContaining({
      daily_usage: 5,
      daily_limit: 20,
    }));
    expect(result.current.isLoading).toBe(false);
  });

  it('should return fallback defaults when useMe returns no credits', () => {
    vi.mocked(useAuthHook.useAuth).mockReturnValue({ user: { id: 'user-123' }, isAuthenticated: true } as ReturnType<typeof useAuthHook.useAuth>);

    vi.mocked(useMeHook.useMe).mockReturnValue({
      data: { userId: 'uuid-123', kinde_sub: null, profile: null, preferences: null, subscription: null, ai_credits: null },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useMeHook.useMe>);

    const { result } = renderHook(() => useAICredits(), { wrapper });

    expect(result.current.data).toEqual(expect.objectContaining({
      daily_usage: 0,
      daily_limit: 5,
    }));
  });
});

describe('useAICreditsMutations', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
    vi.mocked(useAuthHook.useAuth).mockReturnValue({ user: { id: 'user-123' }, isAuthenticated: true } as ReturnType<typeof useAuthHook.useAuth>);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should check credits and return true if remaining (Scenario 2.2)', async () => {
    const cachedAICredits = {
      daily_usage: 5,
      daily_limit: 20,
      usage_date: new Date().toISOString().split('T')[0],
    };
    queryClient.setQueryData(['me', 'user-123'], {
      userId: 'uuid-123',
      subscription: null,
      ai_credits: cachedAICredits,
    });

    const { result } = renderHook(() => useAICreditsMutations(), { wrapper });

    const hasCredits = await result.current.checkCredits();
    expect(hasCredits).toBe(true);
  });

  it('should check credits and return false if exhausted', async () => {
    const cachedAICredits = {
      daily_usage: 20,
      daily_limit: 20,
      usage_date: new Date().toISOString().split('T')[0],
    };
    queryClient.setQueryData(['me', 'user-123'], {
      userId: 'uuid-123',
      subscription: null,
      ai_credits: cachedAICredits,
    });

    const { result } = renderHook(() => useAICreditsMutations(), { wrapper });

    const hasCredits = await result.current.checkCredits();
    expect(hasCredits).toBe(false);
  });
});
