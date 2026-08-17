import { describe, expect, it } from 'vitest';
import { parseScreenResults } from './useBulkScreen';

describe('WiseHire bulk review persistence contract', () => {
  it('parses Appwrite string attributes and normalizes untrusted history values', () => {
    const parsed = parseScreenResults(JSON.stringify([
      {
        rank: 1,
        filename_name: 'candidate.pdf',
        match_score: 150,
        strengths: ['Supported evidence', 123],
        concerns: ['Verify dates'],
        summary: 'Review summary',
      },
      { injected: true },
    ]));

    expect(parsed).toEqual([{
      rank: 1,
      filename_name: 'candidate.pdf',
      match_score: 100,
      strengths: ['Supported evidence'],
      concerns: ['Verify dates'],
      summary: 'Review summary',
    }]);
  });

  it('keeps missing scores unavailable instead of coercing them to zero', () => {
    expect(parseScreenResults([{
      rank: 1,
      filename_name: 'candidate.pdf',
      match_score: null,
      strengths: [],
      concerns: [],
      summary: '',
    }])?.[0].match_score).toBeNull();
    expect(parseScreenResults('not-json')).toBeNull();
  });
});
