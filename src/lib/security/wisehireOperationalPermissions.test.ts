import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('WiseHire operational data permissions', () => {
  it('migrates operational collections to owner-scoped document security', () => {
    const schema = read('scripts/setup_wisehire_collections_schema.cjs');

    for (const collection of [
      'wisehire_candidate_briefs',
      'wisehire_candidates',
      'wisehire_companies',
      'wisehire_roles',
      'wisehire_scorecards',
    ]) {
      expect(schema).toContain(`'${collection}'`);
    }
    expect(schema).toContain('[sdk.Permission.create(sdk.Role.users())]');
    expect(schema).toContain('ownerPermissions(ownerId)');
    expect(schema).toContain('server-only unresolved=');
    expect(schema).not.toContain('sdk.Role.any()');
  });

  it('assigns owner-only permissions to every client-created WiseHire document', () => {
    const helper = read('src/lib/wisehire/documentPermissions.ts');
    expect(helper).toContain('Permission.read(Role.user(userId))');
    expect(helper).toContain('Permission.update(Role.user(userId))');
    expect(helper).toContain('Permission.delete(Role.user(userId))');
    expect(helper).not.toContain('Role.any');

    for (const file of [
      'src/hooks/wisehire/useBulkScreen.ts',
      'src/hooks/wisehire/useCandidateNotes.ts',
      'src/hooks/wisehire/useClients.ts',
      'src/hooks/wisehire/useJDs.ts',
      'src/hooks/wisehire/usePipeline.ts',
      'src/hooks/wisehire/useRoles.ts',
      'src/hooks/wisehire/useSavedSearches.ts',
      'src/hooks/wisehire/useScorecards.ts',
      'src/hooks/wisehire/useScorecardTemplates.ts',
      'src/hooks/wisehire/useTalentPool.ts',
      'src/pages/wisehire/WiseHireOnboardingPage.tsx',
      'src/pages/wisehire/WiseHireSettingsPage.tsx',
    ]) {
      expect(read(file), file).toContain('wisehireOwnerPermissions');
    }
  });

  it('gives gateway-created recruiter records the same owner boundary', () => {
    const gateway = read('appwrite-hubs/wisehire-gateway/src/main.js');
    expect(gateway).toContain('function ownerDocumentPermissions(userId)');
    expect(gateway).toContain("'wisehire_candidate_briefs', sdk.ID.unique(), {");
    expect(gateway).toContain('}, ownerDocumentPermissions(user.$id));');
  });
});
