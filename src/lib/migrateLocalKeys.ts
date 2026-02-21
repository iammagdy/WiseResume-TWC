import { supabase } from '@/integrations/supabase/safeClient';
import { runMigrationPipeline, isMigrationDone } from '@/lib/migrationRunner';
import type { MigrationStep } from '@/lib/migrationRunner';

const SETTINGS_KEY = 'wiseresume-settings';
const PIPELINE_ID = 'api-keys';

/**
 * Migrates legacy geminiApiKey from localStorage to the server-side
 * encrypted store using a resumable, retryable pipeline.
 */
export async function migrateLocalKeysToServer(): Promise<void> {
  try {
    if (isMigrationDone(PIPELINE_ID)) return;

    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      // Nothing to migrate — mark done immediately
      localStorage.setItem(`wr-migration-${PIPELINE_ID}-done`, '1');
      return;
    }

    const parsed = JSON.parse(raw);
    const state = parsed?.state;
    if (!state?.geminiApiKey) {
      localStorage.setItem(`wr-migration-${PIPELINE_ID}-done`, '1');
      return;
    }

    const steps: MigrationStep[] = [
      {
        name: 'upload-key',
        action: async () => {
          const { error } = await supabase.functions.invoke('manage-api-keys', {
            method: 'POST',
            body: {
              provider: 'gemini',
              apiKey: state.geminiApiKey,
              keyTier: state.geminiKeyTier || 'unknown',
            },
          });
          if (error) throw error;
        },
      },
      {
        name: 'strip-local',
        action: async () => {
          // Re-read in case another tab modified it
          const freshRaw = localStorage.getItem(SETTINGS_KEY);
          if (freshRaw) {
            const freshParsed = JSON.parse(freshRaw);
            if (freshParsed?.state) {
              const { geminiApiKey, elevenlabsApiKey, ...cleanState } = freshParsed.state;
              freshParsed.state = cleanState;
              localStorage.setItem(SETTINGS_KEY, JSON.stringify(freshParsed));
            }
          }
          console.info('Legacy API key migrated to server-side store.');
        },
      },
    ];

    const result = await runMigrationPipeline(PIPELINE_ID, steps);
    if (!result.completed) {
      console.warn('API key migration incomplete, will resume next session.');
    }
  } catch (e) {
    console.warn('Key migration error:', e);
  }
}
