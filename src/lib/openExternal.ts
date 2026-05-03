/**
 * Opens a URL in a new browser tab. The Capacitor native shell was
 * removed in favor of a standalone Expo app (`mobile/`); on the web
 * this is a thin wrapper around `window.open`.
 */
export function openExternal(url: string) {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}
