import { account as appwriteAccount, isAppwriteEnabled } from "@/lib/appwrite";
import React, { createContext, useEffect, useState, useMemo, useCallback, useRef, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSettingsStore } from '@/store/settingsStore';
import { logAudit } from '@/lib/auditLogger';
import { clearAllPersistedCaches } from '@/lib/persistedQueryCache';
import { clearAllCachedScores } from '@/hooks/useResumeScore';
import { clearAllEditorSessions } from '@/lib/editorSession';
import { setErrorBoundaryUserId } from '@/components/ErrorBoundary';
import {
  isImpersonating as isImpersonatingFn,
  getImpersonationState,
  subscribe as subscribeImpersonation,
} from '@/lib/impersonationStore';

export interface AppUser {
  id: string;
  email: string;
  name?: string;
  emailVerification: boolean;
}

export interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  isImpersonating: boolean;
  appwriteUser: any | null;
  authAvailable: boolean;
  authSettled: boolean;
  authReady: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const lastSeenUserIdRef = useRef<string | null>(null);

  const cachedUser = (() => {
    try {
      const raw = sessionStorage.getItem('wr_auth_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const [appwriteUser, setAppwriteUser] = useState<any>(cachedUser);
  const [appwriteLoading, setAppwriteLoading] = useState(!cachedUser);

  // Check Appwrite Session
  useEffect(() => {
    if (!isAppwriteEnabled) {
      setAppwriteLoading(false);
      return;
    }

    let settled = false;

    (async () => {
      try {
        const user = await appwriteAccount.get();
        if (!settled) {
          setAppwriteUser(user);
          setAppwriteLoading(false);
          settled = true;
          try {
            sessionStorage.setItem(
              'wr_auth_user',
              JSON.stringify({ $id: user.$id, email: user.email, name: user.name, emailVerification: user.emailVerification })
            );
          } catch {}
        }
      } catch (err) {
        if (!settled) {
          setAppwriteUser(null);
          setAppwriteLoading(false);
          settled = true;
          try { sessionStorage.removeItem('wr_auth_user'); } catch {}
        }
      }
    })();

    const timeout = setTimeout(() => {
      if (!settled) {
        setAppwriteUser(null);
        setAppwriteLoading(false);
        settled = true;
      }
    }, 5_000);

    return () => {
      settled = true;
      clearTimeout(timeout);
    };
  }, []);

  useSyncExternalStore(
    subscribeImpersonation,
    () => {
      const s = getImpersonationState();
      return `${s.token ?? ''}|${s.userId ?? ''}|${s.expiresAt ?? ''}`;
    },
    () => '',
  );

  const impersonating = isImpersonatingFn();
  const impersonationState = getImpersonationState();

  const loading = appwriteLoading;
  const isAuthenticated = impersonating || !!appwriteUser;

  const user: AppUser | null = useMemo(() => {
    if (impersonating && impersonationState.userId) {
      return {
        id: impersonationState.userId,
        email: impersonationState.email ?? '',
        name: undefined,
        emailVerification: true,
      };
    }

    if (appwriteUser) {
      return {
        id: appwriteUser.$id,
        email: appwriteUser.email,
        name: appwriteUser.name,
        emailVerification: appwriteUser.emailVerification === true,
      };
    }
    return null;
  }, [appwriteUser, impersonating, impersonationState.userId, impersonationState.email]);

  useEffect(() => {
    const currentId = user?.id ?? null;
    setErrorBoundaryUserId(currentId);
    if (lastSeenUserIdRef.current !== currentId) {
      const previousId = lastSeenUserIdRef.current;
      lastSeenUserIdRef.current = currentId;
      // Only clear caches on actual user switch or sign-out,
      // not on the initial transition from null to authenticated.
      if (previousId !== null && previousId !== currentId) {
        queryClient.clear();
        clearAllPersistedCaches();
        clearAllCachedScores();
        clearAllEditorSessions();
      }
    }
  }, [user?.id, queryClient]);

  const signOut = useCallback(async () => {
    logAudit('auth', 'signed_out');
    queryClient.clear();
    clearAllPersistedCaches();
    clearAllCachedScores();
    clearAllEditorSessions();
    lastSeenUserIdRef.current = null;
    setAppwriteUser(null);
    try { sessionStorage.removeItem('wr_auth_user'); } catch {}
    useSettingsStore.getState().resetUserSettings();
    
    try {
      await appwriteAccount.deleteSession('current');
    } catch (e) {}
    window.location.replace('/');
  }, [queryClient]);

  const authSettled = !appwriteLoading;
  const authReady = !appwriteLoading && (impersonating || !!appwriteUser);

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    signOut,
    isAuthenticated,
    isImpersonating: impersonating,
    appwriteUser,
    authAvailable: isAppwriteEnabled,
    authSettled,
    authReady,
  }), [user, loading, signOut, isAuthenticated, impersonating, appwriteUser, authSettled, authReady]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
