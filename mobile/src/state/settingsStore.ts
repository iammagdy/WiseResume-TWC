import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'light' | 'dark' | 'system';

interface SettingsState {
  theme: ThemePreference;
  biometricLockEnabled: boolean;
  biometricLockTimeoutMs: number;
  notifications: {
    interviews: boolean;
    applications: boolean;
    resumes: boolean;
    account: boolean;
    broadcasts: boolean;
  };
  hasCompletedOnboarding: boolean;
  setTheme: (theme: ThemePreference) => void;
  setBiometricLockEnabled: (v: boolean) => void;
  setBiometricLockTimeoutMs: (v: number) => void;
  setNotificationPref: (key: keyof SettingsState['notifications'], v: boolean) => void;
  completeOnboarding: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      biometricLockEnabled: false,
      biometricLockTimeoutMs: 30_000,
      notifications: {
        interviews: true,
        applications: true,
        resumes: true,
        account: true,
        broadcasts: true,
      },
      hasCompletedOnboarding: false,
      setTheme: (theme) => set({ theme }),
      setBiometricLockEnabled: (v) => set({ biometricLockEnabled: v }),
      setBiometricLockTimeoutMs: (v) => set({ biometricLockTimeoutMs: v }),
      setNotificationPref: (key, v) =>
        set((s) => ({ notifications: { ...s.notifications, [key]: v } })),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
    }),
    {
      name: 'wr.settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
