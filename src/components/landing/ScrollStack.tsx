import { useEffect, useRef, Children, ReactNode } from 'react';
import Lenis from 'lenis';
import './ScrollStack.css';

interface ScrollStackProps {
  children: ReactNode;
  useWindowScroll?: boolean;
  stickyTop?: number;
  scrollPerCard?: number;
  cardGap?: number;
  scaleStep?: number;
}

export interface ScrollStackItemProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function ScrollStackItem({ children, className = '', style }: ScrollStackItemProps) {
  return (
    <div className={`scroll-stack-item-content ${className}`} style={style}>
      {children}
    </div>
  );
}

export function ScrollStack({
  children,
  useWindowScroll = true,
  stickyTop = 80,
  scrollPerCard = 500,
  cardGap = 20,
  scaleStep = 0.03,
}: ScrollStackProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lenisRef = useRef<Lenis | null>(null);
  const rafRef = useRef<number | null>(null);

  const items = Children.toArray(children);
  const count = items.length;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const totalHeight = (count - 1) * scrollPerCard + vh;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const applyScroll = (scrollY: number) => {
      const containerTop = container.getBoundingClientRect().top + scrollY;

      cardRefs.current.forEach((card, i) => {
        if (!card) return;

        const cardScrollStart = containerTop + i * scrollPerCard;
        const exiting = i < count - 1
          ? Math.max(0, Math.min(1, (scrollY - cardScrollStart) / scrollPerCard))
          : 0;

        const scale = 1 - exiting * scaleStep;
        const translateY = -exiting * cardGap * 0.5;
        const opacity = 1 - exiting * 0.08;

        card.style.transform = `translateY(${translateY}px) scale(${scale})`;
        card.style.opacity = String(Math.max(0.85, opacity));
        card.style.transformOrigin = 'top center';
      });
    };

    if (useWindowScroll) {
      lenisRef.current = new Lenis({ autoRaf: false });

      const onLenisScroll = (l: Lenis) => {
        applyScroll(l.scroll);
      };

      lenisRef.current.on('scroll', onLenisScroll);

      const raf = (time: number) => {
        lenisRef.current?.raf(time);
        rafRef.current = requestAnimationFrame(raf);
      };
      rafRef.current = requestAnimationFrame(raf);

      applyScroll(window.scrollY);
    } else {
      lenisRef.current = new Lenis({
        wrapper: container,
        content: container.firstElementChild as HTMLElement,
        autoRaf: false,
      });

      const onLenisScroll = (l: Lenis) => {
        applyScroll(l.scroll);
      };

      lenisRef.current.on('scroll', onLenisScroll);

      const raf = (time: number) => {
        lenisRef.current?.raf(time);
        rafRef.current = requestAnimationFrame(raf);
      };
      rafRef.current = requestAnimationFrame(raf);
    }

    return () => {
      lenisRef.current?.destroy();
      lenisRef.current = null;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [useWindowScroll, count, scrollPerCard, cardGap, scaleStep]);

  return (
    <div
      ref={containerRef}
      className="scroll-stack-container"
      style={{ position: 'relative', height: totalHeight }}
    >
      {items.map((child, i) => (
        <div
          key={i}
          className="scroll-stack-slot"
          style={{
            position: 'sticky',
            top: stickyTop + i * cardGap,
            zIndex: i + 1,
          }}
        >
          <div
            ref={(el) => { cardRefs.current[i] = el; }}
            className="scroll-stack-item-inner"
            style={{
              transition: 'transform 0.08s linear, opacity 0.08s linear',
              willChange: 'transform',
            }}
          >
            {child}
          </div>
        </div>
      ))}
    </div>
  );
}
