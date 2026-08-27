import { describe, expect, it } from 'vitest';
import { isUnauthorizedAppwriteError } from './authSession';

describe('isUnauthorizedAppwriteError', () => {
  it('recognizes numeric and string 401 responses', () => {
    expect(isUnauthorizedAppwriteError({ code: 401 })).toBe(true);
    expect(isUnauthorizedAppwriteError({ code: '401' })).toBe(true);
  });

  it('does not treat transient or unrelated failures as session expiry', () => {
    expect(isUnauthorizedAppwriteError(new TypeError('network failure'))).toBe(false);
    expect(isUnauthorizedAppwriteError({ code: 408 })).toBe(false);
    expect(isUnauthorizedAppwriteError({ message: 'offline' })).toBe(false);
    expect(isUnauthorizedAppwriteError(null)).toBe(false);
  });
});
