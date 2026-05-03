import { useEffect } from 'react';
import { isBrowser, getSafeMatchMedia } from '@/lib/envUtils';

/**
 * Web-only status-bar / theme-color sync. Capacitor's native status
 * bar plugin was removed; the standalone Expo app (`mobile/`) handles
 * native status-bar styling via `expo-status-bar`.
 */
function isDarkTheme(): boolean {
  if (!isBrowser) return true;
  return (
    document.documentElement.classList.contains('dark') ||
    (!document.documentElement.classList.contains('light') &&
      getSafeMatchMedia('(prefers-color-scheme: dark)').matches)
  );
}

function getThemeColor(): string {
  const dark = isDarkTheme();
  if (!isBrowser) return dark ? '#09091a' : '#ffffff';
  try {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--background')
      .trim();
    if (raw) {
      const parts = raw.split(/\s+/);
      if (parts.length >= 3) {
        const h = parseFloat(parts[0]);
        const s = parseFloat(parts[1]) / 100;
        const l = parseFloat(parts[2]) / 100;
        return hslToHex(h, s, l);
      }
    }
  } catch {
    // getComputedStyle may throw outside the browser
  }
  return dark ? '#09091a' : '#ffffff';
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * Math.max(0, Math.min(1, color)))
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function setMetaThemeColor(color: string) {
  if (!isBrowser) return;
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) metaThemeColor.setAttribute('content', color);
}

export function useStatusBar(color?: string) {
  useEffect(() => {
    if (!isBrowser) return;
    setMetaThemeColor(color || getThemeColor());
  }, [color]);
}

export function useStatusBarThemeSync() {
  useEffect(() => {
    if (!isBrowser) return;
    const update = () => setMetaThemeColor(getThemeColor());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const mediaQuery = getSafeMatchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', update);
    update();
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', update);
    };
  }, []);
}
