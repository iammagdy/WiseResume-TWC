import { useEffect, useRef } from 'react';

interface UseAppLifecycleOptions {
  /** Called when the page becomes hidden (visibilitychange → hidden). */
  onBackground?: () => void;
  /** Called when the page becomes visible again. */
  onForeground?: () => void;
}

/**
 * Web-only app lifecycle hook listening to `visibilitychange`. The
 * Capacitor native bridge was removed; native lifecycle events are now
 * handled by the standalone Expo app (`mobile/`).
 */
export function useAppLifecycle({ onBackground, onForeground }: UseAppLifecycleOptions) {
  const bgRef = useRef(onBackground);
  const fgRef = useRef(onForeground);
  bgRef.current = onBackground;
  fgRef.current = onForeground;

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        bgRef.current?.();
      } else if (document.visibilityState === 'visible') {
        fgRef.current?.();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);
}
