import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRemoteJobs } from '../useRemoteJobs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as useAuthHook from '@/hooks/useAuth';
import { databases, functions, account } from '@/lib/appwrite';
import React from 'react';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/appwrite', () => {
  return {
    databases: {
      listDocuments: vi.fn(),
      createDocument: vi.fn(),
      updateDocument: vi.fn(),
      deleteDocument: vi.fn(),
    },
    functions: {
      createExecution: vi.fn(),
    },
    account: {
      createJWT: vi.fn(),
    },
    DATABASE_ID: 'main',
    ID: { unique: () => 'unique-action-id' },
  };
});

describe('useRemoteJobs Hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('uses user.id instead of user.$id in direct queries and action tracking', async () => {
    // 1. Mock useAuth returning user.id
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      user: { id: 'user_123', email: 'test@example.com' },
      isAuthenticated: true,
      authReady: true,
    } as any);

    // Mock createJWT and function execution to reject so it falls back to direct query
    vi.mocked(account.createJWT).mockRejectedValue(new Error('no jwt'));
    vi.mocked(databases.listDocuments).mockResolvedValue({
      documents: [
        {
          $id: 'job_feed_item_1',
          source: 'remotive',
          source_job_id: '101',
          title: 'Developer',
          company: 'Tech',
          role_group: 'tech_programming',
          published_at: new Date().toISOString(),
          dedupe_key: 'remotive:101',
          status: 'active',
        },
      ],
      total: 1,
    } as any);

    // Render hook
    const { result } = renderHook(() => useRemoteJobs({}), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Check listDocuments queries to verify user_id query uses user.id
    expect(databases.listDocuments).toHaveBeenCalled();
    const secondCall = vi.mocked(databases.listDocuments).mock.calls.find(
      call => call[1] === 'user_job_actions'
    );
    expect(secondCall).toBeDefined();
    if (secondCall) {
      expect(secondCall[0]).toBe('main');
      const queries = secondCall[2] as any[];
      const userQuery = queries.find(q => q.attribute === 'user_id' || (typeof q === 'string' && q.includes('user_id')));
      expect(userQuery).toBeDefined();
      if (typeof userQuery === 'object') {
        expect(userQuery.values[0]).toBe('user_123');
      } else {
        expect(userQuery).toContain('user_123');
      }
    }

    // Now test trackAction
    vi.mocked(databases.listDocuments).mockClear();
    // mock listDocuments for checking existing document in trackAction
    vi.mocked(databases.listDocuments).mockResolvedValueOnce({
      documents: [],
      total: 0,
    } as any);

    vi.mocked(databases.createDocument).mockResolvedValue({
      $id: 'new_action_id',
    } as any);

    let trackRes;
    await act(async () => {
      trackRes = await result.current.trackAction(
        {
          $id: 'job_feed_item_1',
          source: 'remotive',
          source_job_id: '101',
          title: 'Developer',
          company: 'Tech',
          role_group: 'tech_programming',
          dedupe_key: 'remotive:101',
          status: 'active',
          canonical_url: 'https://example.com/job',
          apply_url: 'https://example.com/apply',
          fetched_at: new Date().toISOString(),
          content_hash: 'hash',
        },
        'mark_ready_to_apply',
      );
    });

    expect(trackRes).toEqual({ ok: true });
    // Verify databases.createDocument was called with user.id, not undefined
    expect(databases.createDocument).toHaveBeenCalledWith(
      'main',
      'user_job_actions',
      expect.any(String),
      expect.objectContaining({
        user_id: 'user_123',
        job_feed_item_id: 'job_feed_item_1',
        status: 'ready_to_apply',
      }),
      expect.any(Array),
    );
  });
});
