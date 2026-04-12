import { useEffect, useRef, useCallback } from 'react';

export function useScrollFade<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const overflowing = el.scrollHeight > el.clientHeight + 2;
    el.classList.toggle('is-overflowing', overflowing);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener('scroll', update, { passive: true });

    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', update);
    };
  }, [update]);

  return ref;
}
