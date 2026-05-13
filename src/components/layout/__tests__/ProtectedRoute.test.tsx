import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute } from '../ProtectedRoute';
import * as useAuthHook from '@/hooks/useAuth';
vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }));

type AuthOverrides = Partial<ReturnType<typeof makeAuth>>;
function makeAuth(overrides: AuthOverrides = {}) {
  return {
    isAuthenticated: false,
    isImpersonating: false,
    loading: false,
    user: null as unknown,
    signOut: vi.fn(),
    authReady: false,
    authSettled: false,
    appwriteUser: null,
    authAvailable: true,
    ...overrides,
  };
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

  it('renders the outlet when a real Appwrite user is authenticated', () => {
    vi.mocked(useAuthHook.useAuth).mockReturnValue(makeAuth({
      isAuthenticated: true,
      authSettled: true,
      authReady: true,
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
      isAuthenticated: true,
      isImpersonating: true,
      authSettled: true,
      authReady: true,
      user: { id: 'impersonated-user', email: 'target@example.com' },
    }));

    renderProtected();
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('auth-page')).not.toBeInTheDocument();
  });

  it('lets a fresh /act-as tab render the dashboard with no Appwrite session', () => {
    vi.mocked(useAuthHook.useAuth).mockReturnValue(makeAuth({
      isAuthenticated: true,
      isImpersonating: true,
      authSettled: true,
      authReady: true,
      user: { id: 'impersonated-user', email: 'target@example.com' },
      appwriteUser: null,
    }));

    renderProtected();
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('auth-page')).not.toBeInTheDocument();
  });
});
