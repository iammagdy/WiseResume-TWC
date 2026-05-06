import React, { createContext, useEffect, useState, useMemo, useCallback, useRef, useSyncExternalStore } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { useQueryClient } from '@tanstack/react-query';
import { useSettingsStore } from '@/store/settingsStore';
import { logAudit } from '@/lib/auditLogger';
import { clearAllPersistedCaches } from '@/lib/persistedQueryCache';
import { clearAllCachedScores } from '@/hooks/useResumeScore';
import { clearAllEditorSessions } from '@/lib/editorSession';
import { exchangeToken, clearBridge, isReady, getUserId, getToken as getBridgeToken, setKindeTokenGetter, setCurrentKindeSub, getCachedKindeSub, setUserProfile, getStoredEmail, getStoredName } from '@/lib/supabaseBridge';
import { supabase } from '@/integrations/supabase/safeClient';
import {
  isImpersonating as isImpersonatingFn,
  getImpersonationState,
  subscribe as subscribeImpersonation,
} from '@/lib/impersonationStore';

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
  /**
   * True when an admin is currently impersonating another user. The `user`
   * exposed by this context reflects the impersonated identity in that case;
   * the admin's underlying Kinde session is still alive in the background.
   */
  isImpersonating: boolean;
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
  isImpersonating: false,
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

  // Subscribe to the impersonation store so any change (start / exit /
  // expiry) re-renders the provider and every consumer of useAuth().
  // useSyncExternalStore guarantees React batches the update correctly.
  useSyncExternalStore(
    subscribeImpersonation,
    () => {
      const s = getImpersonationState();
      // Snapshot must be a stable primitive so React can compare it.
      return `${s.token ?? ''}|${s.userId ?? ''}|${s.expiresAt ?? ''}`;
    },
    () => '',
  );

  const impersonating = isImpersonatingFn();
  const impersonationState = getImpersonationState();

  const loading = kindeLoading;
  // Impersonation is a first-class authenticated state. When an admin claims
  // an impersonation OTP — either same-tab via Act As or via the /act-as
  // claim flow in a fresh tab where Kinde isn't signed in — they must be
  // treated as authenticated so ProtectedRoute lets them through.
  const isAuthenticated = kindeAuthenticated || impersonating;

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
    // Impersonation always wins — if an admin has claimed an OTP we must
    // surface the impersonated identity, even when the admin's own Kinde
    // session is also active in the background.
    if (impersonating && impersonationState.userId) {
      return {
        id: impersonationState.userId,
        email: impersonationState.email ?? '',
        name: undefined,
      };
    }
    if (!kindeUser) {
      // DEV-ONLY FALLBACK: In the Replit preview iframe, third-party cookies
      // from auth.thewise.cloud are blocked, so Kinde cannot silently restore
      // its session after a preview reload. If the bridge still holds a valid
      // localStorage token with cached profile data, reconstruct the user from
      // it so developers don't have to sign in on every preview restart.
      // This path is never active in production (import.meta.env.DEV is false).
      if (import.meta.env.DEV && bridgeReady) {
        const bridgeUserId = getUserId();
        const storedEmail = getStoredEmail();
        if (bridgeUserId && storedEmail) {
          return {
            id: bridgeUserId,
            email: storedEmail,
            name: getStoredName() ?? undefined,
          };
        }
      }
      return null;
    }
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
  }, [kindeUser, bridgeReady, impersonating, impersonationState.userId, impersonationState.email]);

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

    // Persist the user's display profile into the bridge state so that in dev
    // mode the user object can be reconstructed from localStorage after a
    // preview reload where Kinde cannot silently restore its session.
    const displayName = [kindeUser.givenName, kindeUser.familyName].filter(Boolean).join(' ') || null;
    setUserProfile(kindeUser.email ?? '', displayName);

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
        // Apply a generous timeout to the Kinde token getter. In some
        // environments (e.g. cold tab restore, slow networks) the Kinde SDK
        // performs a background network call to verify the session that
        // legitimately takes 5–10 s. The previous 5 s cap fired before that
        // call settled and dumped the user into degraded mode even though
        // auth was healthy. 15 s is long enough to cover legitimate Kinde
        // round-trips while still bailing on a true hang.
        const kindeToken = await Promise.race([
          getKindeToken(),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 15000)),
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
          // Push the freshly-minted bridge JWT into the Realtime client so
          // long-lived WebSocket subscriptions keep authenticating after the
          // 50-min refresh. Without this the server eventually rejects new
          // subscribe attempts with the stale token (CHANNEL_ERROR) and
          // useMe falls back to polling for the rest of the session.
          const fresh = getBridgeToken();
          if (fresh) {
            try { supabase.realtime.setAuth(fresh); } catch { /* WS may not be initialised */ }
          }
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
          const ready = isReady();
          // Recover from a previously-failed bridge once Kinde returns a
          // usable token (e.g. degraded mode set during a transient timeout).
          if (ready) {
            if (!bridgeReady) setBridgeReady(true);
            if (bridgeFailed) setBridgeFailed(false);
            // Mirror the post-refresh setAuth so Realtime subscriptions
            // re-initialised after a tab-resume use the fresh token.
            const fresh = getBridgeToken();
            if (fresh) {
              try { supabase.realtime.setAuth(fresh); } catch { /* WS may not be initialised */ }
            }
          }
        }
      } catch (err) {
        console.error('[AuthContext] Visibility-triggered bridge refresh failed:', err);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [kindeAuthenticated, bridgeReady, bridgeFailed, getKindeToken]);

  // Hide splash screen when auth is resolved
  useEffect(() => {
    if (!loading && !splashHidden) {
      setSplashHidden(true);
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
    isImpersonating: impersonating,
    // While impersonating we treat the session as "ready" regardless of the
    // Kinde→Supabase bridge state — the impersonation token attached by
    // safeClient/edgeFunctions is the source of truth for those requests.
    supabaseReady: bridgeReady || impersonating,
    supabaseSettled: bridgeReady || bridgeFailed || impersonating,
    kindeUser: kindeUser ?? null,
    getKindeToken,
    authAvailable: true,
  }), [user, loading, signOut, isAuthenticated, impersonating, bridgeReady, bridgeFailed, kindeUser, getKindeToken]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
