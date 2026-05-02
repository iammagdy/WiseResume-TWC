import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * AuthContext-level coverage for impersonation as a first-class auth state.
 *
 * The earlier ProtectedRoute tests validate the *consumer* behavior with a
 * mocked `useAuth`. These tests mount the *real* `AuthProvider` and drive
 * impersonation through the real `impersonationStore` so a regression in
 * AuthContext's own `useSyncExternalStore` wiring or the
 * `isAuthenticated = kindeAuthenticated || impersonating` derivation would
 * fail loudly.
 *
 * Two scenarios from the Task #35 brief:
 *   1. Same-tab Act As: Kinde session live, admin starts impersonation -
 *      `isAuthenticated` stays true, surfaced user reflects target.
 *   2. Fresh /act-as tab: NO Kinde session, impersonation pre-populated in
 *      sessionStorage at module load - `isAuthenticated` is true purely on
 *      the back of the persisted impersonation token, with no Kinde
 *      redirect required.
 */

// ── Module mocks ─────────────────────────────────────────────────────────
// Mock @/hooks/useAuth to bypass the global setup mock (which short-circuits
// AuthContext entirely). We need the real AuthContext export.
vi.mock('@/hooks/useAuth', async () => {
  const { useContext } = await import('react');
  const { AuthContext } = await import('@/contexts/AuthContext');
  return {
    useAuth: () => {
      const ctx = useContext(AuthContext);
      if (!ctx) throw new Error('useAuth requires AuthProvider');
      return ctx;
    },
  };
});

// Default to "Kinde signed out". Individual tests override per-case.
const mockKindeAuth = vi.fn(() => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  logout: vi.fn(),
  getToken: vi.fn().mockResolvedValue(null),
}));
vi.mock('@kinde-oss/kinde-auth-react', () => ({
  useKindeAuth: () => mockKindeAuth(),
}));

vi.mock('@/lib/supabaseBridge', () => ({
  exchangeToken: vi.fn().mockResolvedValue(undefined),
  clearBridge: vi.fn(),
  isReady: vi.fn(() => false),
  getUserId: vi.fn(() => null),
  setKindeTokenGetter: vi.fn(),
  setCurrentKindeSub: vi.fn(),
  getCachedKindeSub: vi.fn(() => null),
}));

vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: { getState: () => ({ resetUserSettings: vi.fn() }) },
}));
vi.mock('@/lib/auditLogger', () => ({ logAudit: vi.fn() }));
vi.mock('@/lib/persistedQueryCache', () => ({ clearAllPersistedCaches: vi.fn() }));
vi.mock('@/hooks/useResumeScore', () => ({ clearAllCachedScores: vi.fn() }));
vi.mock('@/lib/editorSession', () => ({ clearAllEditorSessions: vi.fn() }));

// ── Helpers ──────────────────────────────────────────────────────────────
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import {
  startImpersonation,
  exitImpersonation,
} from '@/lib/impersonationStore';

function AuthProbe() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="is-authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="is-impersonating">{String(auth.isImpersonating)}</span>
      <span data-testid="user-id">{auth.user?.id ?? ''}</span>
      <span data-testid="user-email">{auth.user?.email ?? ''}</span>
      <span data-testid="supabase-ready">{String(auth.supabaseReady)}</span>
    </div>
  );
}

function renderWithProvider() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

// ── Tests ────────────────────────────────────────────────────────────────
describe('AuthContext — impersonation as first-class auth', () => {
  beforeEach(() => {
    exitImpersonation();
    sessionStorage.clear();
    mockKindeAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      logout: vi.fn(),
      getToken: vi.fn().mockResolvedValue(null),
    });
  });

  it('reports unauthenticated when neither Kinde nor impersonation is active', () => {
    renderWithProvider();
    expect(screen.getByTestId('is-authenticated').textContent).toBe('false');
    expect(screen.getByTestId('is-impersonating').textContent).toBe('false');
  });

  it('flips isAuthenticated to true and surfaces the impersonated user when an admin starts impersonating', () => {
    // Admin's Kinde session IS live in this scenario (same-tab Act As).
    mockKindeAuth.mockReturnValue({
      user: { id: 'kinde_admin_xyz', email: 'admin@example.com', givenName: 'A', familyName: 'D' } as any,
      isAuthenticated: true,
      isLoading: false,
      logout: vi.fn(),
      getToken: vi.fn().mockResolvedValue('admin-kinde-token'),
    });

    renderWithProvider();
    expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
    expect(screen.getByTestId('is-impersonating').textContent).toBe('false');

    act(() => {
      startImpersonation(
        'IMPERSONATION_JWT',
        'impersonated-user-uuid',
        'target@example.com',
        Date.now() + 60_000,
        false,
      );
    });

    expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
    expect(screen.getByTestId('is-impersonating').textContent).toBe('true');
    // Surfaced user MUST be the impersonated identity, not the admin.
    expect(screen.getByTestId('user-id').textContent).toBe('impersonated-user-uuid');
    expect(screen.getByTestId('user-email').textContent).toBe('target@example.com');
    // While impersonating, supabaseReady is true regardless of bridge state.
    expect(screen.getByTestId('supabase-ready').textContent).toBe('true');
  });

  it('exits impersonation cleanly via the store and unflips isImpersonating', () => {
    mockKindeAuth.mockReturnValue({
      user: { id: 'kinde_admin_xyz', email: 'admin@example.com' } as any,
      isAuthenticated: true,
      isLoading: false,
      logout: vi.fn(),
      getToken: vi.fn().mockResolvedValue('admin-kinde-token'),
    });
    renderWithProvider();
    act(() => {
      startImpersonation('IMP_JWT', 'imp-uuid', 'target@example.com', Date.now() + 60_000, false);
    });
    expect(screen.getByTestId('is-impersonating').textContent).toBe('true');

    act(() => { exitImpersonation(); });

    expect(screen.getByTestId('is-impersonating').textContent).toBe('false');
  });
});

