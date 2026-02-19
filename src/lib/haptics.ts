/**
 * Haptic feedback utilities for native-like interactions.
 * On Capacitor native (iOS/Android), uses @capacitor/haptics for
 * proper UIImpactFeedbackGenerator / HapticFeedback engine.
 * Falls back to Web Vibration API on Android Chrome PWA.
 * Silently no-ops on iOS Safari (no Vibration API support).
 */

import { Capacitor } from '@capacitor/core';

// Lazily import native haptics to avoid bundle cost on web
let nativeHaptics: typeof import('@capacitor/haptics') | null = null;

async function getNativeHaptics() {
  if (!Capacitor.isNativePlatform()) return null;
  if (nativeHaptics) return nativeHaptics;
  try {
    nativeHaptics = await import('@capacitor/haptics');
    return nativeHaptics;
  } catch {
    return null;
  }
}

const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

const webVibrate = (pattern: number | number[]) => {
  if (canVibrate) navigator.vibrate(pattern);
};

export const haptics = {
  /** Light tap — selections, toggles */
  light: () => {
    getNativeHaptics().then((h) => {
      if (h) {
        h.Haptics.impact({ style: h.ImpactStyle.Light });
      } else {
        webVibrate(10);
      }
    });
  },

  /** Medium impact — button presses */
  medium: () => {
    getNativeHaptics().then((h) => {
      if (h) {
        h.Haptics.impact({ style: h.ImpactStyle.Medium });
      } else {
        webVibrate(25);
      }
    });
  },

  /** Heavy impact — confirmations, deletions */
  heavy: () => {
    getNativeHaptics().then((h) => {
      if (h) {
        h.Haptics.impact({ style: h.ImpactStyle.Heavy });
      } else {
        webVibrate(50);
      }
    });
  },

  /** Success notification */
  success: () => {
    getNativeHaptics().then((h) => {
      if (h) {
        h.Haptics.notification({ type: h.NotificationType.Success });
      } else {
        webVibrate([10, 50, 10]);
      }
    });
  },

  /** Warning notification */
  warning: () => {
    getNativeHaptics().then((h) => {
      if (h) {
        h.Haptics.notification({ type: h.NotificationType.Warning });
      } else {
        webVibrate([30, 50, 30]);
      }
    });
  },

  /** Error notification */
  error: () => {
    getNativeHaptics().then((h) => {
      if (h) {
        h.Haptics.notification({ type: h.NotificationType.Error });
      } else {
        webVibrate([50, 100, 50, 100, 50]);
      }
    });
  },

  /** Selection changed */
  selection: () => {
    getNativeHaptics().then((h) => {
      if (h) {
        h.Haptics.selectionChanged();
      } else {
        webVibrate(5);
      }
    });
  },
};

export default haptics;
