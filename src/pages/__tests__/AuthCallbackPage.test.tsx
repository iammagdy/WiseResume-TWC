import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
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
      expect(mockNavigate).toHaveBeenCalledWith('/auth?error=oauth_failed', { replace: true });
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
      expect(mockNavigate).toHaveBeenCalledWith('/ar/auth?error=oauth_failed', { replace: true });
    });
  });
});
