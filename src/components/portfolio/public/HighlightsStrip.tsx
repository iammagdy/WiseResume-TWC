import { useRef, useCallback, useEffect, useMemo } from 'react';

export interface Highlight {
  id: string;
  value: string;
  label: string;
}

interface HighlightsStripProps {
  highlights: Highlight[];
  accentColor: string;
}

export function HighlightsStrip({ highlights, accentColor }: HighlightsStripProps) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const counterRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const setCounterRef = useCallback((el: HTMLSpanElement | null, idx: number) => {
    counterRefs.current[idx] = el;
  }, []);

  const parsedValues = useMemo(() =>
    highlights.map(h => {
      const num = parseInt(h.value.replace(/[^0-9]/g, ''), 10);
      const suffix = h.value.replace(/[0-9]/g, '').trim();
      return { num: isNaN(num) ? 0 : num, suffix };
    }), [highlights]);

  useEffect(() => {
    if (!stripRef.current) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();

      parsedValues.forEach(({ num, suffix }, idx) => {
        const el = counterRefs.current[idx];
        if (!el) return;
        if (prefersReduced || num === 0) {
          el.textContent = `${num}${suffix}`;
          return;
        }
        const duration = 1200;
        const start = performance.now();
        const animate = (now: number) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = `${Math.round(eased * num)}${suffix}`;
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      });
    }, { threshold: 0.5 });

    observer.observe(stripRef.current);
    return () => observer.disconnect();
  }, [parsedValues]);

  if (!highlights.length) return null;

  return (
    <div
      ref={stripRef}
      className="pf-stats-strip grid gap-3 my-6 mx-2 p-4 rounded-2xl"
      style={{
        gridTemplateColumns: `repeat(${highlights.length}, 1fr)`,
        background: `color-mix(in srgb, ${accentColor} 8%, transparent)`,
        border: `1px solid color-mix(in srgb, ${accentColor} 20%, transparent)`,
      }}
    >
      {highlights.map((h, i) => (
        <div key={h.id} className="text-center">
          <span
            ref={(el) => setCounterRef(el, i)}
            className="text-2xl font-black tabular-nums"
            style={{ color: accentColor }}
          >
            0{parsedValues[i]?.suffix || ''}
          </span>
          <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
            {h.label}
          </p>
        </div>
      ))}
    </div>
  );
}
