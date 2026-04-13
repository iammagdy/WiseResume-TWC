import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

let _devKitToken: string | null = null;

export function getDevKitToken(): string | null {
  return _devKitToken;
}

function setDevKitToken(token: string | null) {
  _devKitToken = token;
}

type LockListener = () => void;
const _lockListeners = new Set<LockListener>();

export function onDevKitLock(listener: LockListener): () => void {
  _lockListeners.add(listener);
  return () => { _lockListeners.delete(listener); };
}

function notifyLockListeners() {
  for (const listener of _lockListeners) {
    try { listener(); } catch { }
  }
}

interface DevKitSessionContextValue {
  isUnlocked: boolean;
  unlock: (sessionToken: string) => void;
  lock: () => void;
  secondsUntilLock: number | null;
}

const DevKitSessionContext = createContext<DevKitSessionContextValue | null>(null);

export function DevKitSessionProvider({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [secondsUntilLock, setSecondsUntilLock] = useState<number | null>(null);

  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockAtRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    lockAtRef.current = null;
  }, []);

  const lock = useCallback(() => {
    setDevKitToken(null);
    notifyLockListeners();
    setIsUnlocked(false);
    setSecondsUntilLock(null);
    clearTimers();
  }, [clearTimers]);

  const startInactivityTimer = useCallback(() => {
    clearTimers();

    const lockAt = Date.now() + INACTIVITY_TIMEOUT_MS;
    lockAtRef.current = lockAt;

    lockTimeoutRef.current = setTimeout(() => {
      lock();
    }, INACTIVITY_TIMEOUT_MS);

    countdownIntervalRef.current = setInterval(() => {
      const remaining = lockAtRef.current ? Math.max(0, Math.ceil((lockAtRef.current - Date.now()) / 1000)) : 0;
      setSecondsUntilLock(remaining);
    }, 1000);

    setSecondsUntilLock(Math.ceil(INACTIVITY_TIMEOUT_MS / 1000));
  }, [clearTimers, lock]);

  const resetInactivityTimer = useCallback(() => {
    if (!lockAtRef.current) return;
    clearTimers();
    startInactivityTimer();
  }, [clearTimers, startInactivityTimer]);

  const unlock = useCallback((sessionToken: string) => {
    setDevKitToken(sessionToken);
    setIsUnlocked(true);
    startInactivityTimer();
  }, [startInactivityTimer]);

  useEffect(() => {
    if (!isUnlocked) return;

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

    const handleActivity = () => {
      resetInactivityTimer();
    };

    const devToolsEl = document.getElementById('dev-tools-root') ?? document;
    for (const ev of events) {
      devToolsEl.addEventListener(ev, handleActivity, { passive: true });
    }

    return () => {
      for (const ev of events) {
        devToolsEl.removeEventListener(ev, handleActivity);
      }
    };
  }, [isUnlocked, resetInactivityTimer]);

  useEffect(() => {
    return () => {
      setDevKitToken(null);
      notifyLockListeners();
      clearTimers();
    };
  }, [clearTimers]);

  return (
    <DevKitSessionContext.Provider value={{ isUnlocked, unlock, lock, secondsUntilLock }}>
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
