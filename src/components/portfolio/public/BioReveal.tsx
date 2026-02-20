import { useRef, useEffect } from 'react';

export function BioReveal({ bio }: { bio: string }) {
  const containerRef = useRef<HTMLParagraphElement>(null);
  const observedRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || observedRef.current) return;
    observedRef.current = true;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const inners = el.querySelectorAll<HTMLElement>('.pf-bio-line-inner');

    if (prefersReduced) {
      inners.forEach((span) => {
        span.style.transform = 'none';
        span.style.opacity = '1';
      });
      return;
    }

    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        inners.forEach((span, idx) => {
          span.style.animationDelay = `${idx * 90}ms`;
          span.classList.add('pf-bio-revealed');
        });
        obs.disconnect();
      }
    }, { threshold: 0.3, rootMargin: '0px 0px -50px 0px' });

    obs.observe(el);
    return () => obs.disconnect();
  }, [bio]);

  const sentences = bio.split(/(?<=\.)\s+/).filter(Boolean);

  return (
    <p ref={containerRef} className="text-sm leading-loose" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
      {sentences.map((sentence, i) => (
        <span key={i} className="pf-bio-line">
          <span className="pf-bio-line-inner">{sentence}{i < sentences.length - 1 ? ' ' : ''}</span>
        </span>
      ))}
    </p>
  );
}
