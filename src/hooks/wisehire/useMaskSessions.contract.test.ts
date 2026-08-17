import { describe, expect, it } from 'vitest';
import { parseMaskResults } from './useMaskSessions';

describe('WiseHire mask-session persistence contract', () => {
  it('parses string-backed Appwrite results and marks old sessions for review', () => {
    expect(parseMaskResults(JSON.stringify([{
      label: 'Candidate 1',
      filename: 'candidate_1_review-draft.pdf',
      maskedText: '[NAME] worked at Example.',
      redactedFields: ['NAME', 123],
    }]))).toEqual([{
      label: 'Candidate 1',
      filename: 'candidate_1_review-draft.pdf',
      maskedText: '[NAME] worked at Example.',
      redactedFields: ['NAME'],
      reviewRequired: true,
    }]);
  });

  it('rejects malformed stored data', () => {
    expect(parseMaskResults('not-json')).toEqual([]);
    expect(parseMaskResults([{ label: 'Incomplete' }])).toEqual([]);
  });
});
