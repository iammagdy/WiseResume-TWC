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

export function useAppSettings(): AppSettings & { isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async (): Promise<AppSettings> => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value');

      if (error) {
        console.warn('[useAppSettings] Could not load settings:', error.message);
        return DEFAULTS;
      }

      const parsed: Partial<AppSettings> = {};
      for (const row of data ?? []) {
        const key = row.key as keyof AppSettings;
        const val = row.value;
        if (key === 'announcement_banner') {
          (parsed as Record<string, unknown>)[key] = typeof val === 'string' ? val : (val === null ? null : String(val));
        } else {
          (parsed as Record<string, unknown>)[key] = val === true || val === 'true';
        }
      }
      return { ...DEFAULTS, ...parsed };
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
