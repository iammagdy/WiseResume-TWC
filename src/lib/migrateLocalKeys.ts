import { supabase } from '@/integrations/supabase/safeClient';

const MIGRATED_FLAG = 'wiseresume-keys-migrated';
const SETTINGS_KEY = 'wiseresume-settings';

/**
 * One-time migration: uploads legacy geminiApiKey from localStorage
 * to the server-side encrypted store, then strips it from localStorage.
 */
export async function migrateLocalKeysToServer(): Promise<void> {
  try {
    if (localStorage.getItem(MIGRATED_FLAG) === '1') return;

    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) { localStorage.setItem(MIGRATED_FLAG, '1'); return; }

    const parsed = JSON.parse(raw);
    const state = parsed?.state;
    if (!state?.geminiApiKey) { localStorage.setItem(MIGRATED_FLAG, '1'); return; }

    const { error } = await supabase.functions.invoke('manage-api-keys', {
      method: 'POST',
      body: {
        provider: 'gemini',
        apiKey: state.geminiApiKey,
        keyTier: state.geminiKeyTier || 'unknown',
      },
    });

    if (error) {
      console.warn('Key migration failed, will retry next session:', error.message);
      return;
    }

    // Strip sensitive keys from persisted state
    const { geminiApiKey, elevenlabsApiKey, ...cleanState } = state;
    parsed.state = cleanState;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
    localStorage.setItem(MIGRATED_FLAG, '1');
    console.info('Legacy API key migrated to server-side store.');
  } catch (e) {
    console.warn('Key migration error:', e);
  }
}
