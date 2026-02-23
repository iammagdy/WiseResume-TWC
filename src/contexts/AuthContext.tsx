import React, { createContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/safeClient';
import { Capacitor } from '@capacitor/core';
import { migrateLocalKeysToServer } from '@/lib/migrateLocalKeys';
import { logAudit } from '@/lib/auditLogger';
import { runDailyCleanup } from '@/lib/dbCleanup';

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

// Eagerly start auth fetch at module load time so it runs in parallel with splash
const earlySessionPromise = supabase.auth.getSession().catch(() => ({ data: { session: null as Session | null } }));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  // Track the active user ID to prevent session hijacking from stale second sessions
  const activeUserIdRef = useRef<string | null>(null);
  // Track whether a user was previously authenticated (to detect unexpected sign-outs)
  const wasAuthenticatedRef = useRef<boolean>(false);
  // Track whether the current sign-out was user-initiated
  const userInitiatedSignOutRef = useRef<boolean>(false);

  useEffect(() => {
    let initialResolved = false;

    const resolveInitialLoad = (user: User | null, session: Session | null) => {
      if (!initialResolved) {
        initialResolved = true;
        // Signal auth ready — hide native splash screen immediately
        if (Capacitor.isNativePlatform()) {
          window.dispatchEvent(new CustomEvent('app:auth-ready'));
          hideSplashScreen();
        }
      }
      activeUserIdRef.current = user?.id ?? null;
      // Detect unexpected sign-out (session expired, force-logout from another device)
      if (!user && wasAuthenticatedRef.current && !userInitiatedSignOutRef.current) {
        window.dispatchEvent(new CustomEvent('app:session-expired'));
      }
      if (user) {
        wasAuthenticatedRef.current = true;
        userInitiatedSignOutRef.current = false;
        migrateLocalKeysToServer();
        runDailyCleanup();
        // Touch last_active_at — fire-and-forget, no UX impact if it fails
        supabase
          .from('profiles')
          .update({ last_active_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .then(() => {});
      }
      setState(prev => {
        if (prev.user?.id === user?.id && !prev.loading) {
          return prev;
        }
        return { user, session, loading: false };
      });
    };

    // Safety timeout: force loading=false after 3s, also hide splash
    const timeout = setTimeout(() => {
      if (!initialResolved) {
        console.warn('Auth session fetch timed out after 3s');
        hideSplashScreen();
        resolveInitialLoad(null, null);
      }
    }, 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const incomingUserId = session?.user?.id ?? null;

        // Always accept these events
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
          resolveInitialLoad(session?.user ?? null, session);
          return;
        }

        // For TOKEN_REFRESHED and other events, only accept if user ID matches
        if (activeUserIdRef.current && incomingUserId && incomingUserId !== activeUserIdRef.current) {
          console.warn('Ignored auth event from different user:', event, incomingUserId);
          return;
        }

        resolveInitialLoad(session?.user ?? null, session);
      }
    );

    // Use the eagerly-started session promise instead of a fresh call
    earlySessionPromise
      .then(({ data: { session } }) => {
        resolveInitialLoad(session?.user ?? null, session);
      })
      .catch(() => {
        console.warn('Failed to fetch auth session');
        hideSplashScreen();
        resolveInitialLoad(null, null);
      });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    logAudit('auth', 'signed_out');
    userInitiatedSignOutRef.current = true;
    wasAuthenticatedRef.current = false;
    activeUserIdRef.current = null;
    setState({ user: null, session: null, loading: false });
    await supabase.auth.signOut({ scope: 'local' });
  };

  const value = {
    ...state,
    signOut,
    isAuthenticated: !!state.user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
