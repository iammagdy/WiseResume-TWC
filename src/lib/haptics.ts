/**
 * Web-only haptic feedback utilities. The Capacitor native shell was
 * removed in favor of a standalone Expo app (`mobile/`), where haptics
 * are handled by `expo-haptics`. On the web we fall back to the
 * Vibration API where available and silently no-op elsewhere.
 */

const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

const webVibrate = (pattern: number | number[]) => {
  if (canVibrate) navigator.vibrate(pattern);
};

export const haptics = {
  light: () => webVibrate(10),
  medium: () => webVibrate(25),
  heavy: () => webVibrate(50),
  success: () => webVibrate([10, 50, 10]),
  warning: () => webVibrate([30, 50, 30]),
  error: () => webVibrate([50, 100, 50, 100, 50]),
  selection: () => webVibrate(5),
};

export default haptics;
