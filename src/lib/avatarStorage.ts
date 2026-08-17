import { storage, ID, Permission, Role } from '@/lib/appwrite';
import { BUCKETS } from '@/lib/appwrite-collections';

/** Legacy stable ID used only to find avatar files created by older releases. */
export function avatarFileIdForUser(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 36);
}

/**
 * Avatar images must load without an authenticated browser session on public
 * portfolio pages and in exported documents. New file IDs are random and the
 * upload UI discloses that anyone holding the direct URL can view the image.
 */
export function avatarFilePermissions(userId: string): string[] {
  return [
    Permission.read(Role.any()),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];
}

/** Public view URL for an avatar file — usable in `<img>` without a session JWT. */
export function getAvatarViewUrl(fileId: string): string {
  return storage.getFileView({ bucketId: BUCKETS.avatars, fileId });
}

/** Extract an Appwrite avatar file ID only from this app's avatar bucket URL. */
export function avatarFileIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, typeof window === 'undefined' ? 'https://local.invalid' : window.location.origin);
    const marker = `/storage/buckets/${encodeURIComponent(BUCKETS.avatars)}/files/`;
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    const encodedId = parsed.pathname.slice(markerIndex + marker.length).split('/')[0];
    return encodedId ? decodeURIComponent(encodedId) : null;
  } catch {
    return null;
  }
}

export async function deleteAvatarByUrl(url: string | null | undefined): Promise<boolean> {
  const fileId = avatarFileIdFromUrl(url);
  if (!fileId) return false;
  await storage.deleteFile({ bucketId: BUCKETS.avatars, fileId });
  return true;
}

/** Append a version token so browsers refresh after a profile update. */
export function withAvatarCacheBust(url: string | null | undefined, version?: string | null): string | null {
  if (!url) return null;
  if (!version) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${encodeURIComponent(version)}`;
}

/**
 * Upload or replace the user's profile avatar. A random Appwrite ID keeps the
 * public image URL from being derivable from the account ID. Callers persist the
 * new URL before deleting any previous file so a failed profile save is recoverable.
 */
export async function uploadUserAvatar(
  userId: string,
  blob: Blob,
): Promise<string> {
  const fileId = ID.unique();
  const file = new File([blob], 'avatar.png', { type: 'image/png' });
  const perms = avatarFilePermissions(userId);

  await storage.createFile({ bucketId: BUCKETS.avatars, fileId, file, permissions: perms });

  return getAvatarViewUrl(fileId);
}
