import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAICredits, useAICreditsMutations } from '../useAICredits';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as useAuthHook from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/safeClient';
import React from 'react';

// Mock dependencies
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/store/settingsStore', () => {
  const state = { aiProvider: 'wiseresume', geminiKeyValidated: false, ollamaKeyValidated: false };
  const mockStore = vi.fn((selector) => selector ? selector(state) : state);
  (mockStore as any).getState = () => state;
  return { useSettingsStore: mockStore };
});

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), warning: vi.fn() }
}));

// Mock Supabase DB client
vi.mock('@/integrations/supabase/safeClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
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

  it('should fetch standard user limits (Scenario 2.2 Client-side blocking)', async () => {
    // Setup Auth
    vi.mocked(useAuthHook.useAuth).mockReturnValue({ user: { id: 'user-123' } } as any);
    
    // Setup Supabase db response
    const mockDbData = {
      daily_usage: 5,
      daily_limit: 20,
      usage_date: new Date().toISOString().split('T')[0],
      total_usage: 100
    };

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockDbData, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      maybeSingle: mockMaybeSingle
    } as any);

    const { result } = renderHook(() => useAICredits(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(expect.objectContaining({
      daily_usage: 5,
      daily_limit: 20
    }));
  });
});

describe('useAICreditsMutations', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should check credits and return true if remaining (Scenario 2.2)', async () => {
    vi.mocked(useAuthHook.useAuth).mockReturnValue({ user: { id: 'user-123' } } as any);
    
    // Remaining = 20 - 5 = 15 > 0
    const mockDbData = {
      daily_usage: 5,
      daily_limit: 20,
      usage_date: new Date().toISOString().split('T')[0]
    };

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockDbData, error: null })
    } as any);

    const { result } = renderHook(() => useAICreditsMutations(), { wrapper });

    const hasCredits = await result.current.checkCredits();
    expect(hasCredits).toBe(true);
  });

  it('should check credits and return false if exhausted', async () => {
    vi.mocked(useAuthHook.useAuth).mockReturnValue({ user: { id: 'user-123' } } as any);
    
    // Exhausted: 20/20
    const mockDbData = {
      daily_usage: 20,
      daily_limit: 20,
      usage_date: new Date().toISOString().split('T')[0]
    };

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockDbData, error: null })
    } as any);

    const { result } = renderHook(() => useAICreditsMutations(), { wrapper });

    const hasCredits = await result.current.checkCredits();
    expect(hasCredits).toBe(false);
  });
});
