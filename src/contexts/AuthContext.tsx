import React, { createContext, useEffect, useState, useMemo, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { useSettingsStore } from '@/store/settingsStore';
import { logAudit } from '@/lib/auditLogger';

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
  /** Raw Kinde user object for advanced usage */
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
  const {
    user: kindeUser,
    isAuthenticated: kindeAuthenticated,
    isLoading: kindeLoading,
    logout: kindeLogout,
  } = useKindeAuth();

  const [splashHidden, setSplashHidden] = useState(false);

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
    kindeUser: kindeUser ?? null,
  }), [user, loading, signOut, isAuthenticated, kindeUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
