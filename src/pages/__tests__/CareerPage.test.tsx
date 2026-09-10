/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CareerPage from '../CareerPage';
import { useCareerAssessment } from '@/hooks/useCareerAssessment';
import { mockNavigate } from '@/test/mocks/router';

vi.mock('@/i18n/LocaleProvider', () => ({
  useLocale: () => ({ t: (_k: string, fb: string) => fb || _k, locale: 'en' }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com' },
  })),
}));

vi.mock('@/hooks/useCareerAssessment', () => ({
  useCareerAssessment: vi.fn(),
  useCareerMutations: () => ({
    createAssessment: { mutateAsync: vi.fn() },
    toggleMilestone: { mutate: vi.fn() },
  }),
}));

vi.mock('@/hooks/useResumes', () => ({
  useResumes: vi.fn(() => ({
    data: [{ id: 'res-1', title: 'Software Engineer', is_primary: true }],
  })),
  dbToResumeData: vi.fn((r: any) => r),
}));

vi.mock('@/hooks/useAIAction', () => ({
  useAIAction: () => ({
    execute: vi.fn(),
  }),
}));

vi.mock('@/hooks/useRedactedResume', () => ({
  useRedactedResume: vi.fn((r: any) => r),
}));

vi.mock('@/lib/haptics', () => ({
  haptics: {
    success: vi.fn(),
    medium: vi.fn(),
    light: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/rateLimiter', () => ({
  checkAIRateLimit: () => ({ allowed: true }),
}));

describe('CareerPage States', () => {
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeletons while career assessment is loading', () => {
    vi.mocked(useCareerAssessment).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: mockRefetch,
    } as any);

    const { container } = render(<CareerPage />);
    // Skeleton elements are rendered when loading
    const skeletons = container.querySelectorAll('.h-32, .h-48, .h-64');
    expect(skeletons.length).toBe(3);
    expect(screen.queryByText('Unable to load career assessment')).not.toBeInTheDocument();
  });

  it('renders error state card with AlertCircle icon, title, description, and action buttons', () => {
    vi.mocked(useCareerAssessment).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    } as any);

    render(<CareerPage />);

    expect(screen.getByText('Unable to load career assessment')).toBeInTheDocument();
    expect(
      screen.getByText('Something went wrong while fetching your career data. Please try again.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
  });

  it('calls refetch when Retry button is clicked in error state', () => {
    vi.mocked(useCareerAssessment).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    } as any);

    render(<CareerPage />);

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('navigates to /dashboard when Back to Dashboard button is clicked in error state', () => {
    vi.mocked(useCareerAssessment).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    } as any);

    render(<CareerPage />);

    const backButton = screen.getByRole('button', { name: /back to dashboard/i });
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('renders empty quiz prompt when there is no existing assessment', () => {
    vi.mocked(useCareerAssessment).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    } as any);

    render(<CareerPage />);

    expect(screen.getByText('Discover Your Career Path')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start assessment/i })).toBeInTheDocument();
    expect(screen.queryByText('Unable to load career assessment')).not.toBeInTheDocument();
  });
});
