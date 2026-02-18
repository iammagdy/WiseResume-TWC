import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

interface UseAppLifecycleOptions {
  /** Called when app moves to background (visibilitychange hidden / Capacitor appStateChange inactive) */
  onBackground?: () => void;
  /** Called when app returns to foreground */
  onForeground?: () => void;
}

/**
 * Listens for app lifecycle events on both web (visibilitychange) and
 * native (Capacitor appStateChange). Fires callbacks when the app
 * moves to background or returns to foreground.
 *
 * Primary use-case: flush pending cloud saves before the OS can kill the WebView.
 */
export function useAppLifecycle({ onBackground, onForeground }: UseAppLifecycleOptions) {
  const bgRef = useRef(onBackground);
  const fgRef = useRef(onForeground);
  bgRef.current = onBackground;
  fgRef.current = onForeground;

  useEffect(() => {
    // --- Web / PWA: visibilitychange ---
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        bgRef.current?.();
      } else if (document.visibilityState === 'visible') {
        fgRef.current?.();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // --- Capacitor native: appStateChange ---
    let removeNativeListener: (() => void) | undefined;

    if (Capacitor.isNativePlatform()) {
      import('@capacitor/app').then(({ App }) => {
        App.addListener('appStateChange', ({ isActive }) => {
          if (!isActive) {
            bgRef.current?.();
          } else {
            fgRef.current?.();
          }
        }).then(handle => {
          removeNativeListener = () => handle.remove();
        });
      }).catch(() => {
        // @capacitor/app not available — web-only, ignore
      });
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      removeNativeListener?.();
    };
  }, []);
}
