import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

let _devKitToken: string | null = null;

export function getDevKitToken(): string | null {
  return _devKitToken;
}

function setDevKitToken(token: string | null) {
  _devKitToken = token;
}

interface DevKitSessionContextValue {
  isUnlocked: boolean;
  unlock: (sessionToken: string) => void;
  lock: () => void;
}

const DevKitSessionContext = createContext<DevKitSessionContextValue | null>(null);

export function DevKitSessionProvider({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false);

  const unlock = useCallback((sessionToken: string) => {
    setDevKitToken(sessionToken);
    setIsUnlocked(true);
  }, []);

  const lock = useCallback(() => {
    setDevKitToken(null);
    setIsUnlocked(false);
  }, []);

  useEffect(() => {
    return () => {
      setDevKitToken(null);
    };
  }, []);

  return (
    <DevKitSessionContext.Provider value={{ isUnlocked, unlock, lock }}>
      {children}
    </DevKitSessionContext.Provider>
  );
}

export function useDevKitSession(): DevKitSessionContextValue {
  const ctx = useContext(DevKitSessionContext);
  if (!ctx) {
    throw new Error('useDevKitSession must be used within DevKitSessionProvider');
  }
  return ctx;
}
