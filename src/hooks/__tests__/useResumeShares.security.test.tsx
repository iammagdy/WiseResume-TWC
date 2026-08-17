import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock('@/lib/appwrite-functions', () => ({
  appwriteFunctions: { invoke: mocks.invoke },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'owner-1' } }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import {
  type CreatedResumeShare,
  usePublicResume,
  useResumeShareMutations,
  useUnlockPublicResume,
} from '@/hooks/useResumeShares';
import { usePublicShareComments } from '@/hooks/useShareComments';

function makeHarness() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe('server-authoritative resume sharing hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads public content only through the public-share function', async () => {
    mocks.invoke.mockResolvedValue({
      data: { requires_password: true, authenticated: false },
      error: null,
    });
    const { wrapper } = makeHarness();
    const { result } = renderHook(() => usePublicResume('strong-token'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.invoke).toHaveBeenCalledWith('get-resume-share', {
      body: { token: 'strong-token' },
    });
    expect(result.current.data).toEqual({ requires_password: true, authenticated: false });
  });

  it('submits passwords as mutation bodies and never places plaintext in a query key', async () => {
    mocks.invoke.mockResolvedValue({
      data: {
        access_token: 'signed-capability',
        share: { is_active: true, expires_at: null, view_count: 1 },
        resume: { title: 'Resume' },
      },
      error: null,
    });
    const { queryClient, wrapper } = makeHarness();
    const { result } = renderHook(() => useUnlockPublicResume(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ token: 'strong-token', password: 'private password' });
    });

    expect(mocks.invoke).toHaveBeenCalledWith('get-resume-share', {
      body: { token: 'strong-token', password: 'private password' },
    });
    expect(JSON.stringify(queryClient.getQueryCache().getAll().map((query) => query.queryKey)))
      .not.toContain('private password');
  });

  it('creates strong links on the server and returns the one-time bearer token', async () => {
    mocks.invoke.mockResolvedValue({
      data: {
        id: 'share-1',
        resume_id: 'resume-1',
        token: 'server-generated-token',
        is_active: true,
        has_password: false,
        expires_at: null,
        view_count: 0,
        created_at: '2026-08-17T00:00:00.000Z',
      },
      error: null,
    });
    const { wrapper } = makeHarness();
    const { result } = renderHook(() => useResumeShareMutations(), { wrapper });

    let created: CreatedResumeShare | undefined;
    await act(async () => {
      created = await result.current.createShare.mutateAsync({ resumeId: 'resume-1' });
    });

    expect(mocks.invoke).toHaveBeenCalledWith('create-resume-share', {
      body: { resumeId: 'resume-1' },
    });
    expect(created?.token).toBe('server-generated-token');
  });

  it('does not request protected feedback until an access capability exists', async () => {
    mocks.invoke.mockResolvedValue({ data: [], error: null });
    const { wrapper } = makeHarness();
    const { result, rerender } = renderHook(
      ({ accessToken }) => usePublicShareComments('strong-token', accessToken),
      { wrapper, initialProps: { accessToken: null as string | null } },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(mocks.invoke).not.toHaveBeenCalled();

    rerender({ accessToken: 'signed-capability' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.invoke).toHaveBeenCalledWith('get-public-share-comments', {
      body: { token: 'strong-token', accessToken: 'signed-capability' },
    });
  });
});
