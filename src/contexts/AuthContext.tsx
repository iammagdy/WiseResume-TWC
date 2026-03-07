import React, { createContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useUser, useSession as useClerkSession, useClerk } from '@clerk/clerk-react';
import { User, Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { migrateLocalKeysToServer } from '@/lib/migrateLocalKeys';
import { logAudit } from '@/lib/auditLogger';
import { runDailyCleanup } from '@/lib/dbCleanup';
import { useClerkSupabaseClient } from '@/lib/clerkSupabase';
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
  const supabase = useClerkSupabaseClient();

  const [splashHidden, setSplashHidden] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const provisionAttempted = useRef(false);
  const [provisionVersion, setProvisionVersion] = useState(0);

  const supabaseUuid = (clerkUser?.publicMetadata as Record<string, unknown> | undefined)?.supabaseUuid as string | undefined;

  const isLoaded = isUserLoaded && isSessionLoaded;
  const isAuthenticated = !!clerkUser && !!clerkSession && !!supabaseUuid;

  // Auto-provision supabaseUuid if missing, or force-reprovision if supabaseUuid exists
  // but points to a profile that doesn't exist in the DB (UUID mismatch scenario).
  useEffect(() => {
    // Always attempt provisioning if supabaseUuid is missing
    // For existing UUID: only trigger once per session via provisionAttempted ref
    if (!isLoaded || !clerkUser || provisionAttempted.current || provisioning) return;
    // If UUID is present, we still try once to verify — but only if not already done
    if (supabaseUuid && provisionAttempted.current) return;

    provisionAttempted.current = true;
    setProvisioning(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    (async () => {
      try {
        console.log('[Auth] supabaseUuid missing, provisioning...');
        const res = await fetch(`${EDGE_FUNCTIONS_URL}/functions/v1/provision-clerk-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EDGE_FUNCTIONS_ANON_KEY,
          },
          body: JSON.stringify({ clerkUserId: clerkUser.id }),
          signal: controller.signal,
        });

        const data = await res.json();
        if (res.ok && data.supabaseUuid) {
          console.log('[Auth] Provisioned, reloading user metadata...');
          await clerkUser.reload();
          // Small delay to let Clerk hooks pick up updated metadata
          await new Promise(r => setTimeout(r, 500));
          setProvisionVersion(v => v + 1);
        } else {
          console.error('[Auth] Provisioning failed:', data);
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError') {
          console.error('[Auth] Provisioning timed out');
        } else {
          console.error('[Auth] Provisioning error:', e);
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
    if (!isAuthenticated || !mappedUser || !supabase) return;

    migrateLocalKeysToServer();
    runDailyCleanup();

    supabase
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('user_id', mappedUser.id)
      .then(() => {});
  }, [isAuthenticated, mappedUser?.id, supabase]);

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
