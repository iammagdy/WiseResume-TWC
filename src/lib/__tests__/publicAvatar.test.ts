import { describe, expect, it } from 'vitest';
import { buildAppwriteAvatarPreviewUrl, getPublicAvatarSources } from '@/lib/publicAvatar';

const appwriteAvatar = 'https://fra.cloud.appwrite.io/v1/storage/buckets/avatars/files/avatar-1/view?project=project-1&token=public-token';

describe('public avatar delivery', () => {
  it('builds a bounded square WebP preview while preserving approved query parameters', () => {
    const result = buildAppwriteAvatarPreviewUrl(appwriteAvatar, 288, 82);
    const url = new URL(result!);

    expect(url.pathname).toBe('/v1/storage/buckets/avatars/files/avatar-1/preview');
    expect(url.searchParams.get('project')).toBe('project-1');
    expect(url.searchParams.get('token')).toBe('public-token');
    expect(url.searchParams.get('width')).toBe('288');
    expect(url.searchParams.get('height')).toBe('288');
    expect(url.searchParams.get('quality')).toBe('82');
    expect(url.searchParams.get('output')).toBe('webp');
  });

  it('returns responsive first-party sources in ascending width order', () => {
    const result = getPublicAvatarSources(appwriteAvatar, [432, 160, 288, 288], '144px');

    expect(result.src).toContain('width=288');
    expect(result.srcSet).toContain('width=160');
    expect(result.srcSet).toContain('160w');
    expect(result.srcSet).toContain('width=432');
    expect(result.srcSet).toContain('432w');
    expect(result.sizes).toBe('144px');
  });

  it.each([
    'https://images.example.com/avatar.png',
    'https://example.com/v1/storage/buckets/avatars/files/avatar-1/view?project=project-1',
    'not-a-url',
  ])('leaves external or legacy avatar URLs unchanged: %s', (avatarUrl) => {
    expect(getPublicAvatarSources(avatarUrl, [160, 288], '144px')).toEqual({ src: avatarUrl });
  });
});
