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
  // SDK v25: getFileView() returns a plain string URL (not a URL object).
  return storage.getFileView({ bucketId: BUCKETS.avatars, fileId });
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
 *
 * Strategy: attempt createFile directly (fast path for first upload). If Appwrite
 * rejects with "already exists" it means a previous file occupies that ID and the
 * earlier deleteFile was blocked (e.g. File Security not enabled on the bucket, or
 * the old file was created without per-user delete permission). In that case we
 * force-delete the blocking file and retry once. This avoids the race window of
 * the old delete+create approach and works regardless of bucket security settings.
 */
export async function uploadUserAvatar(userId: string, blob: Blob): Promise<string> {
  const fileId = avatarFileIdForUser(userId);
  const file = new File([blob], 'avatar.png', { type: 'image/png' });
  const perms = avatarFilePermissions(userId);

  const tryCreate = () =>
    storage.createFile({ bucketId: BUCKETS.avatars, fileId, file, permissions: perms });

  try {
    await tryCreate();
  } catch (firstErr) {
    const alreadyExists =
      firstErr instanceof Error &&
      firstErr.message.toLowerCase().includes('already exists');

    if (!alreadyExists) throw firstErr;

    // Old file is blocking the upload — delete it then retry.
    try {
      await storage.deleteFile({ bucketId: BUCKETS.avatars, fileId });
    } catch {
      // If delete is also rejected (e.g. no File Security on bucket), fall back to
      // a unique timestamp-based ID so the upload always succeeds.
      const fallbackId = `${fileId.slice(0, 29)}_${Date.now().toString(36)}`.slice(0, 36);
      await storage.createFile({
        bucketId: BUCKETS.avatars,
        fileId: fallbackId,
        file,
        permissions: perms,
      });
      return getAvatarViewUrl(fallbackId);
    }

    // Retry with the stable ID now that the old file is gone.
    await tryCreate();
  }

  return getAvatarViewUrl(fileId);
}
