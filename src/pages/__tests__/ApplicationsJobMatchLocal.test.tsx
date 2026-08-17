/* eslint-disable @typescript-eslint/no-explicit-any -- focused page-level mocks */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';

const { mockGatewayInvoke, mockLocalScore } = vi.hoisted(() => ({
  mockGatewayInvoke: vi.fn(),
  mockLocalScore: vi.fn(),
}));

vi.mock('@/lib/appwrite-functions', () => ({
  appwriteFunctions: { invoke: mockGatewayInvoke },
}));

vi.mock('@/lib/jobMatchScorer', () => ({
  scoreJobMatch: mockLocalScore,
}));

vi.mock('@/hooks/useJobs', () => ({
  useJobs: vi.fn(() => ({
    data: [{
      id: 'job-local',
      title: 'Frontend Engineer',
      company: 'Local Co',
      location: 'Remote',
      job_type: 'full-time',
      description: 'Build React and TypeScript applications',
      requirements: 'React TypeScript',
      posted_date: '2026-08-01',
      is_saved: true,
      user_id: 'u1',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      company_logo: null,
      salary_range: null,
      source_url: null,
    }],
    isLoading: false,
  })),
  useJobMutations: vi.fn(() => ({ createJob: { isPending: false, mutate: vi.fn() } })),
}));

vi.mock('@/hooks/useJobApplications', () => ({
  useJobApplications: vi.fn(() => ({ data: [], isLoading: false })),
  useJobApplicationMutations: vi.fn(() => ({
    createApplication: vi.fn(),
    updateApplication: vi.fn(),
    deleteApplication: vi.fn(),
  })),
  ApplicationStatus: {
    saved: 'saved',
    tailored: 'tailored',
    ready_to_apply: 'ready_to_apply',
    applied: 'applied',
    screening: 'screening',
    interviewing: 'interviewing',
    offer: 'offer',
    rejected: 'rejected',
  },
}));

vi.mock('@/hooks/useResumes', () => ({
  useResumes: vi.fn(() => ({
    data: [{
      id: 'resume-primary',
      is_primary: true,
      contactInfo: { fullName: 'Private Person', email: 'private@example.com', phone: '', location: '' },
      summary: 'Frontend engineer',
      experience: [],
      education: [],
      skills: ['React', 'TypeScript'],
      certifications: [],
      templateId: 'modern',
    }],
    isLoading: false,
    isError: false,
  })),
  dbToResumeData: vi.fn((resume: any) => resume),
  getResumeDocumentId: vi.fn((resume: any) => resume.id ?? resume.$id ?? null),
  useResumeMutations: vi.fn(() => ({
    createResume: vi.fn(),
    updateResume: vi.fn(),
    deleteResume: vi.fn(),
  })),
  resumeDataToDb: vi.fn((resume: any) => resume),
  useSetMasterCV: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/useNotifications', () => ({
  useUnreadNotificationCount: vi.fn(() => 0),
}));

vi.mock('@/hooks/useJobActivityStats', () => ({
  useJobActivityStats: vi.fn(() => ({
    originals: 0,
    tailored: 0,
    jobsAnalyzed: 0,
    coverLetters: 0,
    applicationsSubmitted: 0,
    interviewsScheduled: 0,
    offersReceived: 0,
    screeningCount: 0,
    appliedCount: 0,
    responseRate: 0,
    interviewRate: 0,
    offerRate: 0,
    weeklyTrend: [],
    isLoading: false,
  })),
}));

vi.mock('@/lib/activityTracker', () => ({
  activityTracker: { setActiveFeature: vi.fn(), trackAction: vi.fn() },
}));

vi.mock('@/lib/haptics', () => ({
  haptics: { light: vi.fn(), medium: vi.fn(), selection: vi.fn(), success: vi.fn() },
}));

vi.mock('@/hooks/usePlan', () => ({
  usePlan: vi.fn(() => ({ isPro: true, isPremium: false, isLoading: false, plan: 'pro' })),
}));

import * as useAuthHook from '@/hooks/useAuth';
import type { AuthContextType } from '@/contexts/AuthContext';
import ApplicationsPage from '@/pages/ApplicationsPage';

const mockUseAuth = vi.mocked(useAuthHook.useAuth);
const authenticatedAuth = (): AuthContextType => ({
  user: { id: 'u1', email: 'test@example.com', name: 'Test' },
  loading: false,
  isAuthenticated: true,
  authReady: true,
  isImpersonating: false,
  authSettled: true,
  authAvailable: true,
  signOut: vi.fn(),
});

describe('ApplicationsPage local job-match estimates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(authenticatedAuth());
    mockLocalScore.mockReturnValue({
      overall: 82,
      skillMatch: 90,
      experienceMatch: 64,
      keywords: { found: ['react', 'typescript'], missing: [] },
    });
  });

  it('renders and opens Saved Jobs using only the deterministic local scorer', async () => {
    renderWithProviders(<ApplicationsPage />);

    expect(mockLocalScore).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'resume-primary', skills: ['React', 'TypeScript'] }),
      expect.objectContaining({ id: 'job-local' }),
    );
    expect(mockGatewayInvoke).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /saved jobs/i }));

    const scoreButton = await screen.findByRole('button', { name: '82% Estimated match' });
    expect(scoreButton).toBeInTheDocument();
    expect(mockGatewayInvoke).not.toHaveBeenCalled();

    fireEvent.click(scoreButton);
    expect(await screen.findByText('Estimated match: ~82%')).toBeInTheDocument();
    expect(screen.getByText(/Local match estimate.+No AI analysis or credits are used/i)).toBeInTheDocument();
    expect(screen.queryByText(/AI[- ]verified/i)).not.toBeInTheDocument();

    await waitFor(() => expect(mockGatewayInvoke).not.toHaveBeenCalled());
  });
});
