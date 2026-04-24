import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
const LS_TOKEN_KEY = 'devkit_session_token';
const LS_EXPIRY_KEY = 'devkit_session_expiry';
const LS_EMAIL_KEY = 'devkit_session_email';

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

function loadRememberedToken(): { token: string; email: string } | null {
  try {
    const token = localStorage.getItem(LS_TOKEN_KEY);
    const expiry = localStorage.getItem(LS_EXPIRY_KEY);
    const email = localStorage.getItem(LS_EMAIL_KEY);
    if (!token || !expiry || !email) return null;
    const expiryMs = parseInt(expiry, 10);
    if (isNaN(expiryMs) || Date.now() >= expiryMs) {
      localStorage.removeItem(LS_TOKEN_KEY);
      localStorage.removeItem(LS_EXPIRY_KEY);
      localStorage.removeItem(LS_EMAIL_KEY);
      return null;
    }
    return { token, email };
  } catch {
    return null;
  }
}

function saveRememberedToken(token: string, expiresAt: number, email: string) {
  try {
    localStorage.setItem(LS_TOKEN_KEY, token);
    localStorage.setItem(LS_EXPIRY_KEY, String(expiresAt));
    localStorage.setItem(LS_EMAIL_KEY, email);
  } catch { }
}

function clearRememberedToken() {
  try {
    localStorage.removeItem(LS_TOKEN_KEY);
    localStorage.removeItem(LS_EXPIRY_KEY);
    localStorage.removeItem(LS_EMAIL_KEY);
  } catch { }
}

interface DevKitSessionContextValue {
  isUnlocked: boolean;
  unlock: (sessionToken: string, opts?: { rememberMe?: boolean; expiresAt?: number; email?: string }) => void;
  lock: () => void;
  secondsUntilLock: number | null;
  rememberedEmail: string | null;
  hasRememberedSession: boolean;
}

const DevKitSessionContext = createContext<DevKitSessionContextValue | null>(null);

export function DevKitSessionProvider({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [secondsUntilLock, setSecondsUntilLock] = useState<number | null>(null);
  const [rememberedEmail, setRememberedEmail] = useState<string | null>(null);
  const [hasRememberedSession, setHasRememberedSession] = useState(false);

  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockAtRef = useRef<number | null>(null);
  const deferredCleanupRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    clearRememberedToken();
    setHasRememberedSession(false);
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

  const unlock = useCallback((
    sessionToken: string,
    opts?: { rememberMe?: boolean; expiresAt?: number; email?: string }
  ) => {
    setDevKitToken(sessionToken);
    setIsUnlocked(true);
    startInactivityTimer();
    if (opts?.rememberMe && opts.expiresAt && opts.email) {
      saveRememberedToken(sessionToken, opts.expiresAt, opts.email);
      setRememberedEmail(opts.email);
      setHasRememberedSession(true);
    }
  }, [startInactivityTimer]);

  // On mount, check for a valid remembered session and auto-unlock
  useEffect(() => {
    const remembered = loadRememberedToken();
    if (remembered) {
      setRememberedEmail(remembered.email);
      setHasRememberedSession(true);
    } else {
      setHasRememberedSession(false);
    }
  }, []);

  useEffect(() => {
    if (!isUnlocked) return;
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleActivity = () => { resetInactivityTimer(); };
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
    if (deferredCleanupRef.current) {
      clearTimeout(deferredCleanupRef.current);
      deferredCleanupRef.current = null;
    }
    return () => {
      deferredCleanupRef.current = setTimeout(() => {
        setDevKitToken(null);
        notifyLockListeners();
        clearTimers();
        deferredCleanupRef.current = null;
      }, 100);
    };
  }, [clearTimers]);

  return (
    <DevKitSessionContext.Provider value={{ isUnlocked, unlock, lock, secondsUntilLock, rememberedEmail, hasRememberedSession }}>
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

export { loadRememberedToken, clearRememberedToken };
