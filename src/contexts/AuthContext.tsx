import React, { createContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [splashHidden, setSplashHidden] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }
    );

    // THEN get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);
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

  // Post-auth side effects
  useEffect(() => {
    if (!user || !session) return;

    migrateLocalKeysToServer();
    runDailyCleanup();

    supabase
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .then(({ error }) => {
        if (error) console.warn('[Auth] last_active_at update failed:', error.message);
      });
  }, [user?.id, session?.access_token]);

  const signOut = useCallback(async () => {
    logAudit('auth', 'signed_out');
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Sign-out failed:', e);
    }
    useSettingsStore.getState().resetSettings();
  }, []);

  const isAuthenticated = !!user && !!session;

  const value = useMemo<AuthContextType>(() => ({
    user,
    session,
    loading,
    signOut,
    isAuthenticated,
  }), [user, session, loading, signOut, isAuthenticated]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
