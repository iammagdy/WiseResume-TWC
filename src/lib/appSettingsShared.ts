/** Public app settings read by the main shell (maintenance, announcements, feature gates). */

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

export const DEFAULT_APP_SETTINGS: AppSettings = {
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

/** Keys safe to expose via the public /api/app-settings route (no secrets). */
export const PUBLIC_APP_SETTING_KEYS = new Set<string>([
  ...Object.keys(DEFAULT_APP_SETTINGS),
]);

export function parseAppSettingsRecord(obj: Record<string, unknown>): AppSettings {
  const parsed: Partial<AppSettings> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (!PUBLIC_APP_SETTING_KEYS.has(key)) continue;
    const k = key as keyof AppSettings;
    if (STRING_KEYS.includes(k)) {
      (parsed as Record<string, unknown>)[k] =
        val === null || val === undefined ? null : String(val);
    } else {
      (parsed as Record<string, unknown>)[k] = val === true || val === 'true';
    }
  }
  return { ...DEFAULT_APP_SETTINGS, ...parsed };
}
