import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';

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
};

function parseSettings(obj: Record<string, unknown>): AppSettings {
  const parsed: Partial<AppSettings> = {};
  for (const [key, val] of Object.entries(obj)) {
    const k = key as keyof AppSettings;
    if (k === 'announcement_banner') {
      (parsed as Record<string, unknown>)[k] = val === null ? null : String(val);
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
      // Use the get_app_settings RPC which is accessible to anon + authenticated
      // This ensures maintenance mode is enforced even for unauthenticated users
      const { data, error } = await supabase.rpc('get_app_settings');

      if (error) {
        // Fallback: try direct table read (authenticated sessions may have row-level access)
        const { data: tableData, error: tableError } = await supabase
          .from('app_settings')
          .select('key, value');

        if (tableError) {
          console.warn('[useAppSettings] Could not load settings:', tableError.message);
          return DEFAULTS;
        }

        const obj: Record<string, unknown> = {};
        for (const row of tableData ?? []) {
          obj[row.key] = row.value;
        }
        return parseSettings(obj);
      }

      if (!data || typeof data !== 'object') {
        return DEFAULTS;
      }

      return parseSettings(data as Record<string, unknown>);
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
