import React, { createContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { supabase } from '@/integrations/supabase/safeClient';
import { migrateLocalKeysToServer } from '@/lib/migrateLocalKeys';
import { useSettingsStore } from '@/store/settingsStore';
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
  /** Kinde user object — available when logged in via Kinde (Google). Null for email/password users. */
  kindeUser: ReturnType<typeof useKindeAuth>['user'];
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function hideSplashScreen() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch {
    // Plugin unavailable on web builds
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // --- Supabase session state ---
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseLoading, setSupabaseLoading] = useState(true);
  const [splashHidden, setSplashHidden] = useState(false);

  // --- Kinde auth state ---
  const {
    user: kindeUser,
    isAuthenticated: kindeAuthenticated,
    isLoading: kindeLoading,
    logout: kindeLogout,
  } = useKindeAuth();

  // Combined loading: wait for both providers to resolve
  const loading = supabaseLoading || kindeLoading;

  // Authenticated if either source says yes
  const isAuthenticated = kindeAuthenticated || (!!supabaseUser && !!session);

  // Expose supabase user when available (for data queries); may be null for Kinde-only users
  const user = supabaseUser;

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setSupabaseUser(newSession?.user ?? null);
        setSupabaseLoading(false);
      }
    );

    // THEN get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setSupabaseUser(initialSession?.user ?? null);
      setSupabaseLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Hide splash screen when auth is resolved
  useEffect(() => {
    if (!loading && !splashHidden) {
      setSplashHidden(true);
      if (Capacitor.isNativePlatform()) {
        window.dispatchEvent(new CustomEvent('app:auth-ready'));
        hideSplashScreen();
      }
    }
  }, [loading, splashHidden]);

  // Post-auth side effects (only when Supabase session exists)
  useEffect(() => {
    if (!supabaseUser || !session) return;

    migrateLocalKeysToServer();
    runDailyCleanup();

    supabase
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('user_id', supabaseUser.id)
      .then(({ error }) => {
        if (error) console.warn('[Auth] last_active_at update failed:', error.message);
      });
  }, [supabaseUser?.id, session?.access_token]);

  const signOut = useCallback(async () => {
    logAudit('auth', 'signed_out');

    // Sign out from both providers
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Supabase sign-out failed:', e);
    }

    try {
      await kindeLogout();
    } catch (e) {
      console.error('Kinde sign-out failed:', e);
    }

    useSettingsStore.getState().resetSettings();
  }, [kindeLogout]);

  const value = useMemo<AuthContextType>(() => ({
    user,
    session,
    loading,
    signOut,
    isAuthenticated,
    kindeUser: kindeUser ?? null,
  }), [user, session, loading, signOut, isAuthenticated, kindeUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
