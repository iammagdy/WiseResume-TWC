import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

/**
 * web-vitals 5 uses Array.prototype.at in its metric collection path. Older
 * browsers should keep the application running even when that API is absent;
 * visitor analytics remains enabled independently.
 */
export function supportsWebVitals(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof PerformanceObserver !== 'undefined' &&
    typeof Array.prototype.at === 'function'
  );
}

export function reportWebVitals() {
  if (!supportsWebVitals()) return;

  onCLS(console.log);
  onFCP(console.log);
  onINP(console.log);
  onLCP(console.log);
  onTTFB(console.log);
}
