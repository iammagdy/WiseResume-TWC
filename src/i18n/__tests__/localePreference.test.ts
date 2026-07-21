import { describe, expect, it, vi } from 'vitest';
import { loadLocalePreference, saveLocalePreference } from '../localePreference';

function createDatabase(documents: Array<Record<string, unknown>> = []) {
  return {
    listDocuments: vi.fn(async () => ({ documents, total: documents.length })),
    updateDocument: vi.fn(async (_db, _collection, id, data) => ({ $id: id, ...data })),
    createDocument: vi.fn(async (_db, _collection, id, data) => ({ $id: id, ...data })),
  };
}

describe('locale preference persistence', () => {
  it('loads a supported locale from user_preferences', async () => {
    const database = createDatabase([{ $id: 'pref-1', user_id: 'user-1', language: 'ar' }]);
    await expect(loadLocalePreference(database, 'user-1')).resolves.toBe('ar');
  });

  it('ignores unsupported stored locales', async () => {
    const database = createDatabase([{ $id: 'pref-1', user_id: 'user-1', language: 'fr' }]);
    await expect(loadLocalePreference(database, 'user-1')).resolves.toBeNull();
  });

  it('updates an existing preference document', async () => {
    const database = createDatabase([{ $id: 'pref-1', user_id: 'user-1', language: 'en' }]);
    await saveLocalePreference(database, 'user-1', 'ar');
    expect(database.updateDocument).toHaveBeenCalledWith('main', 'user_preferences', 'pref-1', { language: 'ar' });
  });

  it('creates a preference document when one does not exist', async () => {
    const database = createDatabase();
    await saveLocalePreference(database, 'user-1', 'ar', () => 'new-pref');
    expect(database.createDocument).toHaveBeenCalledWith('main', 'user_preferences', 'new-pref', {
      user_id: 'user-1',
      language: 'ar',
    }, [
      'read("user:user-1")',
      'update("user:user-1")',
      'delete("user:user-1")',
    ]);
  });
});
