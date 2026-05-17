import { useEffect, useRef, RefObject } from 'react';

interface ScrollProgressBarProps {
  containerRef: RefObject<HTMLElement>;
}

export function ScrollProgressBar({ containerRef }: ScrollProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let raf: number;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const { scrollTop, scrollHeight, clientHeight } = el;
        const max = scrollHeight - clientHeight;
        const pct = max > 0 ? (scrollTop / max) * 100 : 0;
        if (barRef.current) barRef.current.style.width = `${pct}%`;
        if (wrapRef.current) wrapRef.current.style.display = pct <= 0 ? 'none' : 'block';
      });
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [containerRef]);

  return (
    <div ref={wrapRef} className="sticky top-0 left-0 right-0 h-[3px] z-50 bg-transparent pointer-events-none" style={{ display: 'none' }}>
      <div
        ref={barRef}
        className="h-full bg-primary"
        style={{ width: '0%', transition: 'width 75ms linear' }}
      />
    </div>
  );
}
