import { lazy, ComponentType } from 'react';

export function lazyWithRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() =>
    factory().catch(() => {
      // Retry once after 1.5s; if that also fails, let ErrorBoundary handle it
      return new Promise<{ default: T }>((resolve, reject) =>
        setTimeout(() => factory().then(resolve).catch(reject), 1500)
      );
    })
  );
}
