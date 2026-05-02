import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSettingsStore } from '@/state/settingsStore';

export function useBiometricGate() {
  const enabled = useSettingsStore((s) => s.biometricLockEnabled);
  const timeoutMs = useSettingsStore((s) => s.biometricLockTimeoutMs);
  const [isLocked, setIsLocked] = useState(enabled);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    LocalAuthentication.hasHardwareAsync()
      .then(async (h) => {
        if (!h) return setAvailable(false);
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setAvailable(enrolled);
      })
      .catch(() => setAvailable(false));
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsLocked(false);
      return;
    }
    let bgAt: number | null = null;
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        bgAt = Date.now();
      } else if (state === 'active' && bgAt) {
        const elapsed = Date.now() - bgAt;
        if (timeoutMs === 0 || elapsed >= timeoutMs) setIsLocked(true);
        bgAt = null;
      }
    });
    return () => sub.remove();
  }, [enabled, timeoutMs]);

  const authenticate = useCallback(async () => {
    if (!available) {
      setIsLocked(false);
      return true;
    }
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock WiseResume',
        fallbackLabel: 'Use Passcode',
      });
      if (res.success) setIsLocked(false);
      return res.success;
    } catch {
      return false;
    }
  }, [available]);

  return { isLocked, available, authenticate };
}
