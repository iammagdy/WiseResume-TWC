import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import DashboardPage from '../DashboardPage';
import { useResumes } from '@/hooks/useResumes';
import { useAuth } from '@/hooks/useAuth';

vi.mock('@/hooks/useResumes', () => ({
  useResumes: vi.fn(),
  useResumeMutations: () => ({
    deleteResume: { mutate: vi.fn() },
    deleteMultipleResumes: { mutate: vi.fn() },
    duplicateResume: { mutate: vi.fn() },
    updateResume: { mutate: vi.fn() },
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useJobs', () => ({
  useJobs: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/store/resumeStore', () => ({
  useResumeStore: () => ({
    setCurrentResume: vi.fn(),
    setCurrentResumeId: vi.fn(),
    tailorHistory: [],
  }),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({ profile: null, loading: false }),
}));

vi.mock('@/hooks/usePlan', () => ({
  usePlan: () => ({ plan: null, loading: false }),
}));

describe('Dashboard Page Onboarding Gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Loading Resumes skeleton when query is loading/fetching/placeholder', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', email: 'u1@example.com', name: 'User 1' },
      authReady: true,
      authSettled: true,
      signOut: vi.fn(),
    } as any);

    vi.mocked(useResumes).mockReturnValue({
      data: [],
      isFetched: false,
      isPlaceholderData: false,
      error: null,
      refetch: vi.fn(),
      isLoading: true,
      isFetching: true,
    } as any);

    renderWithProviders(<DashboardPage />);
    expect(screen.getByText(/Loading your resumes/i)).toBeInTheDocument();
  });
});
