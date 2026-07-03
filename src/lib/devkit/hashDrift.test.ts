import { describe, expect, it } from 'vitest';

import { compareSourceHashes, formatHashLabel } from './hashDrift';

const FULL_HASH = 'ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789';

describe('DevKit source hash drift', () => {
  it('accepts a matching deployed 16-character prefix', () => {
    expect(compareSourceHashes(FULL_HASH, 'abcdef0123456789')).toBe(true);
  });

  it('compares full deployed hashes completely', () => {
    expect(compareSourceHashes(FULL_HASH, FULL_HASH.toLowerCase())).toBe(true);
    expect(compareSourceHashes(FULL_HASH, `${FULL_HASH.slice(0, -1)}0`)).toBe(false);
  });

  it('normalizes surrounding whitespace and case', () => {
    expect(compareSourceHashes(`  ${FULL_HASH}\n`, '  abcdef0123456789  ')).toBe(true);
  });

  it('rejects missing, malformed, and different hashes', () => {
    expect(compareSourceHashes(FULL_HASH, undefined)).toBe(false);
    expect(compareSourceHashes('not-a-hash', 'not-a-hash')).toBe(false);
    expect(compareSourceHashes(FULL_HASH, '0000000000000000')).toBe(false);
  });

  it('labels full hashes and legacy prefixes accurately', () => {
    expect(formatHashLabel(FULL_HASH)).toContain('full SHA-256');
    expect(formatHashLabel(FULL_HASH.slice(0, 16))).toContain('16-char prefix');
  });
});
