import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute } from '../ProtectedRoute';
import * as useAuthHook from '@/hooks/useAuth';
import * as useMeHook from '@/hooks/useMe';

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('@/hooks/useMe', () => ({ useMe: vi.fn() }));

type AuthOverrides = Partial<ReturnType<typeof makeAuth>>;
function makeAuth(overrides: AuthOverrides = {}) {
  return {
    isAuthenticated: false,
    isImpersonating: false,
    loading: false,
    user: null as unknown,
    signOut: vi.fn(),
    supabaseReady: false,
    supabaseSettled: false,
    kindeUser: null as unknown,
    getKindeToken: vi.fn().mockResolvedValue(null),
    authAvailable: true,
    ...overrides,
  };
}

function makeMe(profile: Record<string, unknown> | null = { email_verified: true }) {
  return {
    data: profile === null ? undefined : { profile },
    isLoading: false,
  } as unknown as ReturnType<typeof useMeHook.useMe>;
}

function renderProtected() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/editor']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/editor" element={<div data-testid="protected-content">Secret Content</div>} />
          </Route>
          <Route path="/auth" element={<div data-testid="auth-page">Login Page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.mocked(useMeHook.useMe).mockReturnValue(makeMe());
  });

  it('hides protected content while auth is loading', () => {
    vi.mocked(useAuthHook.useAuth).mockReturnValue(makeAuth({ loading: true }));
    renderProtected();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('redirects to /auth when the user is unauthenticated', () => {
    vi.mocked(useAuthHook.useAuth).mockReturnValue(makeAuth({ isAuthenticated: false }));
    renderProtected();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('auth-page')).toBeInTheDocument();
  });

  it('renders the outlet when a real Kinde user is authenticated and verified', () => {
    vi.mocked(useAuthHook.useAuth).mockReturnValue(makeAuth({
      isAuthenticated: true,
      supabaseSettled: true,
      supabaseReady: true,
      user: { id: 'real-user' },
    }));
    renderProtected();
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  // ── Task #35 / #42: impersonation as first-class auth ──────────────────
  // Two scenarios from the task brief: same-tab Act As, and incognito tab
  // bootstrapped by /act-as. In both, ProtectedRoute must let the dashboard
  // render WITHOUT a Kinde redirect AND without the email-verified gate.

  it('lets the dashboard render when an admin is impersonating in the same tab', () => {
    vi.mocked(useAuthHook.useAuth).mockReturnValue(makeAuth({
      // Both true: admin's Kinde session is live AND impersonation is claimed.
      isAuthenticated: true,
      isImpersonating: true,
      supabaseSettled: true,
      supabaseReady: true,
      user: { id: 'impersonated-user', email: 'target@example.com' },
    }));
    // Profile says NOT verified — the gate must still be skipped while
    // impersonating, otherwise the admin would be bounced to /verify-email.
    vi.mocked(useMeHook.useMe).mockReturnValue(makeMe({ email_verified: false, contact_email: 'target@example.com' }));

    renderProtected();
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('auth-page')).not.toBeInTheDocument();
  });

  it('lets a fresh /act-as tab render the dashboard with no Kinde session', () => {
    // Kinde is NOT signed in (kindeAuthenticated would be false), but the
    // impersonation OTP has been claimed — AuthContext flips isAuthenticated
    // to true off the back of impersonation alone.
    vi.mocked(useAuthHook.useAuth).mockReturnValue(makeAuth({
      isAuthenticated: true,         // because impersonating
      isImpersonating: true,
      supabaseSettled: true,
      supabaseReady: true,            // bridge bypassed while impersonating
      user: { id: 'impersonated-user', email: 'target@example.com' },
      kindeUser: null,
    }));
    vi.mocked(useMeHook.useMe).mockReturnValue(makeMe({ email_verified: false }));

    renderProtected();
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('auth-page')).not.toBeInTheDocument();
  });
});
