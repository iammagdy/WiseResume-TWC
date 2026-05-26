import { describe, it, expect } from 'vitest';
import { getAuthEmailCallbackParams, hasAuthEmailCallbackParams } from '../authEmailCallbackParams';

describe('getAuthEmailCallbackParams', () => {
  it('reads userId and secret from search params', () => {
    expect(
      getAuthEmailCallbackParams('?userId=abc&secret=xyz', ''),
    ).toEqual({ userId: 'abc', secret: 'xyz' });
  });

  it('reads userId and secret from hash when search is empty', () => {
    expect(
      getAuthEmailCallbackParams('', '#?userId=abc&secret=xyz'),
    ).toEqual({ userId: 'abc', secret: 'xyz' });
  });

  it('returns nulls when params are missing', () => {
    expect(getAuthEmailCallbackParams('', '')).toEqual({ userId: null, secret: null });
  });

  it('preserves plus signs in secrets (URL-encoded)', () => {
    expect(
      getAuthEmailCallbackParams('?userId=abc&secret=abc%2Bdef%2Bghi', ''),
    ).toEqual({ userId: 'abc', secret: 'abc+def+ghi' });
  });
});

describe('hasAuthEmailCallbackParams', () => {
  it('is true when both params exist', () => {
    expect(hasAuthEmailCallbackParams('?userId=a&secret=b', '')).toBe(true);
  });
});
