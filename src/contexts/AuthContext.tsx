import React, { createContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/safeClient';
import { Capacitor } from '@capacitor/core';
import { migrateLocalKeysToServer } from '@/lib/migrateLocalKeys';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  // Track the active user ID to prevent session hijacking from stale second sessions
  const activeUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let initialResolved = false;

    const resolveInitialLoad = (user: User | null, session: Session | null) => {
      if (!initialResolved) {
        initialResolved = true;
        // Signal that auth is ready — native splash screen can hide
        if (Capacitor.isNativePlatform()) {
          window.dispatchEvent(new CustomEvent('app:auth-ready'));
        }
      }
      activeUserIdRef.current = user?.id ?? null;
      if (user) migrateLocalKeysToServer();
      setState(prev => {
        if (prev.user?.id === user?.id && !prev.loading) {
          return prev;
        }
        return { user, session, loading: false };
      });
    };

    // Safety timeout: force loading=false after 5s
    const timeout = setTimeout(() => {
      if (!initialResolved) {
        console.warn('Auth session fetch timed out after 5s');
        resolveInitialLoad(null, null);
      }
    }, 5000);

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

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        resolveInitialLoad(session?.user ?? null, session);
      })
      .catch(() => {
        console.warn('Failed to fetch auth session');
        resolveInitialLoad(null, null);
      });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
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
