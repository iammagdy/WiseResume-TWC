import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Determines if the current theme is dark by checking the <html> class
 * and falling back to the OS preference.
 */
function isDarkTheme(): boolean {
  return (
    document.documentElement.classList.contains('dark') ||
    (!document.documentElement.classList.contains('light') &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
}

/**
 * Reads the actual --background CSS variable and converts it from HSL to a hex string.
 * Falls back to known theme colors if the variable isn't available.
 */
function getThemeColor(): string {
  const dark = isDarkTheme();

  try {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--background')
      .trim();

    if (raw) {
      // raw is e.g. "240 20% 4%" (Tailwind HSL without commas)
      const parts = raw.split(/\s+/);
      if (parts.length >= 3) {
        const h = parseFloat(parts[0]);
        const s = parseFloat(parts[1]) / 100;
        const l = parseFloat(parts[2]) / 100;
        return hslToHex(h, s, l);
      }
    }
  } catch {
    // getComputedStyle may throw in SSR-like environments
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

async function applyNativeStatusBar(color: string) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const dark = isDarkTheme();
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.show();
    await StatusBar.setBackgroundColor({ color });
    // Style.Dark = light-colored icons (for dark backgrounds)
    // Style.Light = dark-colored icons (for light backgrounds)
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
  } catch {
    // Plugin not available (web build) — silently ignore
  }
}

/**
 * Hook to control the status bar color for a specific page.
 * Updates both the HTML meta tag (PWA) and the native status bar (Capacitor).
 */
export function useStatusBar(color?: string) {
  useEffect(() => {
    const statusBarColor = color || getThemeColor();

    // Update PWA meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', statusBarColor);
    }

    // Update native status bar
    applyNativeStatusBar(statusBarColor);
  }, [color]);
}

/**
 * Global hook — syncs the status bar with the active theme.
 * Observes class changes on <html> and system prefers-color-scheme.
 * Call once inside AppRoutes.
 */
export function useStatusBarThemeSync() {
  useEffect(() => {
    const updateStatusBar = () => {
      const color = getThemeColor();

      // Update PWA meta tag
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', color);
      }

      // Update native status bar
      applyNativeStatusBar(color);
    };

    // Watch for theme class changes on <html>
    const observer = new MutationObserver(updateStatusBar);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Watch for OS-level theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateStatusBar);

    // Initial apply
    updateStatusBar();

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', updateStatusBar);
    };
  }, []);
}
