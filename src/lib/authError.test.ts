import { describe, expect, it } from 'vitest';
import { authErrorMessage, classifyAuthError } from './authError';

describe('auth error classification', () => {
  it('keeps invalid credentials generic', () => {
    const result = classifyAuthError({
      code: 401,
      type: 'user_invalid_credentials',
      message: 'password mismatch for user@example.com',
    });

    expect(result.kind).toBe('invalid_credentials');
    expect(authErrorMessage(result.kind)).toContain('Invalid email or password');
    expect(authErrorMessage(result.kind)).not.toContain('user@example.com');
  });

  it.each([
    [{ code: 429 }, 'rate_limited'],
    [{ code: 503 }, 'service_unavailable'],
    [new TypeError('Failed to fetch'), 'network_unavailable'],
    [{ code: 'new_unknown_code', message: 'private internal detail' }, 'unknown'],
  ])('classifies %o safely', (error, expectedKind) => {
    expect(classifyAuthError(error).kind).toBe(expectedKind);
  });

  it('keeps only bounded safe metadata and never includes credential values', () => {
    const result = classifyAuthError({
      code: 500,
      type: 'server_error',
      message: 'password=secret user@example.com',
      requestId: 'req-123',
    });

    expect(result).toEqual({
      kind: 'service_unavailable',
      status: 500,
      code: '500',
      type: 'server_error',
      requestId: 'req-123',
    });
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(JSON.stringify(result)).not.toContain('user@example.com');
  });
});
