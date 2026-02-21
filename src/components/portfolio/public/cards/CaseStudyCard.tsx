import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { CaseStudy } from '@/hooks/useProfile';

const unfold = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] as const } },
};

export function CaseStudyCard({ cs, style }: { cs: CaseStudy; style: string }) {
  const cardStyle: React.CSSProperties = style === 'bold-dark'
    ? { background: 'rgba(255,255,255,0.03)', border: '1px solid color-mix(in srgb, var(--pf-accent) 30%, transparent)', borderRadius: '1rem', padding: '1.5rem' }
    : style === 'glass-pro'
    ? { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1rem', padding: '1.5rem' }
    : style === 'classic-clean'
    ? { borderLeft: '3px solid var(--pf-accent)', paddingLeft: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem', borderRadius: '0 0.75rem 0.75rem 0', background: 'var(--pf-card, #f9f9f9)' }
    : { background: 'var(--pf-card, rgba(255,255,255,0.04))', border: '1px solid var(--pf-border, rgba(255,255,255,0.08))', borderRadius: '1rem', padding: '1.5rem' };

  const tiltRef = useRef<HTMLDivElement>(null);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const el = tiltRef.current;
    if (!el || e.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `rotateY(${x * 3}deg) rotateX(${-y * 3}deg)`;
  }, []);
  const onPointerLeave = useCallback(() => { if (tiltRef.current) tiltRef.current.style.transform = ''; }, []);

  return (
    <div className="pf-card-tilt">
    <motion.div ref={tiltRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} variants={unfold} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} style={cardStyle} className="space-y-4 relative">
      <div className="absolute top-4 right-4">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
          style={{ background: 'color-mix(in srgb, var(--pf-accent) 15%, transparent)', color: 'var(--pf-accent)', border: '1px solid color-mix(in srgb, var(--pf-accent) 30%, transparent)' }}>
          Case Study
        </span>
      </div>

      <div className="pr-20">
        {cs.url ? (
          <a href={cs.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-lg transition-opacity hover:opacity-80 group"
            style={{ fontFamily: 'var(--pf-heading-font)', color: 'var(--pf-fg, inherit)' }}>
            {cs.title}
            <ArrowUpRight className="w-4 h-4 opacity-50 group-hover:opacity-100" style={{ color: 'var(--pf-accent)' }} />
          </a>
        ) : (
          <h4 className="font-bold text-lg" style={{ fontFamily: 'var(--pf-heading-font)', color: 'var(--pf-fg, inherit)' }}>{cs.title}</h4>
        )}
      </div>

      {cs.challenge && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--pf-accent)' }}>Challenge</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--pf-muted, #9ca3af)' }}>{cs.challenge}</p>
        </div>
      )}

      {cs.outcome && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--pf-accent)' }}>Outcome</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--pf-muted, #9ca3af)' }}>{cs.outcome}</p>
        </div>
      )}

      {cs.technologies?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {cs.technologies.map((t, i) => (
            <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: 'color-mix(in srgb, var(--pf-accent) 12%, transparent)', color: 'var(--pf-accent)', border: '1px solid color-mix(in srgb, var(--pf-accent) 25%, transparent)' }}>
              {t}
            </span>
          ))}
        </div>
      )}
    </motion.div>
    </div>
  );
}
