import { useQuery } from '@tanstack/react-query';
import {
  DEFAULT_APP_SETTINGS,
  parseAppSettingsRecord,
  type AppSettings,
} from '@/lib/appSettingsShared';

export type { AppSettings };

async function fetchPublicAppSettings(): Promise<AppSettings> {
  const res = await fetch('/api/app-settings', {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`App settings request failed (${res.status})`);
  }

  const body = (await res.json()) as Record<string, unknown>;
  return parseAppSettingsRecord(body);
}

export function useAppSettings(): AppSettings & { isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async (): Promise<AppSettings> => {
      try {
        return await fetchPublicAppSettings();
      } catch (e) {
        console.warn('[useAppSettings] Could not load settings:', e);
        return DEFAULT_APP_SETTINGS;
      }
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000,
    retry: 1,
  });

  return {
    ...(data ?? DEFAULT_APP_SETTINGS),
    isLoading,
  };
}
