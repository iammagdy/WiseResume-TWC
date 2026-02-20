import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { parseResumeDate } from '@/lib/dateUtils';
import type { Experience } from '@/types/resume';

interface StatsStripProps {
  experience: Experience[];
  skillCount: number;
  accentColor: string;
}

export function StatsStrip({ experience, skillCount, accentColor }: StatsStripProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const animatedRef = useRef(false);
  // Refs for direct DOM updates during animation
  const counterRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const stats = useMemo(() => {
    const result: { value: number; label: string }[] = [];
    if (experience.length > 0) {
      const years = experience.map(e => {
        const parsed = parseResumeDate(e.startDate);
        return parsed ? parsed.year : NaN;
      }).filter(y => !isNaN(y));
      if (years.length > 0) {
        const earliest = Math.min(...years);
        const yrs = new Date().getFullYear() - earliest;
        if (yrs > 0) result.push({ value: yrs, label: 'Years Experience' });
      }
    }
    if (experience.length > 0) result.push({ value: experience.length, label: 'Roles Held' });
    if (skillCount > 0) result.push({ value: skillCount, label: 'Skills' });
    return result;
  }, [experience, skillCount]);

  const setCounterRef = useCallback((el: HTMLSpanElement | null, idx: number) => {
    counterRefs.current[idx] = el;
  }, []);

  // IntersectionObserver + ref-based count-up (no re-renders during animation)
  useEffect(() => {
    if (!stripRef.current || stats.length === 0) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || animatedRef.current) return;
      animatedRef.current = true;
      setVisible(true);

      if (prefersReduced) {
        stats.forEach((s, idx) => {
          const el = counterRefs.current[idx];
          if (el) el.textContent = `${s.value}+`;
        });
        observer.disconnect();
        return;
      }

      const duration = 1800;
      stats.forEach((stat, idx) => {
        const delay = idx * 200;
        setTimeout(() => {
          const start = performance.now();
          const tick = (now: number) => {
            const elapsed = now - start;
            const t = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            const val = Math.round(eased * stat.value);
            const el = counterRefs.current[idx];
            if (el) el.textContent = `${val}+`;
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }, delay);
      });
      observer.disconnect();
    }, { threshold: 0.5 });
    observer.observe(stripRef.current);
    return () => observer.disconnect();
  }, [stats]);

  if (stats.length === 0) return null;

  return (
    <div
      ref={stripRef}
      className={`pf-stats-strip mx-2 mt-8 rounded-2xl ${visible ? 'pf-stats-visible' : ''}`}
      style={{
        background: 'var(--pf-card, rgba(255,255,255,0.04))',
        border: '1px solid var(--pf-border, rgba(255,255,255,0.08))',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)` }}>
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="flex flex-col items-center justify-center py-5 px-2"
            style={i > 0 ? { borderLeft: '1px solid var(--pf-border, rgba(255,255,255,0.08))' } : undefined}
          >
            <span
              ref={(el) => setCounterRef(el, i)}
              style={{ fontSize: '2rem', fontWeight: 800, color: accentColor, lineHeight: 1.1 }}
            >
              0+
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--pf-muted, #9ca3af)', marginTop: '0.25rem', textAlign: 'center' }}>
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
