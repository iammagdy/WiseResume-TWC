import { QueryClient } from '@tanstack/react-query';
import { MMKV } from 'react-native-mmkv';
import { createSyncStoragePersister } from '@tanstack/query-async-storage-persister';
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

const storage = new MMKV({ id: 'wr.query-cache' });

const mmkvAdapter = {
  getItem: (key: string) => {
    const v = storage.getString(key);
    return v ?? null;
  },
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
};

export const queryPersister: Persister = createSyncStoragePersister({
  storage: mmkvAdapter,
  key: 'wr.tq.cache.v1',
  throttleTime: 1000,
});
