import React, { createContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useUser, useSession as useClerkSession, useClerk } from '@clerk/clerk-react';
import { User, Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { migrateLocalKeysToServer } from '@/lib/migrateLocalKeys';
import { logAudit } from '@/lib/auditLogger';
import { runDailyCleanup } from '@/lib/dbCleanup';
import { useClerkSupabaseClient } from '@/lib/clerkSupabase';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { session: clerkSession, isLoaded: isSessionLoaded } = useClerkSession();
  const { signOut: clerkSignOut } = useClerk();
  const supabase = useClerkSupabaseClient();

  const [splashHidden, setSplashHidden] = useState(false);

  // Derive the supabase UUID from Clerk public metadata
  const supabaseUuid = (clerkUser?.publicMetadata as Record<string, unknown> | undefined)?.supabaseUuid as string | undefined;

  const isLoaded = isUserLoaded && isSessionLoaded;
  const isAuthenticated = !!clerkUser && !!clerkSession && !!supabaseUuid;

  // Build a minimal User-shaped object for consumers
  const mappedUser: User | null = useMemo(() => {
    if (!clerkUser || !supabaseUuid) return null;
    // Create a minimal object that satisfies consumers using user.id and user.email
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

  // Build a minimal Session-shaped object
  const mappedSession: Session | null = useMemo(() => {
    if (!clerkSession || !mappedUser) return null;
    return {
      access_token: '', // Not used — Clerk token is fetched via getClerkSupabaseToken()
      refresh_token: '',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: mappedUser,
    } as unknown as Session;
  }, [clerkSession, mappedUser]);

  // Hide splash screen when auth is resolved
  useEffect(() => {
    if (isLoaded && !splashHidden) {
      setSplashHidden(true);
      if (Capacitor.isNativePlatform()) {
        window.dispatchEvent(new CustomEvent('app:auth-ready'));
        hideSplashScreen();
      }
    }
  }, [isLoaded, splashHidden]);

  // Side effects when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !mappedUser || !supabase) return;

    migrateLocalKeysToServer();
    runDailyCleanup();

    // Touch last_active_at — fire-and-forget
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
    loading: !isLoaded,
    signOut,
    isAuthenticated,
  }), [mappedUser, mappedSession, isLoaded, signOut, isAuthenticated]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
