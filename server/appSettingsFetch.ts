import { Client, Databases, Query } from 'node-appwrite';

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.VITE_APPWRITE_PROJECT_ID ||
  process.env.APPWRITE_FUNCTION_PROJECT_ID ||
  '';
const API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
const DATABASE_ID = 'main';
const COLLECTION_ID = 'app_settings';

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
  feature_arabic_locale: boolean;
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
  feature_arabic_locale: false,
  maintenance_window_start: null,
  maintenance_window_end: null,
};

const STRING_KEYS = new Set(['announcement_banner', 'maintenance_window_start', 'maintenance_window_end']);

function parseAppSettingsRecord(obj: Record<string, unknown>): AppSettings {
  const parsed: Partial<AppSettings> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (!(key in DEFAULT_APP_SETTINGS)) continue;
    const k = key as keyof AppSettings;
    if (STRING_KEYS.has(key)) {
      (parsed as Record<string, unknown>)[k] =
        val === null || val === undefined ? null : String(val);
    } else {
      (parsed as Record<string, unknown>)[k] = val === true || val === 'true';
    }
  }
  return { ...DEFAULT_APP_SETTINGS, ...parsed };
}

export async function fetchAppSettingsFromDb(): Promise<AppSettings> {
  if (!API_KEY || !PROJECT_ID) {
    return DEFAULT_APP_SETTINGS;
  }

  const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
  const databases = new Databases(client);

  try {
    const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [Query.limit(100)]);
    if (!res.documents.length) return DEFAULT_APP_SETTINGS;

    const obj: Record<string, unknown> = {};
    for (const doc of res.documents) {
      const row = doc as { key?: string; value?: unknown };
      if (row.key !== undefined) {
        obj[row.key] = row.value;
      }
    }
    return parseAppSettingsRecord(obj);
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}
