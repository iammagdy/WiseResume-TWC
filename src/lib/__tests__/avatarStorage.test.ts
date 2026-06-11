import { describe, expect, it } from 'vitest';
import { avatarFileIdForUser, withAvatarCacheBust } from '@/lib/avatarStorage';

describe('avatarStorage', () => {
  it('normalizes user IDs into stable file IDs', () => {
    expect(avatarFileIdForUser('abc-123')).toBe('abc-123');
    expect(avatarFileIdForUser('user/with/slashes')).toBe('user_with_slashes');
    expect(avatarFileIdForUser('x'.repeat(40)).length).toBeLessThanOrEqual(36);
  });

  it('appends cache-bust version to view URLs', () => {
    expect(withAvatarCacheBust('https://example.com/view?project=1', '2026-01-01')).toBe(
      'https://example.com/view?project=1&v=2026-01-01',
    );
    expect(withAvatarCacheBust('https://example.com/view', 'v2')).toBe(
      'https://example.com/view?v=v2',
    );
    expect(withAvatarCacheBust(null, 'v2')).toBeNull();
  });
});
