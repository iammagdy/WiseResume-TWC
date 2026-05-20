import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { configureRevenueCat, resetRevenueCat, isRevenueCatConfigured } from '@/lib/revenuecat';

interface RevenueCatContextValue {
  ready: boolean;
}

const RevenueCatContext = createContext<RevenueCatContextValue>({ ready: false });

export function useRevenueCatReady() {
  return useContext(RevenueCatContext).ready;
}

export function RevenueCatProvider({ children }: { children: ReactNode }) {
  const { user, authReady } = useAuth();
  const configuredForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authReady) return;

    if (!user?.id) {
      // User signed out — tear down
      if (isRevenueCatConfigured()) {
        resetRevenueCat();
        configuredForRef.current = null;
      }
      return;
    }

    // Already configured for this user — skip
    if (configuredForRef.current === user.id) return;

    try {
      configureRevenueCat(user.id);
      configuredForRef.current = user.id;
    } catch (e) {
      // VITE_REVENUECAT_WEB_API_KEY missing in dev — non-fatal
      console.warn('[RevenueCat]', e instanceof Error ? e.message : e);
    }
  }, [authReady, user?.id]);

  const ready = !!user?.id && configuredForRef.current === user?.id;

  return (
    <RevenueCatContext.Provider value={{ ready }}>
      {children}
    </RevenueCatContext.Provider>
  );
}
