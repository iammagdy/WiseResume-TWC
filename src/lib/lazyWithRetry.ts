import { lazy, ComponentType } from 'react';

const RELOAD_GUARD_KEY = 'wr.chunk-reload-attempted';

const CHUNK_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'Importing a module script failed',
  'Loading chunk',
  'Loading CSS chunk',
];

function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  if (typeof err !== 'object') return false;
  const e = err as { name?: string; message?: string };
  if (e.name === 'ChunkLoadError') return true;
  const msg = (e.message ?? '').toLowerCase();
  return CHUNK_ERROR_PATTERNS.some((p) => msg.includes(p.toLowerCase()));
}

function attemptSilentReload(err: unknown): boolean {
  if (import.meta.env.DEV) return false;
  if (typeof window === 'undefined') return false;
  if (!isChunkLoadError(err)) return false;
  try {
    if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return false;
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

function clearReloadGuardOnSuccess() {
  /* A successful chunk fetch is a real "post-reload boot is healthy"
     signal — stronger than the timer-based clear in main.tsx. We clear
     here too so a same-session future failure (e.g. the user keeps the
     tab open across yet another deploy) gets its own one-shot recovery
     budget. The main.tsx 8s timer remains as a belt-and-braces fallback
     for the (rare) case where no lazy chunk has loaded yet. */
  if (typeof window === 'undefined') return;
  try { sessionStorage.removeItem('wr.chunk-reload-attempted'); } catch { /* ignore */ }
}

function retryImport<T>(factory: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  return factory().then(
    (mod) => { clearReloadGuardOnSuccess(); return mod; },
  ).catch((err) => {
    // Chunk 404 (stale hash after a new deploy) cannot be fixed by retrying —
    // the old file is gone. Reload immediately on the first attempt so the
    // user gets the fresh HTML + new chunk hashes without waiting 7+ seconds.
    if (isChunkLoadError(err)) {
      if (attemptSilentReload(err)) {
        return new Promise<T>(() => {});
      }
    }
    if (retries <= 0) {
      throw err;
    }
    return new Promise<T>((resolve, reject) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const handler = () => {
          window.removeEventListener('online', handler);
          retryImport(factory, retries - 1, delay * 2).then(resolve).catch(reject);
        };
        window.addEventListener('online', handler);
        setTimeout(() => {
          window.removeEventListener('online', handler);
          retryImport(factory, retries - 1, delay * 2).then(resolve).catch(reject);
        }, 30000);
      } else {
        setTimeout(() => {
          retryImport(factory, retries - 1, delay * 2).then(resolve).catch(reject);
        }, delay);
      }
    });
  });
}

export function lazyWithRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() => retryImport(factory));
}
