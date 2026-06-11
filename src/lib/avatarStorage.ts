import { storage, Permission, Role } from '@/lib/appwrite';
import { BUCKETS } from '@/lib/appwrite-collections';

/** Stable Appwrite file ID for a user's profile avatar (max 36 chars). */
export function avatarFileIdForUser(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 36);
}

/** Permissions so avatar images load in `<img>` tags and on public portfolio pages. */
export function avatarFilePermissions(userId: string): string[] {
  return [
    Permission.read(Role.any()),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];
}

/** Public view URL for an avatar file — usable in `<img>` without a session JWT. */
export function getAvatarViewUrl(fileId: string): string {
  return storage.getFileView(BUCKETS.avatars, fileId).href;
}

/** Append a version token so browsers refresh after re-uploading the same file ID. */
export function withAvatarCacheBust(url: string | null | undefined, version?: string | null): string | null {
  if (!url) return null;
  if (!version) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${encodeURIComponent(version)}`;
}

/**
 * Upload (or replace) the user's profile avatar.
 * Files are world-readable so PlanAvatar, public portfolio, and PDF export can load them.
 */
export async function uploadUserAvatar(userId: string, blob: Blob): Promise<string> {
  const fileId = avatarFileIdForUser(userId);
  const file = new File([blob], 'avatar.png', { type: 'image/png' });

  try {
    await storage.deleteFile(BUCKETS.avatars, fileId);
  } catch {
    /* first upload */
  }

  await storage.createFile(BUCKETS.avatars, fileId, file, avatarFilePermissions(userId));

  return getAvatarViewUrl(fileId);
}