// ── Fresh-tab bootstrap test ─────────────────────────────────────────────
// This case can NOT share module state with the suite above because
// impersonationStore reads sessionStorage exactly once at module load.
// We seed sessionStorage, reset modules, and dynamically re-import everything
// so the store bootstraps with the persisted state.

describe('AuthContext — fresh /act-as tab bootstraps from sessionStorage', () => {
  beforeEach(() => {
    vi.resetModules();
    sessionStorage.clear();
  });

  it('renders as authenticated with no Kinde session when impersonation token is persisted', async () => {
    // Seed the same payload `startImpersonation(..., newTab=true)` would write.
    sessionStorage.setItem('wr_imp_session', JSON.stringify({
      token: 'PERSISTED_IMP_JWT',
      userId: 'persisted-user-uuid',
      email: 'fresh-tab@example.com',
      expiresAt: Date.now() + 5 * 60_000,
    }));

    // Re-establish mocks AFTER resetModules so the freshly-imported
    // AuthContext picks them up.
    vi.doMock('@/hooks/useAuth', async () => {
      const { useContext } = await import('react');
      const { AuthContext } = await import('@/contexts/AuthContext');
      return {
        useAuth: () => {
          const ctx = useContext(AuthContext);
          if (!ctx) throw new Error('useAuth requires AuthProvider');
          return ctx;
        },
      };
    });
    vi.doMock('@kinde-oss/kinde-auth-react', () => ({
      useKindeAuth: () => ({
        user: null,
        isAuthenticated: false,   // NO Kinde session in this tab
        isLoading: false,
        logout: vi.fn(),
        getToken: vi.fn().mockResolvedValue(null),
      }),
    }));
    vi.doMock('@/lib/supabaseBridge', () => ({
      exchangeToken: vi.fn().mockResolvedValue(undefined),
      clearBridge: vi.fn(),
      isReady: vi.fn(() => false),
      getUserId: vi.fn(() => null),
      setKindeTokenGetter: vi.fn(),
      setCurrentKindeSub: vi.fn(),
      getCachedKindeSub: vi.fn(() => null),
    }));
    vi.doMock('@/store/settingsStore', () => ({
      useSettingsStore: { getState: () => ({ resetUserSettings: vi.fn() }) },
    }));
    vi.doMock('@/lib/auditLogger', () => ({ logAudit: vi.fn() }));
    vi.doMock('@/lib/persistedQueryCache', () => ({ clearAllPersistedCaches: vi.fn() }));
    vi.doMock('@/hooks/useResumeScore', () => ({ clearAllCachedScores: vi.fn() }));
    vi.doMock('@/lib/editorSession', () => ({ clearAllEditorSessions: vi.fn() }));

    const { AuthProvider: FreshAuthProvider } = await import('@/contexts/AuthContext');
    const { useAuth: freshUseAuth } = await import('@/hooks/useAuth');
    const React = await import('react');
    const { QueryClient: QC, QueryClientProvider: QCP } = await import('@tanstack/react-query');

    function Probe() {
      const a = freshUseAuth();
      return React.createElement('div', null,
        React.createElement('span', { 'data-testid': 'fresh-auth' }, String(a.isAuthenticated)),
        React.createElement('span', { 'data-testid': 'fresh-imp' }, String(a.isImpersonating)),
        React.createElement('span', { 'data-testid': 'fresh-user' }, a.user?.id ?? ''),
        React.createElement('span', { 'data-testid': 'fresh-email' }, a.user?.email ?? ''),
      );
    }

    const qc = new QC({ defaultOptions: { queries: { retry: false } } });
    render(
      React.createElement(QCP, { client: qc },
        React.createElement(FreshAuthProvider, null, React.createElement(Probe)),
      ),
    );

    expect(screen.getByTestId('fresh-auth').textContent).toBe('true');
    expect(screen.getByTestId('fresh-imp').textContent).toBe('true');
    expect(screen.getByTestId('fresh-user').textContent).toBe('persisted-user-uuid');
    expect(screen.getByTestId('fresh-email').textContent).toBe('fresh-tab@example.com');
  });
});
