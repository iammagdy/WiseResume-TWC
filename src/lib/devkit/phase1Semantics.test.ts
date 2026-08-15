import { createRequire } from 'node:module';
import { classifyRequestFailure } from './phase1UiSemantics';

const require = createRequire(import.meta.url);
const {
  deriveExactUserCounts,
  effectivePlanCount,
  buildUsageStats,
  summarizeCompletionHealth,
  buildUnverifiedSummary,
  metricValueOrUnavailable,
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
    expect(summarizeCompletionHealth({
      'openrouter:slot1': { status: 'success' },
      'openrouter:slot2': { status: 'rate_limited' },
    }, 'openrouter')).toBe('mixed');
    expect(summarizeCompletionHealth({
      'openrouter:slot1': { status: 'success' },
      'openrouter:slot2': { status: 'success' },
    }, 'openrouter')).toBe('healthy');
    expect(summarizeCompletionHealth({}, 'groq')).toBe('no_recorded_probe');
  });

  it('renders backend failure as Unavailable rather than zero', () => {
    expect(metricValueOrUnavailable(null)).toBe('Unavailable');
    expect(metricValueOrUnavailable(undefined)).toBe('Unavailable');
    expect(metricValueOrUnavailable(0)).toBe(0);
    expect(effectivePlanCount({ error: 'query failed' })).toBeNull();
  });

  it('keeps the exact unverified total separate from the ten-user sample', () => {
    const sample = Array.from({ length: 12 }, (_, index) => ({ $id: `user-${index}` }));
    const summary = buildUnverifiedSummary(44, 12, sample, 10);
    expect(summary.unverifiedUsersTotal).toBe(12);
    expect(summary.unverifiedUsersTotalExact).toBe(true);
    expect(summary.unverifiedUsers).toHaveLength(10);
    expect(summary.unverifiedUsersSampleLimit).toBe(10);
    expect(summary.unverifiedUsersIsSample).toBe(true);
  });

  it('keeps App Overview timeout/error states terminal', () => {
    expect(classifyRequestFailure('Analytics request timed out after 45 seconds', 'timed out')).toBe('timeout');
    expect(classifyRequestFailure('Appwrite analytics request failed', 'timed out')).toBe('error');
  });

  it('keeps Onboarding timeout/error states terminal', () => {
    expect(classifyRequestFailure('Onboarding funnel request timed out after 45 seconds', 'timed out')).toBe('timeout');
    expect(classifyRequestFailure('Onboarding backend unavailable', 'timed out')).toBe('error');
  });
});
