import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { lazy, Suspense } from 'react';

const LazyFooter = lazy(() =>
  import('@/components/landing/Footer').then((m) => ({ default: m.Footer }))
);

interface WiseHireClosingCTAProps {
  prefersReducedMotion: boolean | null;
  onOpenWaitlist: () => void;
}

const BULLETS = [
  'No credit card required',
  'Cancel any time',
  'GDPR & CCPA compliant',
  'Dedicated onboarding support',
];

export function WiseHireClosingCTA({ prefersReducedMotion, onOpenWaitlist }: WiseHireClosingCTAProps) {
  return (
    <>
      <section
        style={{
          padding: '5rem 1.25rem',
          textAlign: 'center',
          background: 'linear-gradient(180deg, transparent 0%, rgba(37,99,235,0.04) 100%)',
        }}
      >
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2
              style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                fontWeight: 800,
                lineHeight: 1.2,
                marginBottom: '1rem',
                color: 'var(--lp-text, #111)',
              }}
            >
              Start hiring smarter{' '}
              <span style={{ color: '#2563EB' }}>today</span>
            </h2>
            <p
              style={{
                fontSize: '1.05rem',
                color: 'var(--lp-muted, #555)',
                lineHeight: 1.65,
                marginBottom: '2rem',
              }}
            >
              Join forward-thinking teams using WiseHire to screen faster, reduce bias, and hire with confidence.
            </p>

            <button
              onClick={onOpenWaitlist}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.85rem 2rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '1rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 16px rgba(37,99,235,0.35)',
                marginBottom: '1.75rem',
              }}
            >
              Request Early Access <ArrowRight size={17} />
            </button>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem 1.5rem',
                justifyContent: 'center',
              }}
            >
              {BULLETS.map((b) => (
                <span
                  key={b}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.85rem',
                    color: 'var(--lp-muted, #555)',
                    fontWeight: 500,
                  }}
                >
                  <CheckCircle2 size={14} style={{ color: '#2563EB' }} />
                  {b}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <Suspense fallback={null}>
        <LazyFooter lpMode product="wisehire" />
      </Suspense>
    </>
  );
}
