const FULL_SHA256_LENGTH = 64;
const LEGACY_PREFIX_LENGTH = 16;
const HEX_HASH = /^[a-f0-9]+$/;

function normalizeHash(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? '';
  if (!HEX_HASH.test(normalized)) return null;
  if (normalized.length !== FULL_SHA256_LENGTH && normalized.length !== LEGACY_PREFIX_LENGTH) return null;
  return normalized;
}

export function compareSourceHashes(
  currentHash: string | null | undefined,
  deployedHash: string | null | undefined,
): boolean {
  const current = normalizeHash(currentHash);
  const deployed = normalizeHash(deployedHash);
  if (!current || !deployed || current.length !== FULL_SHA256_LENGTH) return false;
  return deployed.length === FULL_SHA256_LENGTH
    ? current === deployed
    : current.slice(0, LEGACY_PREFIX_LENGTH) === deployed;
}

export function formatHashLabel(hash: string): string {
  const normalized = hash.trim();
  return normalized.length === FULL_SHA256_LENGTH
    ? `${normalized} (full SHA-256)`
    : `${normalized} (16-char prefix)`;
}
