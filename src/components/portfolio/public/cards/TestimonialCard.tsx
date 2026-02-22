import { motion } from 'framer-motion';

export interface Testimonial {
  id: string;
  quote: string;
  authorName: string;
  authorTitle?: string;
  avatarUrl?: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as const } },
};

function getCardProps(style: string): { className: string; style: React.CSSProperties } {
  switch (style) {
    case 'bold-dark':
      return { className: 'relative', style: { background: 'rgba(255,255,255,0.03)', border: '1px solid color-mix(in srgb, var(--pf-accent) 20%, transparent)', borderRadius: '1rem', padding: '1.5rem' } };
    case 'glass-pro':
      return { className: 'relative', style: { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1rem', padding: '1.5rem' } };
    case 'classic-clean':
      return { className: 'relative', style: { background: 'var(--pf-card, #f9f9f9)', border: '1px solid var(--pf-border, #e5e7eb)', borderRadius: '1rem', padding: '1.5rem' } };
    case 'developer-terminal':
      return { className: 'pf-terminal-card relative', style: {} };
    case 'creative-spotlight':
      return { className: 'pf-spotlight-card relative', style: {} };
    case 'executive-suite':
      return { className: 'pf-executive-card relative', style: {} };
    case 'freelancer-starter':
      return { className: 'pf-starter-card relative', style: {} };
    case 'neon-cyber':
      return { className: 'pf-neon-card relative', style: {} };
    default:
      return { className: 'relative', style: { background: 'var(--pf-card, rgba(255,255,255,0.04))', border: '1px solid var(--pf-border, rgba(255,255,255,0.08))', borderRadius: '1rem', padding: '1.5rem' } };
  }
}

export function TestimonialCard({ testimonial, style }: { testimonial: Testimonial; style: string }) {
  const cardProps = getCardProps(style);
  const isTerminal = style === 'developer-terminal';

  return (
    <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} style={cardProps.style} className={cardProps.className}>
      {isTerminal && <div className="pf-terminal-dots"><span /><span /><span /></div>}
      <div className={isTerminal ? 'pf-terminal-card-body' : ''}>
        <span
          className="absolute top-3 left-4 text-5xl font-serif leading-none select-none pointer-events-none opacity-20"
          style={{ color: 'var(--pf-accent)' }}
          aria-hidden="true"
        >
          "
        </span>

        <blockquote className="relative z-10 pt-6 pb-4">
          <p className="text-sm leading-relaxed italic" style={{ color: 'var(--pf-fg, inherit)', fontFamily: 'var(--pf-body-font)' }}>
            "{testimonial.quote}"
          </p>
        </blockquote>

        <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: 'var(--pf-border, rgba(255,255,255,0.08))' }}>
          {testimonial.avatarUrl && (
            <img
              src={testimonial.avatarUrl}
              alt={testimonial.authorName}
              className="w-8 h-8 rounded-full object-cover"
              style={{ border: '2px solid var(--pf-accent)' }}
            />
          )}
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--pf-fg, inherit)' }}>{testimonial.authorName}</p>
            {testimonial.authorTitle && (
              <p className="text-xs" style={{ color: 'var(--pf-muted, #9ca3af)' }}>{testimonial.authorTitle}</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
