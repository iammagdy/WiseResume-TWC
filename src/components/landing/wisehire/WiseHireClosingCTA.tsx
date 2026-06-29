import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Footer } from '@/components/landing/Footer';
import { useLocale } from '@/i18n/LocaleProvider';

interface WiseHireClosingCTAProps {
  prefersReducedMotion: boolean | null;
  onOpenWaitlist: () => void;
}

export function WiseHireClosingCTA({ prefersReducedMotion, onOpenWaitlist }: WiseHireClosingCTAProps) {
  const { t } = useLocale();

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
          initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
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
            {t('wisehire.closingCta.eyebrow', 'Get early access')}
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
            {t('wisehire.closingCta.heading', 'Join the waitlist.')}<br />{t('wisehire.closingCta.headingLine2', 'Hire smarter from day one.')}
          </h2>
          <p
            className="max-w-md mx-auto text-sm mb-8"
            style={{ color: 'var(--lp-text-muted)', lineHeight: 1.65, transition: 'color 0.35s ease' }}
          >
            {t('wisehire.closingCta.subtext', 'Invite-only early access. No credit card required. Cancel anytime.')}
          </p>
          <motion.button
            type="button"
            onClick={onOpenWaitlist}
            className="inline-flex items-center gap-2 h-12 px-10 text-base font-semibold rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--lp-eyebrow)]"
            style={{ background: 'var(--lp-eyebrow)', color: '#fff' }}
            whileHover={prefersReducedMotion ? {} : { scale: 1.04, boxShadow: '0 0 28px 4px rgba(29,78,216,0.45)' }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.97, boxShadow: '0 0 10px 2px rgba(29,78,216,0.25)' }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {t('wisehire.closingCta.button', 'Join the Waitlist')}
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </motion.div>
      </section>
      <Footer lpMode product="wisehire" />
    </>
  );
}
