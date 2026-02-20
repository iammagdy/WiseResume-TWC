import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { haptics } from '@/lib/haptics';
import { triggerBugReport } from '@/lib/bugReport';
import { activityTracker } from '@/lib/activityTracker';

const THRESHOLD = 25;
const SHAKE_COUNT = 4;
const SHAKE_WINDOW_MS = 1000;
const COOLDOWN_MS = 5000;

/**
 * Detects device shake via accelerometer and triggers the bug report dialog.
 * Works on mobile devices that support DeviceMotionEvent.
 */
export function useShakeDetect(enabled: boolean) {
  const location = useLocation();
  const shakeTimestamps = useRef<number[]>([]);
  const lastTrigger = useRef(0);
  const permissionGranted = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return;

    // Request iOS 13+ permission
    const requestPermission = async () => {
      const DME = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
      if (typeof DME.requestPermission === 'function') {
        try {
          const result = await DME.requestPermission();
          permissionGranted.current = result === 'granted';
        } catch {
          permissionGranted.current = false;
        }
      } else {
        permissionGranted.current = true;
      }
    };

    requestPermission();

    const handleMotion = (e: DeviceMotionEvent) => {
      if (!permissionGranted.current) return;

      const { x, y, z } = e.accelerationIncludingGravity || {};
      if (x == null || y == null || z == null) return;

      const magnitude = Math.sqrt(x * x + y * y + z * z);
      if (magnitude < THRESHOLD) return;

      const now = Date.now();

      // Cooldown check
      if (now - lastTrigger.current < COOLDOWN_MS) return;

      // Add timestamp and prune old ones
      shakeTimestamps.current.push(now);
      shakeTimestamps.current = shakeTimestamps.current.filter(
        (t) => now - t < SHAKE_WINDOW_MS
      );

      if (shakeTimestamps.current.length >= SHAKE_COUNT) {
        lastTrigger.current = now;
        shakeTimestamps.current = [];

        haptics.heavy();
        const snapshot = activityTracker.getSnapshot();
        triggerBugReport({
          errorMessage: snapshot.recentErrors[0]?.message || 'Bug report via shake gesture',
          errorStack: snapshot.recentErrors[0]?.stack,
          route: location.pathname,
          action: snapshot.activeFeature || undefined,
          source: 'shake',
          detectedContext: {
            activeFeature: snapshot.activeFeature,
            recentErrors: snapshot.recentErrors,
          },
        });
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [enabled, location.pathname]);
}
