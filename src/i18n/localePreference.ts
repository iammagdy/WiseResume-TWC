import { ID, Query } from 'appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
import { normalizeLocale, type SupportedLocale } from './core';

export interface LocalePreferenceDatabase {
  listDocuments: (
    databaseId: string,
    collectionId: string,
    queries?: string[],
  ) => Promise<{ documents: Array<Record<string, unknown>>; total: number }>;
  updateDocument: (
    databaseId: string,
    collectionId: string,
    documentId: string,
    data: Record<string, unknown>,
  ) => Promise<unknown>;
  createDocument: (
    databaseId: string,
    collectionId: string,
    documentId: string,
    data: Record<string, unknown>,
  ) => Promise<unknown>;
}

async function findPreference(database: LocalePreferenceDatabase, userId: string) {
  const result = await database.listDocuments(DATABASE_ID, COLLECTIONS.user_preferences, [
    Query.equal('user_id', userId),
    Query.limit(1),
  ]);
  return result.documents[0] ?? null;
}

export async function loadLocalePreference(
  database: LocalePreferenceDatabase,
  userId: string,
): Promise<SupportedLocale | null> {
  const document = await findPreference(database, userId);
  return normalizeLocale(document?.language as string | null | undefined);
}

export async function saveLocalePreference(
  database: LocalePreferenceDatabase,
  userId: string,
  locale: SupportedLocale,
  createId: () => string = () => ID.unique(),
): Promise<void> {
  const existing = await findPreference(database, userId);
  if (existing?.$id) {
    await database.updateDocument(
      DATABASE_ID,
      COLLECTIONS.user_preferences,
      String(existing.$id),
      { language: locale },
    );
    return;
  }
  await database.createDocument(
    DATABASE_ID,
    COLLECTIONS.user_preferences,
    createId(),
    { user_id: userId, language: locale },
  );
}
