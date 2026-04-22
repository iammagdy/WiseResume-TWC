import { BrainCircuit, FileEdit, Kanban, Users, Layers } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

const ITEMS = [
  { icon: BrainCircuit, label: 'Brief Generator', color: '#60A5FA' },
  { icon: FileEdit, label: 'JD Writer', color: '#A78BFA' },
  { icon: Kanban, label: 'Pipeline Board', color: '#34D399' },
  { icon: Users, label: 'Bulk Screening', color: '#FB923C' },
  { icon: Layers, label: 'Talent Pool', color: '#F472B6' },
];

const Dot = () => (
  <span
    className="mx-6 flex-shrink-0"
    style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--lp-border, rgba(255,255,255,0.12))' }}
    aria-hidden="true"
  />
);

export function WiseHireFeatureTicker() {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <div
        className="flex items-center justify-center gap-6 flex-wrap py-5 px-4"
        style={{ background: 'var(--lp-bg)', transition: 'background 0.35s ease' }}
      >
        {ITEMS.map(({ icon: Icon, label, color }) => (
          <span
            key={label}
            className="flex items-center gap-2 text-sm"
            style={{ color: 'var(--lp-text-subtle)' }}
          >
            <Icon className="w-4 h-4" style={{ color }} />
            {label}
          </span>
        ))}
      </div>
    );
  }

  const allItems = [...ITEMS, ...ITEMS];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ type: 'spring', stiffness: 240, damping: 28, restDelta: 0.001 }}
    >
    <div
      className="relative overflow-hidden py-5 group select-none"
      style={{
        background: 'var(--lp-bg)',
        borderTop: '1px solid var(--lp-border)',
        borderBottom: '1px solid var(--lp-border)',
        transition: 'background 0.35s ease',
      }}
      aria-label="WiseHire features overview"
      tabIndex={0}
    >
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]">
        {allItems.map(({ icon: Icon, label, color }, i) => (
          <span
            key={i}
            className="flex items-center gap-2 text-sm font-medium whitespace-nowrap"
            style={{ color: 'var(--lp-text-subtle)' }}
          >
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
            {label}
            <Dot />
          </span>
        ))}
      </div>

      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-20 z-10"
        style={{ background: 'linear-gradient(to right, var(--lp-ticker-edge), transparent)' }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-20 z-10"
        style={{ background: 'linear-gradient(to left, var(--lp-ticker-edge), transparent)' }}
      />
    </div>
    </motion.div>
  );
}
