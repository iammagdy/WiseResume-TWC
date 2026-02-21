import { useRef, useCallback } from 'react';

/**
 * Returns a click handler that distinguishes single-tap from double-tap.
 * @param onSingleTap Called after delay if no second tap occurs
 * @param onDoubleTap Called immediately on second tap within threshold
 * @param delay Max ms between taps (default 300)
 */
export function useDoubleTap(
  onSingleTap: () => void,
  onDoubleTap: () => void,
  delay = 300,
) {
  const lastTap = useRef(0);
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  const handleClick = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < delay) {
      // Double tap
      clearTimeout(timeout.current);
      lastTap.current = 0;
      onDoubleTap();
    } else {
      lastTap.current = now;
      timeout.current = setTimeout(() => {
        lastTap.current = 0;
        onSingleTap();
      }, delay);
    }
  }, [onSingleTap, onDoubleTap, delay]);

  return handleClick;
}
