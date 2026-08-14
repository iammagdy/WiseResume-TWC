import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  deriveExactUserCounts,
  effectivePlanCount,
  buildUsageStats,
  summarizeCompletionHealth,
} = require('../../../appwrite-hubs/admin-devkit-data/src/phase1-semantics.cjs');

describe('DevKit Phase 1 backend semantics', () => {
  it('keeps exact unverified totals distinct from the bounded sample', () => {
    expect(deriveExactUserCounts(44, 10)).toEqual({
      totalAuthUsers: 44,
      unverifiedUsersTotal: 10,
      verifiedUsers: 34,
    });
    expect(deriveExactUserCounts(44, 0).verifiedUsers).toBe(44);
  });

  it('does not fall back when an effective plan count is legitimately zero', () => {
    expect(effectivePlanCount({ total: 0 })).toBe(0);
    expect(effectivePlanCount({ total: 7 })).toBe(7);
    expect(effectivePlanCount({ error: 'query failed', total: 7 })).toBeNull();
  });

  it('labels the actual returned usage population instead of claiming 50 calls', () => {
    const docs = [
      ...Array.from({ length: 42 }, () => ({ provider: 'deepseek' })),
      ...Array.from({ length: 2 }, () => ({ provider: 'groq' })),
    ];
    expect(buildUsageStats(docs, { requestedLimit: 50, availableTotal: 44 })).toMatchObject({
      total: 44,
      requestedLimit: 50,
      availableTotal: 44,
      attributedTotal: 44,
      unattributed: 0,
      deepseek: 42,
      groq: 2,
    });

    expect(buildUsageStats([{ provider: 'deepseek' }, { provider: '' }], { requestedLimit: 50 })).toMatchObject({
      total: 2,
      attributedTotal: 1,
      unattributed: 1,
    });
    expect(buildUsageStats([], { requestedLimit: 50, error: true }).total).toBeNull();
  });

  it('separates completion health from transport reachability', () => {
    expect(summarizeCompletionHealth({ 'openrouter:slot1': { status: 'rate_limited' } }, 'openrouter')).toBe('rate_limited');
    expect(summarizeCompletionHealth({ 'deepseek:primary': { status: 'success' } }, 'deepseek')).toBe('healthy');
    expect(summarizeCompletionHealth({}, 'groq')).toBe('no_recorded_probe');
  });
});
