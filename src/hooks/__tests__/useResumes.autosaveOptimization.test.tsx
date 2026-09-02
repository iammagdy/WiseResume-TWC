import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useResumeMutations,
  reconcileUpdatedResume,
  getResumeDocumentUpdatedAt,
  type DatabaseResume,
} from '../useResumes';
import * as useAuthHook from '@/hooks/useAuth';
import { databases } from '@/lib/appwrite';
import { writePersistedCache } from '@/lib/persistedQueryCache';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/appwrite', () => ({
  databases: {
    updateDocument: vi.fn(),
    getDocument: vi.fn(),
    listDocuments: vi.fn(),
    createDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
  DATABASE_ID: 'main',
  ID: { unique: () => 'unique-id' },
  Query: {
    equal: vi.fn(),
    orderDesc: vi.fn(),
    limit: vi.fn(),
  },
}));

vi.mock('@/lib/persistedQueryCache', () => ({
  writePersistedCache: vi.fn(),
  readPersistedCache: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('P2-2 Autosave Cache Invalidation Optimization & Top-50 Reconciliation', () => {
  let queryClient: QueryClient;
  const mockUserId = 'user-123';

  const initialResume1: DatabaseResume = {
    $id: 'resume-1',
    user_id: mockUserId,
    title: 'Resume 1 Original',
    template: 'classic',
    $createdAt: '2026-08-01T10:00:00.000Z',
    $updatedAt: '2026-08-01T12:00:00.000Z',
  };

  const initialResume2: DatabaseResume = {
    $id: 'resume-2',
    user_id: mockUserId,
    title: 'Resume 2 (Newer)',
    template: 'classic',
    $createdAt: '2026-08-02T10:00:00.000Z',
    $updatedAt: '2026-08-02T12:00:00.000Z',
  };

  const initialResume3: DatabaseResume = {
    $id: 'resume-3',
    user_id: mockUserId,
    title: 'Resume 3 (Oldest)',
    template: 'classic',
    $createdAt: '2026-07-01T10:00:00.000Z',
    $updatedAt: '2026-07-01T12:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      user: { id: mockUserId, email: 'user@example.com' },
      isAuthenticated: true,
      authReady: true,
    } as unknown as ReturnType<typeof useAuthHook.useAuth>);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('reconcileUpdatedResume pure helper contracts', () => {
    it('1. replaces existing matching item and preserves others without mutating input array', () => {
      const currentList = [initialResume2, initialResume1, initialResume3];

      const updatedResume1: DatabaseResume = {
        ...initialResume1,
        title: 'Resume 1 Edited',
        $updatedAt: '2026-08-05T14:00:00.000Z',
      };

      const result = reconcileUpdatedResume(currentList, updatedResume1);

      // Immutability guarantee
      expect(result).not.toBe(currentList);
      expect(currentList[1].title).toBe('Resume 1 Original');
      expect(result).toHaveLength(3);

      // Order: resume1 (Aug 5) > resume2 (Aug 2) > resume3 (Jul 1)
      expect(result[0].$id).toBe('resume-1');
      expect(result[0].title).toBe('Resume 1 Edited');
      expect(result[1].$id).toBe('resume-2');
      expect(result[2].$id).toBe('resume-3');
    });

    it('2 & 3. inserts absent same-user updated item and sorts by authoritative $updatedAt', () => {
      const currentList = [initialResume2, initialResume3]; // resume-1 is absent

      const absentResume1: DatabaseResume = {
        ...initialResume1,
        title: 'Resume 1 Inserted',
        $updatedAt: '2026-08-01T15:00:00.000Z', // between resume2 (Aug 2) and resume3 (Jul 1)
      };

      const result = reconcileUpdatedResume(currentList, absentResume1);

      expect(result).toHaveLength(3);
      expect(result[0].$id).toBe('resume-2');
      expect(result[1].$id).toBe('resume-1');
      expect(result[1].title).toBe('Resume 1 Inserted');
      expect(result[2].$id).toBe('resume-3');
    });

    it('4 & 5. caps list to 50 items and drops oldest when inserting a 51st item', () => {
      const baseMs = Date.parse('2026-01-01T00:00:00.000Z');
      // Build 50 items: doc-1 (oldest, +1hr) to doc-50 (newest, +50hrs)
      const fiftyResumes: DatabaseResume[] = Array.from({ length: 50 }, (_, i) => ({
        $id: `doc-${i + 1}`,
        user_id: mockUserId,
        title: `Doc ${i + 1}`,
        template: 'classic',
        $createdAt: '2026-01-01T00:00:00.000Z',
        $updatedAt: new Date(baseMs + (i + 1) * 3600 * 1000).toISOString(),
      })).reverse(); // newest (doc-50 at +50hrs) down to oldest (doc-1 at +1hr)

      expect(fiftyResumes).toHaveLength(50);
      expect(fiftyResumes[0].$id).toBe('doc-50');
      expect(fiftyResumes[49].$id).toBe('doc-1');

      // Now update an absent 51st document with a brand new timestamp (+100hrs)
      const brandNewResume: DatabaseResume = {
        $id: 'doc-brand-new',
        user_id: mockUserId,
        title: 'Brand New Doc',
        template: 'classic',
        $createdAt: '2026-01-01T00:00:00.000Z',
        $updatedAt: new Date(baseMs + 100 * 3600 * 1000).toISOString(),
      };

      const result = reconcileUpdatedResume(fiftyResumes, brandNewResume, 50);

      // Must be capped at exactly 50
      expect(result).toHaveLength(50);
      // Newest is at index 0
      expect(result[0].$id).toBe('doc-brand-new');
      expect(result[1].$id).toBe('doc-50');
      // The oldest item (doc-1) must have been dropped off
      expect(result.some((r) => r.$id === 'doc-1')).toBe(false);
      // The 49th item from before (doc-2) is now the last item
      expect(result[49].$id).toBe('doc-2');
    });

    it('6. does not insert an absent cross-user document when ownerUserId option is set', () => {
      const currentList = [initialResume2, initialResume1];
      const crossUserDoc: DatabaseResume = {
        $id: 'resume-attacker',
        user_id: 'different-user-999',
        title: 'Attacker Doc',
        template: 'classic',
        $createdAt: '2026-09-01T00:00:00.000Z',
        $updatedAt: '2026-09-01T12:00:00.000Z',
      };

      const result = reconcileUpdatedResume(currentList, crossUserDoc, {
        limit: 50,
        ownerUserId: mockUserId,
      });

      // Must NOT be inserted
      expect(result).toHaveLength(2);
      expect(result.some((r) => r.$id === 'resume-attacker')).toBe(false);
    });
  });

  describe('updateResume mutation cache reconciliation and 0-read guarantee', () => {
    it('updates detail + list caches and persisted cache with 0 getDocument/listDocuments reads', async () => {
      const updatedDocFromServer: DatabaseResume = {
        $id: 'resume-1',
        user_id: mockUserId,
        title: 'Resume 1 Updated',
        template: 'classic',
        $createdAt: '2026-08-01T10:00:00.000Z',
        $updatedAt: '2026-08-10T15:30:00.000Z',
      };

      vi.mocked(databases.updateDocument).mockResolvedValue(updatedDocFromServer as any);

      queryClient.setQueryData(['resume', 'resume-1'], initialResume1);
      queryClient.setQueryData(['resumes', mockUserId], [initialResume2, initialResume1, initialResume3]);

      const { result } = renderHook(() => useResumeMutations(), { wrapper });

      const mutationResult = await result.current.updateResume.mutateAsync({
        resumeId: 'resume-1',
        updates: { title: 'Resume 1 Updated' },
      });

      // 1 write
      expect(databases.updateDocument).toHaveBeenCalledTimes(1);

      // 0 reads
      expect(databases.getDocument).not.toHaveBeenCalled();
      expect(databases.listDocuments).not.toHaveBeenCalled();

      // Detail cache updated
      const detailCache = queryClient.getQueryData<DatabaseResume>(['resume', 'resume-1']);
      expect(detailCache).toEqual(updatedDocFromServer);

      // List cache reconciled and sorted
      const listCache = queryClient.getQueryData<DatabaseResume[]>(['resumes', mockUserId]);
      expect(listCache).toBeDefined();
      expect(listCache).toHaveLength(3);
      expect(listCache![0].$id).toBe('resume-1');
      expect(listCache![0].title).toBe('Resume 1 Updated');
      expect(listCache![1].$id).toBe('resume-2');
      expect(listCache![2].$id).toBe('resume-3');

      // Persisted cache updated
      expect(writePersistedCache).toHaveBeenCalledTimes(1);
      expect(writePersistedCache).toHaveBeenCalledWith(`resumes:${mockUserId}`, listCache);

      // Baseline conflict tracking return
      const savedAt = getResumeDocumentUpdatedAt(
        (mutationResult as { $updatedAt?: string; updated_at?: string }) ?? undefined,
      );
      expect(savedAt).toBe('2026-08-10T15:30:00.000Z');
    });

    it('inserts absent user-owned resume into list cache when edited outside top-50', async () => {
      const updatedAbsentDoc: DatabaseResume = {
        $id: 'resume-previously-outside-top50',
        user_id: mockUserId,
        title: 'Brought into Top 50',
        template: 'classic',
        $createdAt: '2026-05-01T10:00:00.000Z',
        $updatedAt: '2026-08-20T12:00:00.000Z', // newest
      };

      vi.mocked(databases.updateDocument).mockResolvedValue(updatedAbsentDoc as any);

      // Existing list cache has resume2 and resume1
      queryClient.setQueryData(['resumes', mockUserId], [initialResume2, initialResume1]);

      const { result } = renderHook(() => useResumeMutations(), { wrapper });

      await result.current.updateResume.mutateAsync({
        resumeId: 'resume-previously-outside-top50',
        updates: { title: 'Brought into Top 50' },
      });

      // 0 read requests
      expect(databases.getDocument).not.toHaveBeenCalled();
      expect(databases.listDocuments).not.toHaveBeenCalled();

      // Detail cache updated
      expect(queryClient.getQueryData(['resume', 'resume-previously-outside-top50'])).toEqual(updatedAbsentDoc);

      // List cache now includes the absent document at the top
      const listCache = queryClient.getQueryData<DatabaseResume[]>(['resumes', mockUserId]);
      expect(listCache).toHaveLength(3);
      expect(listCache![0].$id).toBe('resume-previously-outside-top50');
      expect(listCache![1].$id).toBe('resume-2');
      expect(listCache![2].$id).toBe('resume-1');

      expect(writePersistedCache).toHaveBeenCalledWith(`resumes:${mockUserId}`, listCache);
    });

    it('ownership guard blocks inserting absent cross-user document into list cache', async () => {
      const crossUserDoc: DatabaseResume = {
        $id: 'resume-other-user',
        user_id: 'attacker-or-other-user',
        title: 'Not Mine',
        template: 'classic',
        $createdAt: '2026-08-01T10:00:00.000Z',
        $updatedAt: '2026-08-25T12:00:00.000Z',
      };

      vi.mocked(databases.updateDocument).mockResolvedValue(crossUserDoc as any);

      queryClient.setQueryData(['resumes', mockUserId], [initialResume2, initialResume1]);

      const { result } = renderHook(() => useResumeMutations(), { wrapper });

      await result.current.updateResume.mutateAsync({
        resumeId: 'resume-other-user',
        updates: { title: 'Not Mine' },
      });

      // List cache remains completely untouched for mockUserId
      const listCache = queryClient.getQueryData<DatabaseResume[]>(['resumes', mockUserId]);
      expect(listCache).toHaveLength(2);
      expect(listCache!.some((r) => r.$id === 'resume-other-user')).toBe(false);
    });

    it('does not fabricate a list cache if no list query existed prior to mutation', async () => {
      const updatedDocFromServer: DatabaseResume = {
        $id: 'resume-1',
        user_id: mockUserId,
        title: 'Resume 1 Updated',
        template: 'classic',
        $createdAt: '2026-08-01T10:00:00.000Z',
        $updatedAt: '2026-08-10T15:30:00.000Z',
      };

      vi.mocked(databases.updateDocument).mockResolvedValue(updatedDocFromServer as any);

      queryClient.setQueryData(['resume', 'resume-1'], initialResume1);

      const { result } = renderHook(() => useResumeMutations(), { wrapper });

      await result.current.updateResume.mutateAsync({
        resumeId: 'resume-1',
        updates: { title: 'Resume 1 Updated' },
      });

      expect(databases.updateDocument).toHaveBeenCalledTimes(1);
      expect(databases.getDocument).not.toHaveBeenCalled();
      expect(databases.listDocuments).not.toHaveBeenCalled();

      expect(queryClient.getQueryData(['resume', 'resume-1'])).toEqual(updatedDocFromServer);
      expect(queryClient.getQueryData(['resumes', mockUserId])).toBeUndefined();
      expect(writePersistedCache).not.toHaveBeenCalled();
    });
  });
});
