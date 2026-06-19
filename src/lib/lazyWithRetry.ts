import { lazy, ComponentType } from 'react';
import {
  attemptStaleAssetRecovery,
  clearStaleAssetRecoveryGuard,
  isStaleAssetError,
} from './staleAssetRecovery';

function attemptSilentReload(err: unknown): boolean {
  if (import.meta.env.DEV) return false;
  return attemptStaleAssetRecovery(err);
}

function clearReloadGuardOnSuccess() {
  /* A successful chunk fetch is a real "post-reload boot is healthy"
     signal — stronger than the timer-based clear in main.tsx. We clear
     here too so a same-session future failure (e.g. the user keeps the
     tab open across yet another deploy) gets its own one-shot recovery
     budget. The main.tsx 8s timer remains as a belt-and-braces fallback
     for the (rare) case where no lazy chunk has loaded yet. */
  if (typeof window === 'undefined') return;
  clearStaleAssetRecoveryGuard();
}

function retryImport<T>(factory: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  return factory().then(
    (mod) => { clearReloadGuardOnSuccess(); return mod; },
  ).catch((err) => {
    // Chunk 404 (stale hash after a new deploy) cannot be fixed by retrying —
    // the old file is gone. Reload immediately on the first attempt so the
    // user gets the fresh HTML + new chunk hashes without waiting 7+ seconds.
    if (isStaleAssetError(err)) {
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
