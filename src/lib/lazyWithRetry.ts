import { lazy, ComponentType } from 'react';

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
  return lazy(() => retryImport(factory));
}
