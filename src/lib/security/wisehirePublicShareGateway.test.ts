import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('WiseHire public sharing boundary', () => {
  it('routes public briefs and scorecards through the server allowlist', () => {
    const briefPage = read('src/pages/share/PublicBriefPage.tsx');
    const scorecardPage = read('src/pages/wisehire/PublicScorecardPage.tsx');
    const scorecards = read('src/hooks/wisehire/useScorecards.ts');
    const gateway = read('appwrite-hubs/wisehire-gateway/src/main.js');
    const privateMeta = read('src/hooks/wisehire/usePrivateShareMeta.ts');

    expect(briefPage).toContain("'public-brief'");
    expect(briefPage).not.toContain('databases.listDocuments');
    expect(briefPage).not.toContain('candidateDoc.email');
    expect(briefPage).toContain('usePrivateShareMeta');
    expect(scorecardPage).toContain('usePrivateShareMeta');
    expect(privateMeta).toContain('noindex, nofollow, noarchive');
    expect(privateMeta).toContain('no-referrer');

    const publicHook = scorecards.slice(
      scorecards.indexOf('export function usePublicScorecard'),
      scorecards.indexOf('export function useCreateScorecard'),
    );
    expect(publicHook).toContain("'public-scorecard'");
    expect(publicHook).not.toContain('databases.listDocuments');

    expect(gateway).toContain("accessAction === 'public-brief'");
    expect(gateway).toContain("accessAction === 'public-scorecard'");
    expect(gateway).toContain("sub === 'public-brief' || sub === 'public-scorecard'");
    expect(gateway).not.toContain('candidate: { name: candidateDoc.name, email: candidateDoc.email }');
  });
});
