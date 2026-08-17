import { createHash } from 'node:crypto';

/**
 * Appwrite custom document IDs are limited to 36 characters and accept only
 * alphanumeric characters, dots, hyphens, and underscores. A 32-character
 * lowercase hexadecimal digest is deterministic and valid for every ID.
 */
export function createAppwriteDocumentId(namespace: string, scope: string, slot: number): string {
  return createHash('sha256')
    .update(`${namespace}:${scope}:${slot}`)
    .digest('hex')
    .slice(0, 32);
}
