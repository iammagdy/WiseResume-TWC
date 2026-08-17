import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildSanitizedCrashDedupeKey,
  removeSensitiveParamsFromCurrentAddressBar,
  removeSensitiveUrlParameters,
  sanitizeSensitiveText,
  sanitizeSensitiveUrl,
} from './sensitiveUrlSanitizer';

describe('sensitive URL sanitization', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    localStorage.clear();
    sessionStorage.clear();
  });

  it('redacts recovery and OAuth query/hash variants without retaining their values', () => {
    const values = ['secret-value', 'challenge-value', 'access-value', 'oauth-state-value', 'code-value'];
    const sanitized = sanitizeSensitiveUrl(
      `/auth/reset-password?secret=${values[0]}&challenge_token=${values[1]}&safe=keep` +
      `#/callback?access-token=${values[2]}&oauth_state=${values[3]}&authorizationCode=${values[4]}&view=summary`,
    );

    for (const value of values) expect(sanitized).not.toContain(value);
    expect(sanitized).toContain('safe=keep');
    expect(sanitized).toContain('view=summary');
    expect(decodeURIComponent(sanitized)).toContain('[REDACTED]');
  });

  it('redacts URL assignments embedded in error messages and stack text', () => {
    const text = [
      'Request failed at https://example.test/callback?token=url-token&safe=1',
      'challengeToken=challenge-token',
      '#access_token=access-token',
      'oauth-state=oauth-state-token',
    ].join('\n');

    const sanitized = sanitizeSensitiveText(text);
    expect(sanitized).not.toContain('url-token');
    expect(sanitized).not.toContain('challenge-token');
    expect(sanitized).not.toContain('access-token');
    expect(sanitized).not.toContain('oauth-state-token');
    expect(sanitized).toContain('safe=1');
  });

  it('removes credentials and paired identifiers from a URL while preserving safe state', () => {
    const cleaned = removeSensitiveUrlParameters(
      '/auth/reset-password?email=person%40example.test&challengeToken=challenge&safe=1#?secret=secret&view=ready',
      ['email'],
    );

    expect(cleaned).toBe('/auth/reset-password?safe=1#?view=ready');
  });

  it('scrubs the current history entry without losing unrelated params or history state', () => {
    window.history.replaceState(
      { routerKey: 'preserved' },
      '',
      '/auth/verify-email?userId=user-1&secret=verify-secret&locale=ar#?state=oauth-state&view=confirm',
    );

    expect(removeSensitiveParamsFromCurrentAddressBar(['userId'])).toBe(true);
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe(
      '/auth/verify-email?locale=ar#?view=confirm',
    );
    expect(window.history.state).toEqual({ routerKey: 'preserved' });
  });

  it('builds opaque storage keys that contain no route or credential value', () => {
    const secret = 'never-store-this-secret';
    const key = buildSanitizedCrashDedupeKey(
      'Error',
      `Failed request: token=${secret}`,
      `/auth/reset-password?challengeToken=${secret}`,
    );

    localStorage.setItem(key, '1');
    const storedKeys = Object.keys(localStorage).join('\n');
    expect(key).toMatch(/^wr-crash-auto:[a-z0-9]+$/);
    expect(storedKeys).not.toContain(secret);
    expect(storedKeys).not.toContain('challengeToken');
    expect(storedKeys).not.toContain('/auth/reset-password');
  });
});
