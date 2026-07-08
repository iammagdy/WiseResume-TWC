import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockInvoke = vi.fn();
const mockCreateJob = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-123', email: 'test@example.com' } }),
}));

vi.mock('@/lib/appwrite-functions', () => ({
  appwriteFunctions: {
    invoke: (...args: unknown[]) => mockInvoke(...args),
  },
}));

vi.mock('@/hooks/useJobs', () => ({
  useJobMutations: () => ({
    createJob: { mutateAsync: mockCreateJob },
  }),
}));

import { useImportJob } from '@/hooks/useImportJob';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

describe('useImportJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({
      data: {
        ok: true,
        jobId: 'job-abc',
        persisted: true,
        fallbackRequired: false,
        job: {
          title: 'Engineer',
          company: 'Acme',
          location: 'Remote',
          salary_range: null,
          job_type: 'full-time',
          description: 'Build things',
          requirements: 'TypeScript',
          skills: ['TypeScript'],
        },
      },
      error: null,
    });
  });

  it('passes user.id (not $id) to job-import', async () => {
    const { result } = renderHook(() => useImportJob(), { wrapper });

    await result.current.mutateAsync('https://example.com/jobs/1');

    expect(mockInvoke).toHaveBeenCalledWith('job-import', {
      body: { url: 'https://example.com/jobs/1', userId: 'user-123' },
    });
  });

  it('returns saved job id from function response', async () => {
    const { result } = renderHook(() => useImportJob(), { wrapper });

    const saved = await result.current.mutateAsync('https://example.com/jobs/1');

    await waitFor(() => {
      expect(saved.id).toBe('job-abc');
      expect(saved.job.title).toBe('Engineer');
    });
    expect(mockCreateJob).not.toHaveBeenCalled();
  });

  it('triggers client-side fallback when fallbackRequired is true', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        ok: true,
        jobId: null,
        persisted: false,
        fallbackRequired: true,
        job: {
          title: 'Fallbacked Position',
          company: 'Acme Fallback',
          location: 'Remote',
          salary_range: null,
          job_type: 'full-time',
          description: 'Build things',
          requirements: 'TypeScript',
          skills: ['TypeScript'],
        },
      },
      error: null,
    });
    mockCreateJob.mockResolvedValue({ id: 'fallback-job-id' });

    const { result } = renderHook(() => useImportJob(), { wrapper });
    const saved = await result.current.mutateAsync('https://example.com/jobs/1');

    expect(mockCreateJob).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Fallbacked Position',
      company: 'Acme Fallback',
    }));
    expect(saved.id).toBe('fallback-job-id');
  });
});
