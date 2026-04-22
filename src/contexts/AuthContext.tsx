import React, { createContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { useQueryClient } from '@tanstack/react-query';
import { useSettingsStore } from '@/store/settingsStore';
import { logAudit } from '@/lib/auditLogger';
import { clearAllPersistedCaches } from '@/lib/persistedQueryCache';
import { clearAllCachedScores } from '@/hooks/useResumeScore';
import { clearAllEditorSessions } from '@/lib/editorSession';
import { exchangeToken, clearBridge, isReady, getUserId, setKindeTokenGetter, setCurrentKindeSub, getCachedKindeSub } from '@/lib/supabaseBridge';

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
  /**
   * True once the bridge exchange has resolved — either successfully
   * (supabaseReady=true) or with a definitive failure (supabaseReady=false).
   * Use this instead of supabaseReady to unblock UI that should show even
   * when Supabase is unavailable (e.g. dev environments without the bridge).
   */
  supabaseSettled: boolean;
  /** Raw Kinde user object for advanced usage */
  kindeUser: ReturnType<typeof useKindeAuth>['user'];
  /** Get the current Kinde access token */
  getKindeToken: () => Promise<string | null>;
  /**
   * False when Kinde env vars are missing/invalid and auth is running in
   * degraded mode. Auth actions (sign-in, register, etc.) will not work.
   */
  authAvailable: boolean;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEGRADED_AUTH_VALUE: AuthContextType = {
  user: null,
  loading: false,
  signOut: async () => {},
  isAuthenticated: false,
  supabaseReady: false,
  supabaseSettled: true,
  kindeUser: null,
  getKindeToken: async () => null,
  authAvailable: false,
};

/**
 * Fallback auth provider used when Kinde configuration is missing or invalid.
 * Supplies a safe no-op auth state so the rest of the app tree can render
 * without crashing, but no authenticated features will work.
 */
export function DegradedAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={DEGRADED_AUTH_VALUE}>
      {children}
    </AuthContext.Provider>
  );
}

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

  const queryClient = useQueryClient();
  const lastSeenUserIdRef = useRef<string | null>(null);
  const prevKindeSubRef = useRef<string | null>(null);

  const [splashHidden, setSplashHidden] = useState(false);
  const [bridgeReady, setBridgeReady] = useState(false);
  const [bridgeFailed, setBridgeFailed] = useState(false);

  const loading = kindeLoading;
  const isAuthenticated = kindeAuthenticated;

  // Bind the bridge to the currently-signed-in Kinde user on every render.
  // This MUST run before any consumer reads from the bridge so that a stale
  // cached identity (from a previous account in the same tab) is dropped
  // before `getUserId()` / `getToken()` can hand it back. The call is a
  // simple module-level assignment and is safe to invoke during render.
  setCurrentKindeSub(kindeUser?.id ?? null);

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

  // Derive a simple user object from Kinde
  // IMPORTANT: user.id MUST be a valid UUID from the bridge, never the raw Kinde ID
  // (kp_xxx format) which causes Postgres "invalid input syntax for type uuid" errors.
  const user: KindeAppUser | null = useMemo(() => {
    if (!kindeUser) return null;
    const bridgeUserId = getUserId();
    if (!bridgeUserId) return null;
    // Defence-in-depth: never expose a userId whose cached Kinde sub does
    // not match the currently authenticated Kinde user. `getUserId()`
    // already gates on this via `setCurrentKindeSub` above, but we re-check
    // here so a future refactor of the bridge can't reintroduce the leak.
    const cachedSub = getCachedKindeSub();
    if (cachedSub && cachedSub !== kindeUser.id) return null;
    return {
      id: bridgeUserId,
      email: kindeUser.email ?? '',
      name: [kindeUser.givenName, kindeUser.familyName].filter(Boolean).join(' ') || undefined,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kindeUser, bridgeReady]);

  // Exchange Kinde token for Supabase JWT when user is authenticated.
  // NOTE: We intentionally do NOT gate on kindeLoading here. In some environments
  // (e.g. Replit dev) Kinde's session verification can take 30–60 s while
  // kindeAuthenticated/kindeUser are already available. Waiting would block the
  // bridge — and therefore the whole UI — for that entire duration.
  useEffect(() => {
    // Always register the getter so refreshTokenIfNeeded() can call it at any time.
    setKindeTokenGetter(getKindeToken);

    const currentSub = kindeUser?.id ?? null;
    const prevSub = prevKindeSubRef.current;
    const subChanged = prevSub !== currentSub;
    prevKindeSubRef.current = currentSub;

    if (!kindeAuthenticated || !kindeUser) {
      // Not authenticated yet — use any cached bridge token to stay unblocked.
      if (isReady()) setBridgeReady(true);
      return;
    }

    let cancelled = false;

    // Whenever the authenticated Kinde user changes (A→B, A→null→B, etc.)
    // and the bridge does not have a valid token for the *new* identity,
    // flip readiness off so dashboard hooks render their loading state
    // instead of firing queries with a half-set identity while the new
    // exchange is in flight.
    if (subChanged && !isReady()) {
      setBridgeReady(false);
      setBridgeFailed(false);
    } else if (isReady()) {
      // Valid cached token for the current identity — unblock the UI.
      // The async IIFE below still runs to refresh in the background.
      setBridgeReady(true);
    }

    (async () => {
      try {
        // Apply a short timeout to the Kinde token getter. In some environments
        // (e.g. Replit dev) the Kinde SDK can hang for 30–60 s while it makes
        // a background network call to verify the session. If it hangs, we
        // immediately settle as "failed" so the UI shows instead of blocking.
        const kindeToken = await Promise.race([
          getKindeToken(),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 5000)),
        ]);
        if (cancelled) return;
        if (!kindeToken) {
          console.warn('[AuthContext] Kinde token unavailable (timed out or null) — degraded mode');
          setBridgeFailed(true);
          return;
        }

        await exchangeToken(kindeToken);
        if (!cancelled) {
          const ready = isReady();
          setBridgeReady(ready);
          if (!ready) {
            // Exchange resolved but produced no token — definitively failed
            console.warn('[AuthContext] Bridge settled with no token — degraded mode (UI will still show)');
            setBridgeFailed(true);
          }
        }
      } catch (err) {
        console.error('[AuthContext] Bridge exchange failed:', err);
        if (!cancelled) setBridgeFailed(true);
      }
    })();

    return () => { cancelled = true; };
  }, [kindeAuthenticated, kindeUser, getKindeToken]);

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

  // Proactively refresh the bridge token when the tab becomes visible again
  // after being hidden, preventing stale tokens on return from idle.
  useEffect(() => {
    if (!kindeAuthenticated) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const kindeToken = await getKindeToken();
        if (kindeToken) {
          await exchangeToken(kindeToken);
          if (!bridgeReady) setBridgeReady(isReady());
        }
      } catch (err) {
        console.error('[AuthContext] Visibility-triggered bridge refresh failed:', err);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [kindeAuthenticated, bridgeReady, getKindeToken]);

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

  // When the bridged Supabase user id changes (initial sign-in, account switch,
  // or sign-out), dump every cached query so the next account never sees the
  // previous account's resumes/applications/etc. without waiting for the
  // post-logout hard redirect to land.
  useEffect(() => {
    const currentId = user?.id ?? null;
    if (lastSeenUserIdRef.current !== currentId) {
      const previousId = lastSeenUserIdRef.current;
      lastSeenUserIdRef.current = currentId;
      // Skip the very first transition from null → null on cold boot.
      if (previousId !== null || currentId !== null) {
        queryClient.clear();
        clearAllPersistedCaches();
        clearAllCachedScores();
        clearAllEditorSessions();
      }
    }
  }, [user?.id, queryClient]);

  const signOut = useCallback(async () => {
    logAudit('auth', 'signed_out');
    // Drop every cached query first so any in-flight components rendering
    // during the logout transition can't briefly show the previous user's data.
    queryClient.clear();
    clearAllPersistedCaches();
    clearAllCachedScores();
    clearAllEditorSessions();
    clearBridge();
    setBridgeReady(false);
    setBridgeFailed(false);
    lastSeenUserIdRef.current = null;
    useSettingsStore.getState().resetUserSettings();
    try {
      await kindeLogout();
    } catch (e) {
      console.error('Kinde sign-out failed:', e);
    }
    // Ensure the user lands on the landing page regardless of whether
    // Kinde's post-logout redirect succeeds (it fails in dev/Replit because
    // the dev domain is not in Kinde's allowed logout redirect URIs).
    window.location.replace('/');
  }, [kindeLogout, queryClient]);

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    signOut,
    isAuthenticated,
    supabaseReady: bridgeReady,
    supabaseSettled: bridgeReady || bridgeFailed,
    kindeUser: kindeUser ?? null,
    getKindeToken,
    authAvailable: true,
  }), [user, loading, signOut, isAuthenticated, bridgeReady, bridgeFailed, kindeUser, getKindeToken]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
