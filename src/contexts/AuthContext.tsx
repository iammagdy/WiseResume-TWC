import { account as appwriteAccount, isAppwriteEnabled } from "@/lib/appwrite";
import React, { createContext, useEffect, useState, useMemo, useCallback, useRef, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSettingsStore } from '@/store/settingsStore';
import { logAudit } from '@/lib/auditLogger';
import { clearAllPersistedCaches } from '@/lib/persistedQueryCache';
import { clearAllCachedScores } from '@/hooks/useResumeScore';
import { clearAllEditorSessions } from '@/lib/editorSession';
import { clearPlanCache } from '@/lib/planCache';
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
  refreshSession: () => Promise<AppUser | null>;
  isAuthenticated: boolean;
  isImpersonating: boolean;
  appwriteUser: any | null;
  authAvailable: boolean;
  /** True after the first Appwrite account.get() (or failure) this page load. */
  sessionValidated: boolean;
  authSettled: boolean;
  authReady: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const lastSeenUserIdRef = useRef<string | null>(null);

  const [appwriteUser, setAppwriteUser] = useState<any>(null);
  const [appwriteLoading, setAppwriteLoading] = useState(isAppwriteEnabled);
  const [sessionValidated, setSessionValidated] = useState(!isAppwriteEnabled);

  const persistSessionUser = useCallback((user: { $id: string; email?: string; name?: string; emailVerification?: boolean } | null) => {
    try {
      if (!user?.$id) {
        sessionStorage.removeItem('wr_auth_user');
        return;
      }
      sessionStorage.setItem(
        'wr_auth_user',
        JSON.stringify({
          $id: user.$id,
          email: user.email,
          name: user.name,
          emailVerification: user.emailVerification,
        }),
      );
    } catch {
      // ignore quota / private mode
    }
  }, []);

  const refreshSession = useCallback(async (): Promise<AppUser | null> => {
    if (!isAppwriteEnabled) return null;
    try {
      const live = await appwriteAccount.get();
      setAppwriteUser(live);
      persistSessionUser(live);
      return {
        id: live.$id,
        email: live.email,
        name: live.name,
        emailVerification: live.emailVerification === true,
      };
    } catch {
      setAppwriteUser(null);
      persistSessionUser(null);
      return null;
    } finally {
      setAppwriteLoading(false);
      setSessionValidated(true);
    }
  }, [persistSessionUser]);

  // Always confirm session with Appwrite — never trust sessionStorage for route guards.
  useEffect(() => {
    if (!isAppwriteEnabled) return;
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (!isAppwriteEnabled || !sessionValidated) return;
    const onFocus = () => {
      void refreshSession();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [sessionValidated, refreshSession]);

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
        clearPlanCache();
      }
    }
  }, [user?.id, queryClient]);

  const signOut = useCallback(async () => {
    logAudit('auth', 'signed_out');
    queryClient.clear();
    clearAllPersistedCaches();
    clearAllCachedScores();
    clearAllEditorSessions();
    clearPlanCache();
    lastSeenUserIdRef.current = null;
    setAppwriteUser(null);
    persistSessionUser(null);
    useSettingsStore.getState().resetUserSettings();
    
    try {
      await appwriteAccount.deleteSession('current');
    } catch (e) {}
    window.location.replace('/');
  }, [queryClient, persistSessionUser]);

  const authSettled = sessionValidated && !appwriteLoading;
  const authReady = authSettled && (impersonating || !!appwriteUser);

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    signOut,
    refreshSession,
    isAuthenticated,
    isImpersonating: impersonating,
    appwriteUser,
    authAvailable: isAppwriteEnabled,
    sessionValidated,
    authSettled,
    authReady,
  }), [user, loading, signOut, refreshSession, isAuthenticated, impersonating, appwriteUser, sessionValidated, authSettled, authReady]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
