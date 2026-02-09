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
    // Set up auth state listener BEFORE getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const user = session?.user ?? null;
        setState({ user, session, loading: false });
        cacheSession(user, session);
      }
    );

    // Get initial session (will update cache if different)
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setState({ user, session, loading: false });
      cacheSession(user, session);
    });

    return () => {
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
