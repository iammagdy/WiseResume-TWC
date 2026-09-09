import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { mockNavigate, mockLocation } from '@/test/mocks/router';
import AuthPage from '../AuthPage';
import { toast } from 'sonner';
import { LocaleProvider } from '@/i18n/LocaleProvider';

const { mockCreateEmailPasswordSession } = vi.hoisted(() => ({
  mockCreateEmailPasswordSession: vi.fn(),
}));

vi.mock('@/lib/appwrite', () => ({
  account: {
    createEmailPasswordSession: mockCreateEmailPasswordSession,
    create: vi.fn(),
    get: vi.fn().mockResolvedValue({ $id: 'user-abc' }),
    createOAuth2Session: vi.fn(),
  },
  ID: { unique: () => 'unique-id' },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: false,
    loading: false,
    refreshSession: vi.fn(),
  })),
}));

vi.mock('sonner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('sonner')>();
  return {
    ...actual,
    toast: {
      ...actual.toast,
      error: vi.fn(),
      success: vi.fn(),
    },
  };
});

describe('AuthPage OAuth Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateEmailPasswordSession.mockResolvedValue({ $id: 'session-1' });
    mockLocation.pathname = '/auth';
  });

  it('submits the current email and password, trimming email only', async () => {
    renderWithProviders(<AuthPage />);

    fireEvent.change(screen.getByPlaceholderText('you@email.com'), {
      target: { value: '  user@example.com  ' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: '  p@ss word  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockCreateEmailPasswordSession).toHaveBeenCalledWith('user@example.com', '  p@ss word  ');
    });
  });

  it('keeps invalid credentials generic and does not expose the raw error', async () => {
    mockCreateEmailPasswordSession.mockRejectedValueOnce({
      code: 401,
      type: 'user_invalid_credentials',
      message: 'password mismatch for user@example.com',
    });
    renderWithProviders(<AuthPage />);

    fireEvent.change(screen.getByPlaceholderText('you@email.com'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password.');
    });
    expect(screen.queryByText(/password mismatch|user@example\.com/)).not.toBeInTheDocument();
  });

  it.each([
    [new TypeError('Failed to fetch'), 'We could not reach the sign-in service.'],
    [{ code: 429, message: 'Too many requests' }, 'Too many sign-in attempts.'],
    [{ code: 503, message: 'service unavailable' }, 'The sign-in service is temporarily unavailable.'],
    [{ code: 'unexpected_internal_code', message: 'internal secret details' }, 'Sign-in is temporarily unavailable.'],
  ])('classifies safe non-credential failures (%s)', async (failure, expectedMessage) => {
    mockCreateEmailPasswordSession.mockRejectedValueOnce(failure);
    renderWithProviders(<AuthPage />);

    fireEvent.change(screen.getByPlaceholderText('you@email.com'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(expectedMessage);
    });
    expect(screen.queryByText(/internal secret details|password mismatch/)).not.toBeInTheDocument();
  });

  it('handles duplicate account/email conflict error in English', async () => {
    renderWithProviders(<AuthPage />, {
      initialPath: '/auth?error=user_already_exists',
    });

    const expectedMsg = 'This email is already registered with WiseResume. Please sign in using your email and password, or reset your password if needed.';
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expectedMsg);
      expect(mockNavigate).toHaveBeenCalledWith('/auth', { replace: true });
    });
  });

  it('handles duplicate account/email conflict error in Arabic', async () => {
    renderWithProviders(
      <LocaleProvider initialLocale="ar">
        <AuthPage />
      </LocaleProvider>,
      {
        initialPath: '/auth?error=duplicate',
      }
    );

    const expectedMsg = 'البريد الإلكتروني ده مسجل بالفعل في WiseResume. سجّل الدخول بالإيميل والباسورد، أو استخدم استعادة كلمة المرور إذا احتجت.';
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expectedMsg);
      expect(mockNavigate).toHaveBeenCalledWith('/auth', { replace: true });
    });
  });

  it('handles scope/setup errors in English', async () => {
    renderWithProviders(<AuthPage />, {
      initialPath: '/auth?error=unauthorized_scope_error',
    });

    const expectedMsg = 'LinkedIn sign-in is not fully enabled yet. Please try again later or sign in with email and password.';
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expectedMsg);
    });
  });

  it('handles cancelled/denied errors in English', async () => {
    renderWithProviders(<AuthPage />, {
      initialPath: '/auth?error=access_denied',
    });

    const expectedMsg = 'LinkedIn sign-in was cancelled. You can try again or sign in with email and password.';
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expectedMsg);
    });
  });

  it('handles fallback generic errors in English', async () => {
    renderWithProviders(<AuthPage />, {
      initialPath: '/auth?error=unknown_internal_appwrite_error',
    });

    const expectedMsg = 'LinkedIn sign-in failed. Please try again or sign in with email and password.';
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expectedMsg);
    });
  });

  it('handles URL-encoded JSON objects from Appwrite safely', async () => {
    const rawErrorPayload = encodeURIComponent(JSON.stringify({
      message: 'A user with the same email already exists',
      type: 'user_already_exists',
      code: 409,
    }));

    renderWithProviders(<AuthPage />, {
      initialPath: `/auth?error=${rawErrorPayload}`,
    });

    const expectedMsg = 'This email is already registered with WiseResume. Please sign in using your email and password, or reset your password if needed.';
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expectedMsg);
    });
  });
});

