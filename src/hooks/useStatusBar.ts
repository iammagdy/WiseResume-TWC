import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

function getThemeColor(): string {
  const isDark =
    document.documentElement.classList.contains('dark') ||
    (!document.documentElement.classList.contains('light') &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  return isDark ? '#0a0a14' : '#ffffff';
}

function getStatusBarStyle(isDark: boolean) {
  // Style.Dark = light icons (for dark backgrounds)
  // Style.Light = dark icons (for light backgrounds)
  return isDark ? 'Dark' : 'Light';
}

async function applyNativeStatusBar(color: string) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const isDark = color === '#0a0a14' || color.startsWith('#0a');
    await StatusBar.setBackgroundColor({ color });
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
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
