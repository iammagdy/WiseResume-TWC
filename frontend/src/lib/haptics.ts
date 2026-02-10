/**
 * Haptic feedback utilities for native-like interactions
 * Uses Web Vibration API for broad mobile support
 */

const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

export const haptics = {
  /** Light tap - for selections, toggles */
  light: () => {
    if (canVibrate) navigator.vibrate(10);
  },
  
  /** Medium impact - for button presses */
  medium: () => {
    if (canVibrate) navigator.vibrate(25);
  },
  
  /** Heavy impact - for confirmations, deletions */
  heavy: () => {
    if (canVibrate) navigator.vibrate(50);
  },
  
  /** Success pattern - for completed actions */
  success: () => {
    if (canVibrate) navigator.vibrate([10, 50, 10]);
  },
  
  /** Warning pattern - for alerts */
  warning: () => {
    if (canVibrate) navigator.vibrate([30, 50, 30]);
  },
  
  /** Error pattern - for failures */
  error: () => {
    if (canVibrate) navigator.vibrate([50, 100, 50, 100, 50]);
  },
  
  /** Selection changed */
  selection: () => {
    if (canVibrate) navigator.vibrate(5);
  },
};

export default haptics;
