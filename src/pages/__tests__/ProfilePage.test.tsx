import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import ProfilePage from '../ProfilePage';
import { useProfile, getNextMissingField } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';

vi.mock('@/hooks/useProfile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useProfile')>();
  return {
    ...actual,
    useProfile: vi.fn(),
    calculateProfileCompletion: vi.fn().mockReturnValue(20),
    getNextMissingField: vi.fn(),
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/usePlan', () => ({
  usePlan: vi.fn(() => ({ isPro: false, plan: 'free' })),
}));

vi.mock('@/hooks/useResumes', () => ({
  useResumes: vi.fn(() => ({ data: [] })),
  useResumeMutations: vi.fn(() => ({ deleteResume: vi.fn(), duplicateResume: vi.fn() })),
}));

vi.mock('@/hooks/useJobApplications', () => ({
  useJobApplications: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/store/resumeStore', () => ({
  useResumeStore: vi.fn(() => ({
    setCurrentResume: vi.fn(),
    setCurrentResumeId: vi.fn(),
    setSelectedTemplate: vi.fn(),
  })),
}));

describe('ProfilePage Hints & Fallback Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders display name fallback from Auth user and translated hint instead of literal {{hint}}', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', name: 'Auth Fallback Name', email: 'auth@example.com' },
      authSettled: true,
    } as any);

    vi.mocked(useProfile).mockReturnValue({
      profile: {
        id: 'p1',
        fullName: null,
        jobTitle: null,
        industry: null,
        location: null,
      },
      loading: false,
      updateProfile: vi.fn(),
    } as any);

    vi.mocked(getNextMissingField).mockReturnValue('jobTitle');

    renderWithProviders(<ProfilePage />);

    expect(screen.getByText('Auth Fallback Name')).toBeInTheDocument();

    const hintText = screen.getByText(/Add your current or target job title/i);
    expect(hintText).toBeInTheDocument();
    
    expect(screen.queryByText(/\{\{hint\}\}/)).not.toBeInTheDocument();
  });
});
