import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ownerDocumentPermissions } from '@/lib/appwriteOwnerPermissions';

const requireCjs = createRequire(import.meta.url);
const ownerSchema = requireCjs(path.resolve(process.cwd(), 'scripts/setup_owner_collections_schema.cjs')) as {
  COLLECTION_SCHEMAS: Record<string, { attributes: Array<{ key: string }>; indexes: Array<{ key: string }> }>;
  normalizeCollectionPermissions: (permissions?: string[]) => string[];
  ownerDocumentPermissions: (userId: string) => string[];
  hasExactOwnerPermissions: (permissions: string[], userId: string) => boolean;
  isValidOwnerId: (value: unknown) => boolean;
  parseCollectionsArg: (argv: string[]) => string[];
};
const migration = requireCjs(path.resolve(process.cwd(), 'scripts/migrate_owner_document_permissions.cjs')) as {
  safeOwnerId: (doc: Record<string, unknown>, runnerIds: Set<string>) => string | null;
};

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('owner-scoped Appwrite permissions', () => {
  it('builds owner-only document permissions without Role.any access', () => {
    expect(ownerDocumentPermissions('user-1')).toEqual([
      'read("user:user-1")',
      'update("user:user-1")',
      'delete("user:user-1")',
    ]);
    expect(ownerDocumentPermissions('user-1').join(' ')).not.toContain('any');
  });

  it('normalizes collection permissions to authenticated create only', () => {
    const normalized = ownerSchema.normalizeCollectionPermissions([
      'read("users")',
      'update("users")',
      'delete("users")',
      'create("any")',
    ]);
    expect(normalized).toEqual(['create("users")']);
    expect(ownerSchema.normalizeCollectionPermissions(normalized)).toEqual(normalized);
  });

  it('defines required owner collection attributes and indexes', () => {
    expect(ownerSchema.COLLECTION_SCHEMAS.user_preferences.attributes.map((attr) => attr.key)).toEqual(
      expect.arrayContaining(['user_id', 'language']),
    );
    expect(ownerSchema.COLLECTION_SCHEMAS.jobs.indexes.map((index) => index.key)).toContain('user_id_idx');
    expect(ownerSchema.COLLECTION_SCHEMAS.job_applications.attributes.map((attr) => attr.key)).toEqual(
      expect.arrayContaining([
        'user_id',
        'job_title',
        'company',
        'status',
        'applied_at',
        'url',
        'notes',
        'deadline',
        'resume_id',
        'cover_letter_id',
        'job_feed_item_id',
      ]),
    );
    expect(ownerSchema.COLLECTION_SCHEMAS.job_applications.indexes.map((index) => index.key)).toEqual(
      expect.arrayContaining(['user_id_idx', 'status_idx', 'resume_id_idx', 'user_status_idx']),
    );
  });

  it('validates migration ownership without assigning invalid or runner-owned docs', () => {
    expect(ownerSchema.isValidOwnerId('user_123')).toBe(true);
    expect(ownerSchema.isValidOwnerId('')).toBe(false);
    expect(ownerSchema.isValidOwnerId('bad owner')).toBe(false);
    expect(migration.safeOwnerId({ user_id: 'user_123' }, new Set(['runner_1']))).toBe('user_123');
    expect(migration.safeOwnerId({ user_id: 'runner_1' }, new Set(['runner_1']))).toBeNull();
    expect(migration.safeOwnerId({ user_id: 'bad owner' }, new Set())).toBeNull();
  });

  it('detects exact owner permissions for existing documents', () => {
    const desired = ownerSchema.ownerDocumentPermissions('user-1');
    expect(ownerSchema.hasExactOwnerPermissions(desired, 'user-1')).toBe(true);
    expect(ownerSchema.hasExactOwnerPermissions([...desired, 'read("users")'], 'user-1')).toBe(false);
  });

  it('does not support target all collection arguments', () => {
    expect(() => ownerSchema.parseCollectionsArg(['--collections=all'])).toThrow(/all target/);
  });
});

describe('affected frontend security wiring', () => {
  it('attaches owner permissions in affected browser creation paths', () => {
    for (const file of [
      'src/hooks/useJobApplications.ts',
      'src/hooks/useJobs.ts',
      'src/pages/RemoteJobsPage.tsx',
    ]) {
      expect(readRepoFile(file)).toContain('ownerDocumentPermissions(user.id');
    }
    expect(readRepoFile('src/i18n/localePreference.ts')).toContain('ownerDocumentPermissions(userId)');
  });

  it('does not read the server-only Tailor History collection from runtime files', () => {
    for (const file of [
      'src/hooks/useTailorHistory.ts',
      'src/hooks/useSavedJobPostings.ts',
      'src/hooks/useJobs.ts',
      'src/hooks/useCombinedTailorHistory.ts',
      'src/hooks/useJobActivityStats.ts',
      'src/hooks/useActivityStreak.ts',
      'src/hooks/useActivityFeed.ts',
      'src/hooks/useCareerMilestones.ts',
      'src/components/applications/ActivityTimeline.tsx',
      'src/pages/TailoringHubResultPage.tsx',
      'src/lib/tailorJobContext.ts',
      'src/lib/dataExport.ts',
    ]) {
      expect(readRepoFile(file), file).not.toContain('COLLECTIONS.tailor_history');
      expect(readRepoFile(file), file).not.toContain('tailor_history');
    }
  });

  it('allows only the narrow Appwrite Realtime websocket origin in CSP', () => {
    for (const file of ['vite.config.ts', 'public/_headers']) {
      const source = readRepoFile(file);
      const connectDirective = source.match(/connect-src[^;"\n]*/)?.[0] ?? '';
      expect(source).toContain('https://fra.cloud.appwrite.io');
      expect(source).toContain('wss://fra.cloud.appwrite.io');
      expect(connectDirective.split(/\s+/)).not.toContain('*');
      expect(connectDirective.split(/\s+/)).not.toContain('wss:');
      expect(connectDirective.split(/\s+/)).not.toContain('https:');
    }
  });
});
