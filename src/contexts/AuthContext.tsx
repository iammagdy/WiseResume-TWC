import React, { createContext, useEffect, useState } from 'react';
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

  useEffect(() => {
    let initialResolved = false;

    const resolveInitialLoad = (user: User | null, session: Session | null) => {
      if (!initialResolved) {
        initialResolved = true;
      }
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

    // Set up auth state listener BEFORE getting session
    // This continues to fire for sign-in, sign-out, token refresh, etc.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        resolveInitialLoad(session?.user ?? null, session);
      }
    );

    // Get initial session
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
    await supabase.auth.signOut();
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
