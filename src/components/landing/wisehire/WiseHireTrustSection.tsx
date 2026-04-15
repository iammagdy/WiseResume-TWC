import { motion } from 'framer-motion';
import { Users, BrainCircuit, Target, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

const trustItems: { icon: LucideIcon; headline: string; body: string }[] = [
  {
    icon: BrainCircuit,
    headline: 'AI that reads CVs like a seasoned recruiter',
    body: 'WiseHire extracts skills, flags concerns, and scores fit in seconds — so your team spends time on conversations, not admin.',
  },
  {
    icon: Target,
    headline: 'Consistent scoring across every applicant',
    body: 'Structured match scores remove guesswork and reduce unconscious bias. Every candidate is evaluated against the same criteria.',
  },
  {
    icon: Zap,
    headline: 'From job brief to shortlist in under an hour',
    body: 'Write the JD, screen 50 CVs, and surface your top 5 — all before your first coffee of the day.',
  },
  {
    icon: Users,
    headline: 'Built for the whole hiring team',
    body: 'Hiring managers, recruiters, and HR directors each get the view they need. Pipeline Board keeps everyone aligned without another meeting.',
  },
];

export function WiseHireTrustSection() {
  return (
    <section
      aria-labelledby="wisehire-trust-heading"
      style={{
        background: 'var(--lp-section-alt2)',
        borderTop: '1px solid var(--lp-border)',
        borderBottom: '1px solid var(--lp-border)',
        width: '100%',
        transition: 'background 0.35s ease',
      }}
    >
      <div
        className="max-w-6xl mx-auto w-full"
        style={{ padding: 'clamp(48px, 6vw, 80px) clamp(20px, 4vw, 40px)' }}
      >
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.3 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <p
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--lp-eyebrow)',
              fontWeight: 600,
              marginBottom: '0.75rem',
              transition: 'color 0.35s ease',
            }}
          >
            Why teams choose WiseHire
          </p>
          <h2
            id="wisehire-trust-heading"
            className="font-bold leading-tight"
            style={{
              fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
              color: 'var(--lp-text)',
              letterSpacing: '-0.02em',
              marginBottom: '0.5rem',
              transition: 'color 0.35s ease',
            }}
          >
            Hire smarter, not harder
          </h2>
          <p
            className="max-w-md mx-auto text-sm leading-relaxed"
            style={{ color: 'var(--lp-text-muted)', transition: 'color 0.35s ease' }}
          >
            AI that gives your team an unfair advantage — without replacing the human judgement that great hiring requires.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.1 }}
        >
          {trustItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.headline}
                variants={itemVariants}
                className="lp-testimonial-card flex items-start gap-4 p-6"
                style={{
                  borderRadius: 20,
                  background: 'var(--lp-card-glass)',
                  border: '1px solid var(--lp-border-card)',
                  transition: 'background 0.35s ease, border-color 0.35s ease',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(29,78,216,0.10)' }}
                >
                  <Icon className="w-5 h-5" style={{ color: 'var(--lp-eyebrow)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold text-sm mb-1.5"
                    style={{ color: 'var(--lp-text)', transition: 'color 0.35s ease' }}
                  >
                    {item.headline}
                  </p>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: 'var(--lp-text-muted)', lineHeight: 1.6, transition: 'color 0.35s ease' }}
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
