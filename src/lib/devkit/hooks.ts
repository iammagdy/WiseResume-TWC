import { useEffect, useRef, useCallback } from 'react';

/**
 * Returns a stable callback `isMounted()` that returns false after the
 * component using this hook unmounts. Use it to guard `setState` calls
 * inside async functions so we don't warn (or worse, leak) on unmount.
 */
export function useIsMounted(): () => boolean {
  const ref = useRef(true);
  useEffect(() => {
    ref.current = true;
    return () => { ref.current = false; };
  }, []);
  return useCallback(() => ref.current, []);
}

/**
 * Returns a ref that produces a fresh AbortController for each fetch and
 * aborts the previous one. The current controller is also aborted on
 * unmount. Pair the returned `signal` with `fetch(..., { signal })` or
 * check `signal.aborted` after async hops.
 */
export function useAbortOnUnmount() {
  const ref = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      ref.current?.abort();
    };
  }, []);

  const next = useCallback((): AbortController => {
    ref.current?.abort();
    const controller = new AbortController();
    ref.current = controller;
    return controller;
  }, []);

  return { next, current: () => ref.current };
}

/**
 * Pause-aware interval. Runs `fn` every `intervalMs` while the document is
 * visible AND the component is mounted; pauses while hidden; cleans up on
 * unmount. Returns nothing — fire-and-forget. The first invocation is at
 * `intervalMs`, not immediately, matching `setInterval` semantics.
 */
export function useVisibleInterval(fn: () => void, intervalMs: number, enabled = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;
    let id: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (id !== null) return;
      id = setInterval(() => fnRef.current(), intervalMs);
    };
    const stop = () => {
      if (id === null) return;
      clearInterval(id);
      id = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') stop();
      else start();
    };

    if (document.visibilityState !== 'hidden') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, [intervalMs, enabled]);
}
