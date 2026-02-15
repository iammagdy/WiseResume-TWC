import { lazy, ComponentType } from 'react';

export function lazyWithRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() =>
    factory().catch(() => {
      return new Promise<{ default: T }>((resolve, reject) => {
        const attemptRetry = () => {
          setTimeout(() => factory().then(resolve).catch(reject), 1500);
        };

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          // Wait for network to come back before retrying
          const handler = () => {
            window.removeEventListener('online', handler);
            attemptRetry();
          };
          window.addEventListener('online', handler);
          // Timeout after 30s even if still offline
          setTimeout(() => {
            window.removeEventListener('online', handler);
            factory().then(resolve).catch(reject);
          }, 30000);
        } else {
          // Online but failed — retry after 1.5s
          attemptRetry();
        }
      });
    })
  );
}
