import { useState, useEffect, useRef } from 'react';
import { haptics } from '@/lib/haptics';

interface SectionNavProps {
  sections: { id: string; label: string }[];
  accentColor: string;
}

export function SectionNav({ sections, accentColor }: SectionNavProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id || '');
  const pillRowRef = useRef<HTMLDivElement>(null);

  // Single shared IntersectionObserver for all sections
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { threshold: 0.15, rootMargin: '-100px 0px -65% 0px' }
    );

    sections.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  // Auto-scroll the active pill into view
  useEffect(() => {
    if (!pillRowRef.current) return;
    const activePill = pillRowRef.current.querySelector(`[data-nav-id="${activeId}"]`) as HTMLElement | null;
    if (activePill) {
      activePill.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  }, [activeId]);

  const handleTap = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: el.offsetTop - 100, behavior: prefersReduced ? 'auto' : 'smooth' });
    haptics.light();
  };

  if (sections.length === 0) return null;

  return (
    <div
      className="md:hidden sticky z-40"
      style={{
        top: '48px',
        background: 'var(--pf-bg-alpha, rgba(10,10,20,0.88))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div
        ref={pillRowRef}
        className="pf-nav-pills flex gap-2 px-4 py-2.5 overflow-x-auto"
      >
        {sections.map(s => {
          const isActive = s.id === activeId;
          return (
            <button
              key={s.id}
              data-nav-id={s.id}
              onClick={() => handleTap(s.id)}
              className="inline-flex items-center whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors active:scale-95"
              style={{
                background: isActive ? accentColor : 'var(--pf-card, rgba(255,255,255,0.06))',
                color: isActive ? '#fff' : 'var(--pf-muted, #9ca3af)',
                border: isActive ? 'none' : '1px solid var(--pf-border, rgba(255,255,255,0.08))',
                minHeight: '44px',
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
