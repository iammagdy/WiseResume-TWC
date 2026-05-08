import { account as appwriteAccount, isAppwriteEnabled } from "@/lib/appwrite";
import React, { createContext, useEffect, useState, useMemo, useCallback, useRef, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSettingsStore } from '@/store/settingsStore';
import { logAudit } from '@/lib/auditLogger';
import { clearAllPersistedCaches } from '@/lib/persistedQueryCache';
import { clearAllCachedScores } from '@/hooks/useResumeScore';
import { clearAllEditorSessions } from '@/lib/editorSession';
import {
  isImpersonating as isImpersonatingFn,
  getImpersonationState,
  subscribe as subscribeImpersonation,
} from '@/lib/impersonationStore';

export interface AppUser {
  id: string;
  email: string;
  name?: string;
}

export interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  isImpersonating: boolean;
  appwriteUser: any | null;
  authAvailable: boolean;
  supabaseSettled: boolean;
  supabaseReady: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const lastSeenUserIdRef = useRef<string | null>(null);

  const [appwriteUser, setAppwriteUser] = useState<any>(null);
  const [appwriteLoading, setAppwriteLoading] = useState(true);

  // Check Appwrite Session
  useEffect(() => {
    if (!isAppwriteEnabled) {
      setAppwriteLoading(false);
      return;
    }
    
    (async () => {
      try {
        const user = await appwriteAccount.get();
        setAppwriteUser(user);
      } catch (err) {
        setAppwriteUser(null);
      } finally {
        setAppwriteLoading(false);
      }
    })();
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
      };
    }

    if (appwriteUser) {
      return {
        id: appwriteUser.$id,
        email: appwriteUser.email,
        name: appwriteUser.name,
      };
    }
    return null;
  }, [appwriteUser, impersonating, impersonationState.userId, impersonationState.email]);

  useEffect(() => {
    const currentId = user?.id ?? null;
    if (lastSeenUserIdRef.current !== currentId) {
      const previousId = lastSeenUserIdRef.current;
      lastSeenUserIdRef.current = currentId;
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
    queryClient.clear();
    clearAllPersistedCaches();
    clearAllCachedScores();
    clearAllEditorSessions();
    lastSeenUserIdRef.current = null;
    setAppwriteUser(null);
    useSettingsStore.getState().resetUserSettings();
    
    try {
      await appwriteAccount.deleteSession('current');
    } catch (e) {}
    window.location.replace('/');
  }, [queryClient]);

  const supabaseSettled = !appwriteLoading;
  const supabaseReady = !appwriteLoading && (impersonating || !!appwriteUser);

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    signOut,
    isAuthenticated,
    isImpersonating: impersonating,
    appwriteUser,
    authAvailable: isAppwriteEnabled,
    supabaseSettled,
    supabaseReady,
  }), [user, loading, signOut, isAuthenticated, impersonating, appwriteUser, supabaseSettled, supabaseReady]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
