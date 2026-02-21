import { useCallback, useRef } from 'react';

export function useTilt(maxDeg = 3) {
  const ref = useRef<HTMLDivElement | null>(null);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    // Skip on touch devices
    if (e.pointerType === 'touch') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `rotateY(${x * maxDeg}deg) rotateX(${-y * maxDeg}deg)`;
  }, [maxDeg]);

  const onPointerLeave = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transform = '';
  }, []);

  return { ref, onPointerMove, onPointerLeave };
}