describe('AuthPage Signup Plan Intent Resolution and Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockLocation.pathname = '/auth';
  });

  it('unit test: resolveSignupPlanIntent handles all shapes correctly', async () => {
    const { resolveSignupPlanIntent, displayPlanLabel } = await import('../AuthPage');

    // Missing / empty / non-string
    expect(resolveSignupPlanIntent(null)).toBeNull();
    expect(resolveSignupPlanIntent(undefined)).toBeNull();
    expect(resolveSignupPlanIntent('')).toBeNull();
    expect(resolveSignupPlanIntent('   ')).toBeNull();
    expect(resolveSignupPlanIntent({})).toBeNull();
    expect(resolveSignupPlanIntent({ plan: 'pro' })).toBeNull();
    expect(resolveSignupPlanIntent(['pro'])).toBeNull();

    // Malformed strings / object stringification
    expect(resolveSignupPlanIntent('[object Object]')).toBeNull();
    expect(resolveSignupPlanIntent('free')).toBeNull();
    expect(resolveSignupPlanIntent('unknown_tier')).toBeNull();
    expect(resolveSignupPlanIntent('{"id":"pro"}')).toBeNull();

    // Valid Pro
    expect(resolveSignupPlanIntent('pro')).toBe('pro');
    expect(resolveSignupPlanIntent('PRO')).toBe('pro');
    expect(resolveSignupPlanIntent('  pro  ')).toBe('pro');
    expect(displayPlanLabel('pro')).toBe('Pro');

    // Valid Ultimate / Premium
    expect(resolveSignupPlanIntent('premium')).toBe('premium');
    expect(resolveSignupPlanIntent('PREMIUM')).toBe('premium');
    expect(resolveSignupPlanIntent('ultimate')).toBe('premium');
    expect(resolveSignupPlanIntent('  ULTIMATE  ')).toBe('premium');
    expect(displayPlanLabel('premium')).toBe('Ultimate');
  });

  it('normal signup without plan parameter renders NO plan enrollment notice', async () => {
    renderWithProviders(<AuthPage />, {
      initialPath: '/auth?mode=signup',
    });

    expect(screen.queryByText(/signing up for the/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\[object Object\]/i)).not.toBeInTheDocument();
  });

  it('explicit Pro signup renders human-readable Pro plan notice', async () => {
    renderWithProviders(<AuthPage />, {
      initialPath: '/auth?mode=signup&plan=pro',
    });

    expect(screen.getByText(/You're signing up for the/i)).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.queryByText(/\[object Object\]/i)).not.toBeInTheDocument();
  });

  it('explicit Ultimate signup (via ultimate or premium) renders human-readable Ultimate plan notice', async () => {
    renderWithProviders(<AuthPage />, {
      initialPath: '/auth?mode=signup&plan=ultimate',
    });

    expect(screen.getByText(/You're signing up for the/i)).toBeInTheDocument();
    expect(screen.getByText('Ultimate')).toBeInTheDocument();
    expect(screen.queryByText(/\[object Object\]/i)).not.toBeInTheDocument();
  });

  it('malformed [object Object] in plan parameter renders NO plan notice and never displays [object Object]', async () => {
    sessionStorage.setItem('signup_plan_intent', '[object Object]');
    renderWithProviders(<AuthPage />, {
      initialPath: '/auth?mode=signup&plan=[object%20Object]',
    });

    expect(screen.queryByText(/signing up for the/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\[object Object\]/i)).not.toBeInTheDocument();
    expect(sessionStorage.getItem('signup_plan_intent')).toBeNull();
  });
});
