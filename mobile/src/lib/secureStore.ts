import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Tiny async key/value adapter on top of `expo-secure-store`. Used as
 * the storage backend for the Supabase client and for the bridge JWT
 * minted by the `token-exchange` edge function.
 *
 * On web (Expo dev / Storybook) `expo-secure-store` is unavailable,
 * so we fall back to localStorage to keep the editor experience
 * functional while developing.
 */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        /* noop */
      }
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      /* noop */
    }
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {
        /* noop */
      }
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* noop */
    }
  },
};
