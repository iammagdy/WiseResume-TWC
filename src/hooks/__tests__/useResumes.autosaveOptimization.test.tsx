import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useResumeMutations, reconcileUpdatedResume, getResumeDocumentUpdatedAt, type DatabaseResume } from '../useResumes';
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

describe('P2-2 Autosave Cache Invalidation Optimization', () => {
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

  describe('reconcileUpdatedResume pure helper', () => {
    it('replaces matching resume, preserves others, and sorts by $updatedAt descending', () => {
      // Initially: resume2 (Aug 2) > resume1 (Aug 1) > resume3 (Jul 1)
      const currentList = [initialResume2, initialResume1, initialResume3];

      // Update resume-1 with a newer timestamp (Aug 5)
      const updatedResume1: DatabaseResume = {
        ...initialResume1,
        title: 'Resume 1 Edited',
        $updatedAt: '2026-08-05T14:00:00.000Z',
      };

      const result = reconcileUpdatedResume(currentList, updatedResume1);

      // Result should not mutate original array
      expect(result).not.toBe(currentList);
      expect(result).toHaveLength(3);

      // New order: resume1 (Aug 5) > resume2 (Aug 2) > resume3 (Jul 1)
      expect(result[0].$id).toBe('resume-1');
      expect(result[0].title).toBe('Resume 1 Edited');
      expect(result[0].$updatedAt).toBe('2026-08-05T14:00:00.000Z');

      expect(result[1].$id).toBe('resume-2');
      expect(result[1].title).toBe('Resume 2 (Newer)');

      expect(result[2].$id).toBe('resume-3');
      expect(result[2].title).toBe('Resume 3 (Oldest)');
    });

    it('does not alter list if updated item does not match, but preserves ordering', () => {
      const currentList = [initialResume2, initialResume1];
      const otherResume: DatabaseResume = {
        $id: 'resume-other',
        user_id: mockUserId,
        title: 'Other Resume',
        template: 'classic',
        $createdAt: '2026-08-03T10:00:00.000Z',
        $updatedAt: '2026-08-03T10:00:00.000Z',
      };

      const result = reconcileUpdatedResume(currentList, otherResume);
      expect(result).toHaveLength(2);
      expect(result[0].$id).toBe('resume-2');
      expect(result[1].$id).toBe('resume-1');
    });
  });

  describe('updateResume mutation cache reconciliation and 0-read guarantee', () => {
    it('calls updateDocument once and updates detail + list caches with 0 getDocument/listDocuments reads', async () => {
      // 1. Setup existing active queries in QueryClient
      const updatedDocFromServer: DatabaseResume = {
        $id: 'resume-1',
        user_id: mockUserId,
        title: 'Resume 1 Updated',
        template: 'classic',
        $createdAt: '2026-08-01T10:00:00.000Z',
        $updatedAt: '2026-08-10T15:30:00.000Z', // newest
      };

      vi.mocked(databases.updateDocument).mockResolvedValue(updatedDocFromServer as any);

      // Pre-seed caches
      queryClient.setQueryData(['resume', 'resume-1'], initialResume1);
      queryClient.setQueryData(['resumes', mockUserId], [initialResume2, initialResume1, initialResume3]);

      const { result } = renderHook(() => useResumeMutations(), { wrapper });

      // 2. Perform the update mutation
      const mutationResult = await result.current.updateResume.mutateAsync({
        resumeId: 'resume-1',
        updates: { title: 'Resume 1 Updated' },
      });

      // 3. Verify databases.updateDocument was called exactly once
      expect(databases.updateDocument).toHaveBeenCalledTimes(1);
      expect(databases.updateDocument).toHaveBeenCalledWith(
        'main',
        'resumes',
        'resume-1',
        expect.any(Object),
      );

      // 4. CRITICAL: Verify NO immediate getDocument or listDocuments requests were triggered
      expect(databases.getDocument).not.toHaveBeenCalled();
      expect(databases.listDocuments).not.toHaveBeenCalled();

      // 5. Verify detail cache ['resume', 'resume-1'] was directly updated with authoritative server doc
      const detailCache = queryClient.getQueryData<DatabaseResume>(['resume', 'resume-1']);
      expect(detailCache).toBeDefined();
      expect(detailCache?.$id).toBe('resume-1');
      expect(detailCache?.title).toBe('Resume 1 Updated');
      expect(detailCache?.$updatedAt).toBe('2026-08-10T15:30:00.000Z');

      // 6. Verify list cache ['resumes', user.id] was directly reconciled and re-sorted
      const listCache = queryClient.getQueryData<DatabaseResume[]>(['resumes', mockUserId]);
      expect(listCache).toBeDefined();
      expect(listCache).toHaveLength(3);
      // resume-1 should now be first because its $updatedAt (Aug 10) is newest
      expect(listCache![0].$id).toBe('resume-1');
      expect(listCache![0].title).toBe('Resume 1 Updated');
      expect(listCache![1].$id).toBe('resume-2');
      expect(listCache![2].$id).toBe('resume-3');

      // 7. Verify writePersistedCache was invoked with the exact reconciled list
      expect(writePersistedCache).toHaveBeenCalledTimes(1);
      expect(writePersistedCache).toHaveBeenCalledWith(`resumes:${mockUserId}`, listCache);

      // 8. Verify the mutation return value provides $updatedAt for useEditorAutosave baseline tracking
      const savedAt = getResumeDocumentUpdatedAt(
        (mutationResult as { $updatedAt?: string; updated_at?: string }) ?? undefined,
      );
      expect(savedAt).toBe('2026-08-10T15:30:00.000Z');
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

      // Seed only detail cache; list cache is undefined
      queryClient.setQueryData(['resume', 'resume-1'], initialResume1);

      const { result } = renderHook(() => useResumeMutations(), { wrapper });

      await result.current.updateResume.mutateAsync({
        resumeId: 'resume-1',
        updates: { title: 'Resume 1 Updated' },
      });

      expect(databases.updateDocument).toHaveBeenCalledTimes(1);
      expect(databases.getDocument).not.toHaveBeenCalled();
      expect(databases.listDocuments).not.toHaveBeenCalled();

      // Detail cache is updated
      expect(queryClient.getQueryData(['resume', 'resume-1'])).toEqual(updatedDocFromServer);

      // List cache remains undefined (no fake list fabricated)
      expect(queryClient.getQueryData(['resumes', mockUserId])).toBeUndefined();
      expect(writePersistedCache).not.toHaveBeenCalled();
    });
  });
});
