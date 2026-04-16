import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Footer } from '@/components/landing/Footer';

interface WiseHireClosingCTAProps {
  prefersReducedMotion: boolean | null;
  onOpenWaitlist: () => void;
}

export function WiseHireClosingCTA({ prefersReducedMotion, onOpenWaitlist }: WiseHireClosingCTAProps) {
  return (
    <>
      <section
        className="text-center"
        style={{
          background: 'var(--lp-section-alt)',
          borderTop: '1px solid var(--lp-border)',
          padding: 'clamp(52px, 6vw, 84px) clamp(20px, 4vw, 40px)',
          transition: 'background 0.35s ease',
        }}
      >
        <motion.div
          className="max-w-2xl mx-auto"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 28 }}
          whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.4 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
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
            Get early access
          </p>
          <h2
            className="font-bold leading-tight"
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
              color: 'var(--lp-text)',
              letterSpacing: '-0.025em',
              marginBottom: '0.75rem',
              transition: 'color 0.35s ease',
            }}
          >
            Join the waitlist.<br />Hire smarter from day one.
          </h2>
          <p
            className="max-w-md mx-auto text-sm mb-8"
            style={{ color: 'var(--lp-text-muted)', lineHeight: 1.65, transition: 'color 0.35s ease' }}
          >
            Invite-only early access. No credit card required. Cancel anytime.
          </p>
          <motion.button
            type="button"
            onClick={onOpenWaitlist}
            className="inline-flex items-center gap-2 h-12 px-10 text-base font-semibold rounded-xl"
            style={{ background: '#1D4ED8', color: '#fff' }}
            whileHover={prefersReducedMotion ? {} : { scale: 1.04 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            Join the Waitlist
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </motion.div>
      </section>
      <Footer lpMode product="wisehire" />
    </>
  );
}
