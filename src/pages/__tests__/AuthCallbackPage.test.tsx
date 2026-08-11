import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { mockNavigate, mockLocation } from '@/test/mocks/router';
import AuthCallbackPage from '../AuthCallbackPage';
import { upsertProfileIdentity } from '@/lib/profileSeed';
import { useAuth } from '@/hooks/useAuth';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/profileSeed', () => ({
  upsertProfileIdentity: vi.fn().mockResolvedValue('profile-123'),
}));

describe('AuthCallbackPage Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.pathname = '/';
  });

  it('performs session refresh, seeds profile identity on success, and redirects to dashboard', async () => {
    mockLocation.pathname = '/auth/callback';
    const mockRefreshSession = vi.fn().mockResolvedValue({
      id: 'user-abc',
      email: 'user@example.com',
      name: 'John Doe',
    });
    vi.mocked(useAuth).mockReturnValue({
      refreshSession: mockRefreshSession,
    } as any);

    renderWithProviders(<AuthCallbackPage />);

    await waitFor(() => {
      expect(mockRefreshSession).toHaveBeenCalledTimes(1);
      expect(upsertProfileIdentity).toHaveBeenCalledWith({
        userId: 'user-abc',
        email: 'user@example.com',
        fullName: 'John Doe',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('redirects to English auth page on session failure', async () => {
    mockLocation.pathname = '/auth/callback';
    const mockRefreshSession = vi.fn().mockResolvedValue(null);
    vi.mocked(useAuth).mockReturnValue({
      refreshSession: mockRefreshSession,
    } as any);

    renderWithProviders(<AuthCallbackPage />, { initialPath: '/auth/callback' });

    await waitFor(() => {
      expect(mockRefreshSession).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/auth?error=oauth_session_completion', { replace: true });
    });
  });

  it('redirects to Arabic auth page on session failure when path is prefixed with /ar', async () => {
    mockLocation.pathname = '/ar/auth/callback';
    const mockRefreshSession = vi.fn().mockResolvedValue(null);
    vi.mocked(useAuth).mockReturnValue({
      refreshSession: mockRefreshSession,
    } as any);

    renderWithProviders(<AuthCallbackPage />, { initialPath: '/ar/auth/callback' });

    await waitFor(() => {
      expect(mockRefreshSession).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/ar/auth?error=oauth_session_completion', { replace: true });
    });
  });

  it('shows a recovery state when authentication succeeds but profile setup fails', async () => {
    mockLocation.pathname = '/auth/callback';
    vi.mocked(useAuth).mockReturnValue({
      refreshSession: vi.fn().mockResolvedValue({
        id: 'user-abc', email: 'user@example.com', name: 'John Doe',
      }),
    } as any);
    vi.mocked(upsertProfileIdentity)
      .mockRejectedValueOnce(new Error('profiles unavailable'))
      .mockResolvedValueOnce('profile-123');

    renderWithProviders(<AuthCallbackPage />);

    expect(await screen.findByText('You’re signed in')).toBeInTheDocument();
    expect(screen.getByText(/LinkedIn sign-in worked/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry setup' }));
    await waitFor(() => {
      expect(upsertProfileIdentity).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });
});
