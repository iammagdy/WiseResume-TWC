import { lazy, ComponentType } from 'react';

export function lazyWithRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() =>
    factory().catch(() => {
      return new Promise<{ default: T }>((resolve, reject) =>
        setTimeout(() => factory().then(resolve).catch(reject), 1000)
      ).catch(() => {
        window.location.reload();
        return { default: (() => null) as unknown as T };
      });
    })
  );
}
