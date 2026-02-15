import { Capacitor } from '@capacitor/core';

/**
 * Opens a URL in the system browser (safe for Capacitor WebView).
 * On native platforms, uses the system browser intent.
 * On web, falls back to window.open with _blank.
 */
export function openExternal(url: string) {
  if (!url) return;

  if (Capacitor.isNativePlatform()) {
    // Use _system to open in the device's default browser
    window.open(url, '_system');
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
