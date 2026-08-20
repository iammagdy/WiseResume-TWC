import { afterEach, describe, expect, it, vi } from 'vitest';

import { supportsWebVitals } from '../reportWebVitals';

describe('web-vitals browser compatibility', () => {
  const originalAt = Object.getOwnPropertyDescriptor(Array.prototype, 'at');

  afterEach(() => {
    if (originalAt) {
      Object.defineProperty(Array.prototype, 'at', originalAt);
    }
    vi.unstubAllGlobals();
  });

  it('does not enable web-vitals when the runtime lacks Array.prototype.at', () => {
    vi.stubGlobal('PerformanceObserver', class {});
    Object.defineProperty(Array.prototype, 'at', {
      configurable: true,
      value: undefined,
    });

    expect(supportsWebVitals()).toBe(false);
  });
});
