import { useEffect, useState, RefObject } from 'react';

interface ScrollProgressBarProps {
  containerRef: RefObject<HTMLElement>;
}

export function ScrollProgressBar({ containerRef }: ScrollProgressBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let raf: number;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const { scrollTop, scrollHeight, clientHeight } = el;
        const max = scrollHeight - clientHeight;
        setProgress(max > 0 ? (scrollTop / max) * 100 : 0);
      });
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [containerRef]);

  if (progress <= 0) return null;

  return (
    <div className="absolute top-0 left-0 right-0 h-[3px] z-40 bg-transparent pointer-events-none">
      <div
        className="h-full bg-primary transition-[width] duration-75 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
