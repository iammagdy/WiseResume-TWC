/**
 * Web stub for the former Capacitor-backed biometric lock. The
 * Capacitor native shell was retired in favor of a standalone Expo
 * app (`mobile/`), which handles biometric unlock via
 * `expo-local-authentication`. On the web there is no biometric API,
 * so this hook reports the feature as unavailable and never locks.
 */
export type BiometryTypeString = 'faceId' | 'fingerprint' | 'iris' | 'none';

export interface UseBiometricLockReturn {
  isAvailable: boolean;
  biometryType: BiometryTypeString;
  isLocked: boolean;
  isAuthenticating: boolean;
  authenticate: () => Promise<boolean>;
  checkAvailability: () => Promise<void>;
  unlock: () => void;
  lock: () => void;
}

export function useBiometricLock(_enabled: boolean, _lockTimeout: number = 30000): UseBiometricLockReturn {
  void _enabled;
  void _lockTimeout;
  return {
    isAvailable: false,
    biometryType: 'none',
    isLocked: false,
    isAuthenticating: false,
    authenticate: async () => true,
    checkAvailability: async () => {},
    unlock: () => {},
    lock: () => {},
  };
}
