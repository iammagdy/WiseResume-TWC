import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
const LS_TOKEN_KEY   = 'devkit_session_token';
const LS_EXPIRY_KEY  = 'devkit_session_expiry';
const LS_EMAIL_KEY   = 'devkit_session_email';
const LS_CRED_KEY    = 'devkit_webauthn_cred_id';

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

export function loadRememberedToken(): { token: string; email: string } | null {
  try {
    const token  = localStorage.getItem(LS_TOKEN_KEY);
    const expiry = localStorage.getItem(LS_EXPIRY_KEY);
    const email  = localStorage.getItem(LS_EMAIL_KEY);
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

export function saveRememberedToken(token: string, expiresAt: number, email: string) {
  try {
    localStorage.setItem(LS_TOKEN_KEY,  token);
    localStorage.setItem(LS_EXPIRY_KEY, String(expiresAt));
    localStorage.setItem(LS_EMAIL_KEY,  email);
  } catch { }
}

export function clearRememberedToken() {
  try {
    localStorage.removeItem(LS_TOKEN_KEY);
    localStorage.removeItem(LS_EXPIRY_KEY);
    localStorage.removeItem(LS_EMAIL_KEY);
  } catch { }
}

// ─── WebAuthn biometric helpers ───────────────────────────────────────────────

function bufToB64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function b64urlToBuf(b64url: string): ArrayBuffer {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const s   = atob(b64);
  const buf = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) buf[i] = s.charCodeAt(i);
  return buf.buffer;
}

/** Returns true when the device has a platform authenticator (Face ID, Touch ID, Windows Hello, PIN). */
export async function isBiometricAvailable(): Promise<boolean> {
  if (!window.isSecureContext) return false;
  if (typeof PublicKeyCredential === 'undefined') return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Returns true when a WebAuthn credential has been registered on this device/domain. */
export function hasBiometricCredential(): boolean {
  try {
    return !!localStorage.getItem(LS_CRED_KEY);
  } catch {
    return false;
  }
}

/** Clears the stored credential ID (called on explicit lock so user must re-register). */
export function clearBiometricCredential(): void {
  try { localStorage.removeItem(LS_CRED_KEY); } catch { }
}

/**
 * Registers a platform authenticator credential for this device.
 * Called once after a successful password login.
 * Silently returns false if registration is cancelled or unsupported.
 */
export async function registerBiometricCredential(): Promise<boolean> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId    = crypto.getRandomValues(new Uint8Array(16));

    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'WiseResume DevKit', id: window.location.hostname },
        user: { id: userId, name: 'devkit-admin', displayName: 'DevKit Admin' },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7   },  // ES256
          { type: 'public-key', alg: -257 },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!cred) return false;
    localStorage.setItem(LS_CRED_KEY, bufToB64url(cred.rawId));
    return true;
  } catch {
    return false;
  }
}

/**
 * Asks the platform authenticator to verify the user (Face ID / Touch ID / PIN).
 * Returns true only when the device confirms user presence.
 */
export async function verifyBiometricCredential(): Promise<boolean> {
  const credIdStr = localStorage.getItem(LS_CRED_KEY);
  if (!credIdStr) return false;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credId    = b64urlToBuf(credIdStr);
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ type: 'public-key', id: credId }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return !!assertion;
  } catch {
    return false;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

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
  const [isUnlocked, setIsUnlocked]               = useState(false);
  const [secondsUntilLock, setSecondsUntilLock]   = useState<number | null>(null);
  const [rememberedEmail, setRememberedEmail]      = useState<string | null>(null);
  const [hasRememberedSession, setHasRememberedSession] = useState(false);

  const lockTimeoutRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockAtRef            = useRef<number | null>(null);
  const deferredCleanupRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (lockTimeoutRef.current)       { clearTimeout(lockTimeoutRef.current);       lockTimeoutRef.current = null; }
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    lockAtRef.current = null;
  }, []);

  const inactivityLock = useCallback(() => {
    setDevKitToken(null);
    notifyLockListeners();
    setIsUnlocked(false);
    setSecondsUntilLock(null);
    clearTimers();
    // Intentionally keeps localStorage — remembered session survives inactivity
    // so the user can re-unlock via biometric instead of retyping the password.
  }, [clearTimers]);

  const lock = useCallback(() => {
    setDevKitToken(null);
    notifyLockListeners();
    setIsUnlocked(false);
    setSecondsUntilLock(null);
    clearRememberedToken();
    clearBiometricCredential();
    setHasRememberedSession(false);
    setRememberedEmail(null);
    clearTimers();
  }, [clearTimers]);

  const startInactivityTimer = useCallback(() => {
    clearTimers();
    const lockAt = Date.now() + INACTIVITY_TIMEOUT_MS;
    lockAtRef.current = lockAt;
    lockTimeoutRef.current = setTimeout(() => { inactivityLock(); }, INACTIVITY_TIMEOUT_MS);
    countdownIntervalRef.current = setInterval(() => {
      const remaining = lockAtRef.current
        ? Math.max(0, Math.ceil((lockAtRef.current - Date.now()) / 1000))
        : 0;
      setSecondsUntilLock(remaining);
    }, 1000);
    setSecondsUntilLock(Math.ceil(INACTIVITY_TIMEOUT_MS / 1000));
  }, [clearTimers, inactivityLock]);

  const resetInactivityTimer = useCallback(() => {
    if (!lockAtRef.current) return;
    clearTimers();
    startInactivityTimer();
  }, [clearTimers, startInactivityTimer]);

  const unlock = useCallback((
    sessionToken: string,
    opts?: { rememberMe?: boolean; expiresAt?: number; email?: string },
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

  // On mount: check for a valid remembered session so the lock screen can
  // offer the biometric shortcut — but NEVER auto-unlock.
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
    for (const ev of events) devToolsEl.addEventListener(ev, handleActivity, { passive: true });
    return () => { for (const ev of events) devToolsEl.removeEventListener(ev, handleActivity); };
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
  if (!ctx) throw new Error('useDevKitSession must be used within DevKitSessionProvider');
  return ctx;
}

