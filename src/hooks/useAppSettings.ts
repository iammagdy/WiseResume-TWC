import { useQuery } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';

export interface AppSettings {
  maintenance_mode: boolean;
  announcement_enabled: boolean;
  announcement_banner: string | null;
  feature_cover_letters: boolean;
  feature_applications: boolean;
  feature_ai_studio: boolean;
  feature_portfolio: boolean;
  feature_interview_coach: boolean;
  feature_career_advisor: boolean;
  maintenance_window_start: string | null;
  maintenance_window_end: string | null;
}

const DEFAULTS: AppSettings = {
  maintenance_mode: false,
  announcement_enabled: false,
  announcement_banner: null,
  feature_cover_letters: true,
  feature_applications: true,
  feature_ai_studio: true,
  feature_portfolio: true,
  feature_interview_coach: true,
  feature_career_advisor: true,
  maintenance_window_start: null,
  maintenance_window_end: null,
};

const STRING_KEYS: (keyof AppSettings)[] = [
  'announcement_banner',
  'maintenance_window_start',
  'maintenance_window_end',
];

function parseSettings(obj: Record<string, unknown>): AppSettings {
  const parsed: Partial<AppSettings> = {};
  for (const [key, val] of Object.entries(obj)) {
    const k = key as keyof AppSettings;
    if (STRING_KEYS.includes(k)) {
      (parsed as Record<string, unknown>)[k] =
        val === null || val === undefined ? null : String(val);
    } else {
      (parsed as Record<string, unknown>)[k] = val === true || val === 'true';
    }
  }
  return { ...DEFAULTS, ...parsed };
}

export function useAppSettings(): AppSettings & { isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async (): Promise<AppSettings> => {
      try {
        // app_settings is a key/value table: each document has { key, value }
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.app_settings, [
          Query.limit(100),
        ]);
        if (res.documents.length === 0) return DEFAULTS;

        const obj: Record<string, unknown> = {};
        for (const doc of res.documents) {
          const d = doc as unknown as { key?: string; value?: unknown };
          if (d.key !== undefined) {
            obj[d.key] = d.value;
          }
        }
        return parseSettings(obj);
      } catch (e) {
        console.warn('[useAppSettings] Could not load settings:', e);
        return DEFAULTS;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    ...(data ?? DEFAULTS),
    isLoading,
  };
}
