import React, { createContext, useEffect, useState, useMemo, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { useSettingsStore } from '@/store/settingsStore';
import { logAudit } from '@/lib/auditLogger';
import { exchangeToken, clearBridge, isReady } from '@/lib/supabaseBridge';

export interface KindeAppUser {
  id: string;
  email: string;
  name?: string;
}

export interface AuthContextType {
  user: KindeAppUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  /** Whether the Supabase token bridge is ready (data queries will work) */
  supabaseReady: boolean;
  /** Raw Kinde user object for advanced usage */
  kindeUser: ReturnType<typeof useKindeAuth>['user'];
  /** Get the current Kinde access token */
  getKindeToken: () => Promise<string | null>;
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
  const {
    user: kindeUser,
    isAuthenticated: kindeAuthenticated,
    isLoading: kindeLoading,
    logout: kindeLogout,
    getToken,
  } = useKindeAuth();

  const [splashHidden, setSplashHidden] = useState(false);
  const [bridgeReady, setBridgeReady] = useState(false);

  const loading = kindeLoading;
  const isAuthenticated = kindeAuthenticated;

  // Derive a simple user object from Kinde
  const user: KindeAppUser | null = useMemo(() => {
    if (!kindeUser) return null;
    return {
      id: kindeUser.id ?? '',
      email: kindeUser.email ?? '',
      name: [kindeUser.givenName, kindeUser.familyName].filter(Boolean).join(' ') || undefined,
    };
  }, [kindeUser]);

  // Get Kinde access token safely
  const getKindeToken = useCallback(async (): Promise<string | null> => {
    try {
      if (!getToken) return null;
      const token = await getToken();
      return token ?? null;
    } catch {
      return null;
    }
  }, [getToken]);

  // Exchange Kinde token for Supabase JWT when user is authenticated
  useEffect(() => {
    if (!kindeAuthenticated || !kindeUser || kindeLoading) {
      setBridgeReady(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const kindeToken = await getKindeToken();
        if (!kindeToken || cancelled) return;

        await exchangeToken(kindeToken);
        if (!cancelled) {
          setBridgeReady(isReady());
        }
      } catch (err) {
        console.error('[AuthContext] Bridge exchange failed:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [kindeAuthenticated, kindeUser, kindeLoading, getKindeToken]);

  // Refresh bridge token every 50 minutes
  useEffect(() => {
    if (!bridgeReady || !kindeAuthenticated) return;

    const interval = setInterval(async () => {
      try {
        const kindeToken = await getKindeToken();
        if (kindeToken) {
          await exchangeToken(kindeToken);
          setBridgeReady(isReady());
        }
      } catch (err) {
        console.error('[AuthContext] Bridge refresh failed:', err);
      }
    }, 50 * 60 * 1000); // 50 minutes

    return () => clearInterval(interval);
  }, [bridgeReady, kindeAuthenticated, getKindeToken]);

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

  const signOut = useCallback(async () => {
    logAudit('auth', 'signed_out');
    clearBridge();
    setBridgeReady(false);
    try {
      await kindeLogout();
    } catch (e) {
      console.error('Kinde sign-out failed:', e);
    }
    useSettingsStore.getState().resetSettings();
  }, [kindeLogout]);

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    signOut,
    isAuthenticated,
    supabaseReady: bridgeReady,
    kindeUser: kindeUser ?? null,
    getKindeToken,
  }), [user, loading, signOut, isAuthenticated, bridgeReady, kindeUser, getKindeToken]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
