import { motion, useReducedMotion } from 'framer-motion';
import { EyeOff, Eye, ShieldCheck, Database } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const trustItems: { icon: LucideIcon; headline: string; body: string }[] = [
  {
    icon: EyeOff,
    headline: 'Your email stays hidden from bots',
    body: 'Contact info on your portfolio is shielded from automated scrapers. Only real visitors clicking the button can reach you.',
  },
  {
    icon: Eye,
    headline: 'You control who sees your portfolio',
    body: 'One toggle makes your portfolio public or private. No approval steps, no extra hoops.',
  },
  {
    icon: ShieldCheck,
    headline: "AI can't be spammed on your behalf",
    body: 'The AI chat on your portfolio page uses session tokens, so no one can run up costs using your public page.',
  },
  {
    icon: Database,
    headline: 'Your resume data is yours',
    body: 'Stored securely, never shared with third parties, and never used to train AI models.',
  },
];

const ENTRY_DIRS = [
  { x: -90 },
  { x: 90 },
  { x: -90 },
  { x: 90 },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

function makeItemVariant(i: number, reduced: boolean | null) {
  if (reduced) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.25 } },
    };
  }
  const dir = ENTRY_DIRS[i] ?? { x: 0 };
  return {
    hidden: { opacity: 0, x: dir.x },
    visible: {
      opacity: 1, x: 0,
      transition: { type: 'spring' as const, stiffness: 200, damping: 22 },
    },
  };
}

export function TrustSection() {
  const prefersReducedMotion = useReducedMotion();

  const headingVariant = prefersReducedMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.25 } } }
    : { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { type: 'spring' as const, stiffness: 200, damping: 22 } } };

  return (
    <section
      aria-labelledby="trust-heading"
      data-section="trust"
      style={{
        background: 'var(--lp-section-alt2)',
        borderTop: '1px solid var(--lp-border)',
        borderBottom: '1px solid var(--lp-border)',
        width: '100%',
        transition: 'background 0.3s ease',
        overflow: 'hidden',
      }}
    >
      <div
        className="max-w-6xl mx-auto w-full"
        style={{ padding: 'clamp(48px, 6vw, 80px) clamp(20px, 4vw, 40px)' }}
      >
        <motion.div
          className="text-center mb-12"
          variants={headingVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
        >
          <p
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--lp-eyebrow)',
              fontWeight: 600,
              marginBottom: '0.75rem',
              transition: 'color 0.3s ease',
            }}
          >
            Privacy & security
          </p>
          <h2
            id="trust-heading"
            className="font-bold leading-tight"
            style={{
              fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
              color: 'var(--lp-text)',
              letterSpacing: '-0.02em',
              marginBottom: '0.5rem',
              transition: 'color 0.3s ease',
            }}
          >
            Your privacy is protected
          </h2>
          <p
            className="max-w-md mx-auto text-sm leading-relaxed"
            style={{ color: 'var(--lp-text-muted)', transition: 'color 0.3s ease' }}
          >
            Specific protections built into the platform — not marketing language.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {trustItems.map((item, i) => {
            const Icon = item.icon;
            const itemVariant = makeItemVariant(i, prefersReducedMotion);
            return (
              <motion.div
                key={item.headline}
                variants={itemVariant}
                className="lp-testimonial-card flex items-start gap-4 p-6"
                style={{
                  borderRadius: 20,
                  background: 'var(--lp-card-glass)',
                  border: '1px solid var(--lp-border-card)',
                  transition: 'background 0.3s ease, border-color 0.3s ease',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(158,27,34,0.10)' }}
                >
                  <Icon className="w-5 h-5" style={{ color: 'var(--lp-eyebrow)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold text-sm mb-1.5"
                    style={{ color: 'var(--lp-text)', transition: 'color 0.3s ease' }}
                  >
                    {item.headline}
                  </p>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: 'var(--lp-text-muted)', lineHeight: 1.6, transition: 'color 0.3s ease' }}
                  >
                    {item.body}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
