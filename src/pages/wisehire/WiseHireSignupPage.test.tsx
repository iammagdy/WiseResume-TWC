import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNavigate } from '@/test/mocks/router';

const { invokeWisehireAccess, useAuth } = vi.hoisted(() => ({
  invokeWisehireAccess: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock('@/lib/wisehire/wisehireAccessClient', () => ({ invokeWisehireAccess }));
vi.mock('@/hooks/useAuth', () => ({ useAuth }));
vi.mock('@/lib/security/sensitiveUrlSanitizer', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/security/sensitiveUrlSanitizer')>();
  return { ...original, removeSensitiveParamsFromCurrentAddressBar: vi.fn(() => true) };
});

import WiseHireSignupPage from './WiseHireSignupPage';

function renderPage(initialEntry = '/wisehire/signup?invite=MiXeD-token&email=recruiter%40example.com') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <WiseHireSignupPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('WiseHire signup page', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    invokeWisehireAccess.mockReset();
    useAuth.mockReset();
    mockNavigate.mockReset();
  });

  it('validates the invitation and preserves auth intent for a new account', async () => {
    useAuth.mockReturnValue({ isAuthenticated: false, loading: false, user: null });
    invokeWisehireAccess.mockResolvedValueOnce({
      data: { valid: true, recipient_email: 'recruiter@example.com', expires_at: '2099-01-01T00:00:00.000Z' },
      error: null,
    });
    renderPage();

    expect(await screen.findByText(/Invitation confirmed for/i)).toHaveTextContent('recruiter@example.com');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    expect(mockNavigate.mock.calls[0][0]).toContain('/auth?');
    expect(mockNavigate.mock.calls[0][0]).toContain('mode=signup');
    expect(mockNavigate.mock.calls[0][0]).toContain('redirect=%2Fwisehire%2Fsignup');
    expect(localStorage.getItem('wh_invite_token')).toContain('MiXeD-token');
  });

  it('completes setup only with the authenticated invitation email', async () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { id: 'user-1', name: 'Recruiter', email: 'recruiter@example.com', emailVerification: true },
    });
    invokeWisehireAccess
      .mockResolvedValueOnce({
        data: { valid: true, recipient_email: 'recruiter@example.com', expires_at: '2099-01-01T00:00:00.000Z' },
        error: null,
      })
      .mockResolvedValueOnce({ data: { success: true }, error: null });
    renderPage();

    await screen.findByText(/Invitation confirmed for/i);
    fireEvent.change(screen.getByLabelText('Company name'), { target: { value: 'Example Co' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create WiseHire workspace' }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/wisehire/onboarding', { replace: true }));
    expect(invokeWisehireAccess).toHaveBeenLastCalledWith('complete-signup', expect.objectContaining({
      invite_token: 'MiXeD-token',
      company_name: 'Example Co',
    }));
    expect(localStorage.getItem('wh_invite_token')).toBeNull();
  });

  it('blocks a signed-in account that does not own the invitation', async () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { id: 'user-2', email: 'other@example.com', emailVerification: true },
    });
    invokeWisehireAccess.mockResolvedValueOnce({
      data: { valid: true, recipient_email: 'recruiter@example.com', expires_at: '2099-01-01T00:00:00.000Z' },
      error: null,
    });
    renderPage();

    expect(await screen.findByText(/Signed in as other@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create WiseHire workspace' })).toBeDisabled();
  });
});
