import React, { createContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useUser, useSession as useClerkSession, useClerk } from '@clerk/clerk-react';
import { User, Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { migrateLocalKeysToServer } from '@/lib/migrateLocalKeys';
import { logAudit } from '@/lib/auditLogger';
import { runDailyCleanup } from '@/lib/dbCleanup';
import { EDGE_FUNCTIONS_URL, EDGE_FUNCTIONS_ANON_KEY } from '@/lib/supabaseConstants';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function hideSplashScreen() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch {
    // Plugin unavailable on web builds — ignore
  }
}

/**
 * Inner provider that relies on Clerk hooks.
 * Only rendered when ClerkProvider is guaranteed to be in the tree.
 */
function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { session: clerkSession, isLoaded: isSessionLoaded } = useClerkSession();
  const { signOut: clerkSignOut } = useClerk();

  const [splashHidden, setSplashHidden] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const provisionAttempted = useRef(false);
  const [provisionVersion, setProvisionVersion] = useState(0);

  const supabaseUuid = (clerkUser?.publicMetadata as Record<string, unknown> | undefined)?.supabaseUuid as string | undefined;

  const isLoaded = isUserLoaded && isSessionLoaded;
  const isAuthenticated = !!clerkUser && !!clerkSession && !!supabaseUuid;

  // Auto-provision: called when supabaseUuid is missing (new user) OR when the UUID
  // exists in Clerk metadata but the profile row is absent in the DB (UUID mismatch).
  // Pass forceReprovision=true to skip the "already provisioned" early-return in the function.
  useEffect(() => {
    if (!isLoaded || !clerkUser || provisionAttempted.current || provisioning) return;

    // If supabaseUuid is already set, the user is provisioned — skip entirely.
    // The get_clerk_user_id() DB function now reads the JWT claim directly,
    // so no DB verification call is needed. This prevents the infinite loop
    // when CLERK_SECRET_KEY points to the wrong Clerk environment (returning 403).
    if (supabaseUuid) {
      console.log('[Auth] supabaseUuid already present — skipping provision check');
      provisionAttempted.current = true;
      return;
    }

    // Only run provisioning for genuinely new users (no supabaseUuid yet).
    provisionAttempted.current = true;
    setProvisioning(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    (async () => {
      try {
        console.log('[Auth] Provisioning new user...');

        const res = await fetch(`${EDGE_FUNCTIONS_URL}/functions/v1/provision-clerk-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EDGE_FUNCTIONS_ANON_KEY,
          },
          body: JSON.stringify({ clerkUserId: clerkUser.id, forceReprovision: false }),
          signal: controller.signal,
        });

        if (!res.ok) {
          // Non-retryable error (e.g. 403 wrong Clerk env, 404, 500).
          // Log and give up — do NOT reset provisionAttempted so we don't loop.
          const body = await res.json().catch(() => ({}));
          console.error('[Auth] Provisioning returned', res.status, body);
          return;
        }

        const data = await res.json();
        if (data.supabaseUuid) {
          console.log('[Auth] Provisioned, reloading user metadata...');
          await clerkUser.reload();
          await new Promise(r => setTimeout(r, 500));
          setProvisionVersion(v => v + 1);
        } else {
          console.error('[Auth] Provisioning response missing supabaseUuid:', data);
        }
      } catch (e) {
        const err = e as Error;
        if (err.name === 'AbortError') {
          console.error('[Auth] Provisioning timed out');
          // Only retry on timeout for new users (supabaseUuid is null here)
          provisionAttempted.current = false;
        } else {
          // Network error — don't retry, log and move on
          console.error('[Auth] Provisioning network error:', err.message);
        }
      } finally {
        clearTimeout(timeout);
        setProvisioning(false);
      }
    })();

    return () => { clearTimeout(timeout); controller.abort(); };
  }, [isLoaded, clerkUser, supabaseUuid, provisioning]);

  const mappedUser: User | null = useMemo(() => {
    if (!clerkUser || !supabaseUuid) return null;
    return {
      id: supabaseUuid,
      email: clerkUser.primaryEmailAddress?.emailAddress || '',
      app_metadata: {},
      user_metadata: {
        full_name: clerkUser.fullName || '',
        clerk_id: clerkUser.id,
      },
      aud: 'authenticated',
      created_at: clerkUser.createdAt?.toISOString() || '',
    } as unknown as User;
  }, [clerkUser, supabaseUuid]);

  const mappedSession: Session | null = useMemo(() => {
    if (!clerkSession || !mappedUser) return null;
    return {
      access_token: '',
      refresh_token: '',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: mappedUser,
    } as unknown as Session;
  }, [clerkSession, mappedUser]);

  useEffect(() => {
    if (isLoaded && !provisioning && !splashHidden) {
      setSplashHidden(true);
      if (Capacitor.isNativePlatform()) {
        window.dispatchEvent(new CustomEvent('app:auth-ready'));
        hideSplashScreen();
      }
    }
  }, [isLoaded, provisioning, splashHidden]);

  useEffect(() => {
    if (!isAuthenticated || !mappedUser) return;

    migrateLocalKeysToServer();
    runDailyCleanup();

    // Use the global safeClient singleton (not the hook-based client) so the
    // Clerk "supabase" template token is guaranteed to be injected.
    // Drop the .eq() filter — RLS scopes the update to the current user automatically.
    import('@/integrations/supabase/safeClient').then(({ supabase: safeClient }) => {
      safeClient
        .from('profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('user_id', mappedUser.id)
        .then(({ error }) => {
          if (error) console.warn('[Auth] last_active_at update failed:', error.message);
        });
    });
  }, [isAuthenticated, mappedUser?.id]);

  const signOut = useCallback(async () => {
    logAudit('auth', 'signed_out');
    try {
      await clerkSignOut();
    } catch (e) {
      console.error('Sign-out failed:', e);
    }
  }, [clerkSignOut]);

  const value = useMemo<AuthContextType>(() => ({
    user: mappedUser,
    session: mappedSession,
    loading: !isLoaded || provisioning,
    signOut,
    isAuthenticated,
  }), [mappedUser, mappedSession, isLoaded, provisioning, signOut, isAuthenticated]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Public AuthProvider — wraps ClerkAuthProvider with a defensive error boundary
 * so that if ClerkProvider is ever absent the app doesn't crash.
 */
class ClerkGuardBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (error.message?.includes('ClerkProvider') || error.message?.includes('useUser')) {
      console.warn('AuthProvider: Clerk context unavailable, using unauthenticated fallback.');
    } else {
      throw error; // Re-throw non-Clerk errors
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

const unauthenticatedFallback: AuthContextType = {
  user: null,
  session: null,
  loading: false,
  signOut: async () => {},
  isAuthenticated: false,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const fallback = (
    <AuthContext.Provider value={unauthenticatedFallback}>
      {children}
    </AuthContext.Provider>
  );

  return (
    <ClerkGuardBoundary fallback={fallback}>
      <ClerkAuthProvider>{children}</ClerkAuthProvider>
    </ClerkGuardBoundary>
  );
}
