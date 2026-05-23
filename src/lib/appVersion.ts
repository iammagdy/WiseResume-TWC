declare const __APP_VERSION__: string;

/** App build version from package.json (injected at build time via Vite). */
export function getBuildVersion(): string {
  return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown';
}

/** UI label, e.g. `v4.7.3` — matches landing footer. */
export function getBuildVersionLabel(): string {
  const v = getBuildVersion();
  return v === 'unknown' ? v : `v${v}`;
}
