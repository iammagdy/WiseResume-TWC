/**
 * Full account backup & restore — PENDING APPWRITE MIGRATION.
 *
 * The legacy implementation read/wrote database tables directly. This module
 * is now a controlled throw-stub pending full Appwrite migration.
 *
 * To prevent runtime crashes from `AccountBackupSheet.tsx` (which still
 * imports `exportFullAccount`/`importFullAccount`), this module is now a
 * controlled throw-stub: type exports preserved, callable functions throw a
 * predictable `Error` that the UI can catch and surface as a friendly
 * "being rebuilt" toast.
 *
 * Will be fully reimplemented against Appwrite Databases collections as
 * part of the Phase-5 rebuild (see Project Atlas/05-Migration to Appwrite/
 * 02-Migration-Tracking.md).
 */

export interface AccountBackup {
  backupVersion: '2.0';
  type: 'full-account';
  exportDate: string;
  source: {
    email?: string | null;
    fullName?: string | null;
    authProvider?: string;
  };
  profile: Record<string, unknown> | null;
  resumes: Record<string, unknown>[];
  coverLetters: Record<string, unknown>[];
  jobApplications: Record<string, unknown>[];
  jobs: Record<string, unknown>[];
  interviewSessions: Record<string, unknown>[];
  careerAssessments: Record<string, unknown>[];
  resignationLetters: Record<string, unknown>[];
  tailorHistory: Record<string, unknown>[];
  preferences: Record<string, unknown> | null;
  shortLinks: Record<string, unknown>[];
  apiKeysMeta: { provider: string; keyTier: string }[];
  settings: Record<string, unknown>;
}

export type ImportProgress = {
  table: string;
  status: 'pending' | 'importing' | 'done' | 'error';
  error?: string;
};

const MIGRATION_MESSAGE =
  'Account backup & restore is being rebuilt on Appwrite. This feature will return shortly.';

export async function exportFullAccount(
  ..._args: unknown[]
): Promise<AccountBackup> {
  throw new Error(`pending_appwrite_migration: ${MIGRATION_MESSAGE}`);
}

export async function importFullAccount(
  ..._args: unknown[]
): Promise<{ progress: ImportProgress[] }> {
  throw new Error(`pending_appwrite_migration: ${MIGRATION_MESSAGE}`);
}
