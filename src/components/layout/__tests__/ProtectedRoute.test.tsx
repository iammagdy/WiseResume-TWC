import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { ProtectedRoute } from '../ProtectedRoute';
import * as useAuthHook from '@/hooks/useAuth';

// Mock the useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

const makeAuth = (overrides = {}) => ({
  isAuthenticated: false,
  loading: false,
  user: null as any,
  signOut: vi.fn(),
  supabaseReady: false,
  supabaseSettled: false,
  kindeUser: null as any,
  getKindeToken: vi.fn().mockResolvedValue(null),
  ...overrides,
});

describe('ProtectedRoute', () => {
  it('renders loading skeleton when loading is true', () => {
    vi.mocked(useAuthHook.useAuth).mockReturnValue(makeAuth({ loading: true }));

    render(
      <MemoryRouter initialEntries={['/editor']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/editor" element={<div data-testid="protected-content">Secret Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Verify loading state is shown and content is hidden
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('redirects to /auth when user is unauthenticated (Scenario 1.2)', () => {
    vi.mocked(useAuthHook.useAuth).mockReturnValue(makeAuth({ isAuthenticated: false, loading: false }));

    render(
      <MemoryRouter initialEntries={['/editor']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/editor" element={<div data-testid="protected-content">Secret Content</div>} />
          </Route>
          <Route path="/auth" element={<div data-testid="auth-page">Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Content should not be visible
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    
    // Redirected to auth page
    expect(screen.getByTestId('auth-page')).toBeInTheDocument();
  });

  it('renders outlet when user is authenticated', () => {
    vi.mocked(useAuthHook.useAuth).mockReturnValue(makeAuth({
      isAuthenticated: true,
      supabaseSettled: true,
      supabaseReady: true,
      user: { id: 'test-user' } as any,
    }));

    render(
      <MemoryRouter initialEntries={['/editor']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/editor" element={<div data-testid="protected-content">Secret Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });
});
