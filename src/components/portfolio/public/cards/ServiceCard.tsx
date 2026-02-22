import { motion } from 'framer-motion';
import { Code2, Paintbrush, MessageSquare, PenLine, Star } from 'lucide-react';
import type { PortfolioService } from '@/hooks/useProfile';

const scalePop = {
  hidden: { opacity: 0, scale: 0.88, rotateX: 6 },
  visible: { opacity: 1, scale: 1, rotateX: 0, transition: { duration: 0.45, ease: [0, 0, 0.2, 1] as const } },
};

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  development: <Code2 className="w-5 h-5" />,
  design: <Paintbrush className="w-5 h-5" />,
  consulting: <MessageSquare className="w-5 h-5" />,
  writing: <PenLine className="w-5 h-5" />,
  other: <Star className="w-5 h-5" />,
};

function getCardProps(style: string): { className: string; style: React.CSSProperties } {
  switch (style) {
    case 'bold-dark':
      return { className: 'space-y-3', style: { background: 'rgba(255,255,255,0.03)', border: '1px solid color-mix(in srgb, var(--pf-accent) 20%, transparent)', borderRadius: '1rem', padding: '1.25rem' } };
    case 'glass-pro':
      return { className: 'space-y-3', style: { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.25rem' } };
    case 'classic-clean':
      return { className: 'space-y-3', style: { background: 'var(--pf-card, #f9f9f9)', border: '1px solid var(--pf-border, #e5e7eb)', borderRadius: '1rem', padding: '1.25rem' } };
    case 'developer-terminal':
      return { className: 'pf-terminal-card space-y-3', style: {} };
    case 'creative-spotlight':
      return { className: 'pf-spotlight-card space-y-3', style: {} };
    case 'executive-suite':
      return { className: 'pf-executive-card space-y-3', style: {} };
    case 'freelancer-starter':
      return { className: 'pf-starter-card space-y-3', style: {} };
    case 'neon-cyber':
      return { className: 'pf-neon-card space-y-3', style: {} };
    default:
      return { className: 'space-y-3', style: { background: 'var(--pf-card, rgba(255,255,255,0.04))', border: '1px solid var(--pf-border, rgba(255,255,255,0.08))', borderRadius: '1rem', padding: '1.25rem' } };
  }
}

export function ServiceCard({ service, style }: { service: PortfolioService; style: string }) {
  const cardProps = getCardProps(style);
  const isTerminal = style === 'developer-terminal';

  return (
    <motion.div variants={scalePop} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} style={cardProps.style} className={cardProps.className}>
      {isTerminal && <div className="pf-terminal-dots"><span /><span /><span /></div>}
      <div className={isTerminal ? 'pf-terminal-card-body space-y-3' : ''}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'color-mix(in srgb, var(--pf-accent) 15%, transparent)', color: 'var(--pf-accent)' }}>
          {SERVICE_ICONS[service.category] || SERVICE_ICONS.other}
        </div>
        <div>
          <h4 className="font-bold text-sm" style={{ fontFamily: 'var(--pf-heading-font)', color: 'var(--pf-fg, inherit)' }}>{service.title}</h4>
          {service.startingPrice && (
            <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--pf-accent)' }}>
              From {service.startingPrice}
            </p>
          )}
        </div>
        {service.description && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
            {service.description.slice(0, 100)}{service.description.length > 100 ? '…' : ''}
          </p>
        )}
      </div>
    </motion.div>
  );
}
