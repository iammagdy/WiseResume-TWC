import { lazy, ComponentType } from 'react';

const RELOAD_KEY = 'wr-chunk-reload';

// Clear the reload guard on successful page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => sessionStorage.removeItem(RELOAD_KEY));
}

function retryImport<T>(factory: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  return factory().catch((err) => {
    if (retries <= 0) throw err;
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
  return lazy(() =>
    retryImport(factory).catch((err) => {
      // All retries exhausted — auto-reload once to get fresh module URLs
      if (typeof window !== 'undefined' && !sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, '1');
        window.location.reload();
      }
      throw err; // Falls through to ErrorBoundary if already reloaded once
    })
  );
}
