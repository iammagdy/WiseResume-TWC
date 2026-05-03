import { QueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { Persister } from '@tanstack/react-query-persist-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Storage adapter for the query cache.
 *
 * On native we use `react-native-mmkv` for fast synchronous reads.
 * On web (Expo dev / Replit preview) MMKV has no implementation and
 * its module-scope `new MMKV(...)` call would crash bundle init, so
 * we lazily resolve to a `localStorage`-backed adapter instead.
 */
interface AsyncCacheStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

function createCacheStorage(): AsyncCacheStorage {
  if (Platform.OS === 'web') {
    return {
      getItem: async (key) => {
        try {
          return globalThis.localStorage?.getItem(key) ?? null;
        } catch {
          return null;
        }
      },
      setItem: async (key, value) => {
        try {
          globalThis.localStorage?.setItem(key, value);
        } catch {
          /* noop */
        }
      },
      removeItem: async (key) => {
        try {
          globalThis.localStorage?.removeItem(key);
        } catch {
          /* noop */
        }
      },
    };
  }

  // Native — require lazily so web bundles never touch MMKV.
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  const { MMKV } = require('react-native-mmkv');
  const storage = new MMKV({ id: 'wr.query-cache' });
  return {
    getItem: async (key) => storage.getString(key) ?? null,
    setItem: async (key, value) => {
      storage.set(key, value);
    },
    removeItem: async (key) => {
      storage.delete(key);
    },
  };
}

export const queryPersister: Persister = createAsyncStoragePersister({
  storage: createCacheStorage(),
  key: 'wr.tq.cache.v1',
  throttleTime: 1000,
});
