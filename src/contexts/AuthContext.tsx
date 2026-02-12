import React, { createContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/safeClient';

const SESSION_CACHE_KEY = 'sb-auth-session-cache';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

// Try to get cached session for instant hydration
function getCachedSession(): { user: User; session: Session } | null {
  try {
    const cached = localStorage.getItem(SESSION_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Check if session is still valid (not expired)
      if (parsed.session?.expires_at && parsed.session.expires_at * 1000 > Date.now()) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

// Cache session for faster startup
function cacheSession(user: User | null, session: Session | null) {
  try {
    if (user && session) {
      localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({ user, session }));
    } else {
      localStorage.removeItem(SESSION_CACHE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Pre-hydrate from cache for instant UI
  const [state, setState] = useState<AuthState>(() => {
    const cached = getCachedSession();
    if (cached) {
      return { user: cached.user, session: cached.session, loading: false };
    }
    return { user: null, session: null, loading: true };
  });

  // Track the active user ID to prevent session hijacking from stale second sessions
  const activeUserIdRef = useRef<string | null>(
    getCachedSession()?.user?.id ?? null
  );

  useEffect(() => {
    let initialResolved = false;

    const resolveInitialLoad = (user: User | null, session: Session | null) => {
      if (!initialResolved) {
        initialResolved = true;
      }
      activeUserIdRef.current = user?.id ?? null;
      setState({ user, session, loading: false });
      cacheSession(user, session);
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
    localStorage.removeItem(SESSION_CACHE_KEY);
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
