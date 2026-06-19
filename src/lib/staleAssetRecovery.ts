export const STALE_ASSET_RELOAD_GUARD_KEY = 'wr.chunk-reload-attempted';

const STALE_ASSET_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'Importing a module script failed',
  'Unable to preload CSS',
  'Loading chunk',
  'Loading CSS chunk',
];

type ReloadWindow = Window & {
  location: Location & { reload: () => void };
};

interface RecoveryOptions {
  reload?: () => void;
}

export function isStaleAssetError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; message?: string };
  if (e.name === 'ChunkLoadError') return true;
  const msg = (e.message ?? '').toLowerCase();
  return STALE_ASSET_ERROR_PATTERNS.some((pattern) =>
    msg.includes(pattern.toLowerCase()),
  );
}

export function clearStaleAssetRecoveryGuard(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STALE_ASSET_RELOAD_GUARD_KEY);
  } catch {
    // Storage can throw in private browsing or locked-down enterprise modes.
  }
}

export function attemptStaleAssetRecovery(
  err: unknown,
  options: RecoveryOptions = {},
): boolean {
  if (typeof window === 'undefined') return false;
  if (!isStaleAssetError(err)) return false;

  try {
    if (sessionStorage.getItem(STALE_ASSET_RELOAD_GUARD_KEY)) return false;
    sessionStorage.setItem(STALE_ASSET_RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    return false;
  }

  const reload =
    options.reload ??
    (() => {
      (window as ReloadWindow).location.reload();
    });
  reload();
  return true;
}
