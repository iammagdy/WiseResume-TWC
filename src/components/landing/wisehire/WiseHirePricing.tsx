import { motion, useReducedMotion } from 'framer-motion';
import { Check, Mail, ShieldCheck, Zap } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';

interface WiseHirePricingProps {
  onOpenWaitlist: () => void;
}

export function WiseHirePricing({ onOpenWaitlist }: WiseHirePricingProps) {
  const { t } = useLocale();
  const prefersReducedMotion = useReducedMotion();

  const features = [
    t('wisehire.pricing.feature1', 'Role, candidate, and pipeline organization'),
    t('wisehire.pricing.feature2', 'AI-assisted briefs and job-description drafts for human review'),
    t('wisehire.pricing.feature3', 'Bulk evidence review and assisted CV de-identification'),
    t('wisehire.pricing.feature4', 'Talent pool, scorecards, outreach drafts, and workflow analytics'),
  ];

  const reveal = prefersReducedMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.25 } } }
    : {
        hidden: { opacity: 0, y: 48 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
        },
      };

  return (
    <section
      id="wisehire-pricing"
      style={{
        background: 'var(--lp-bg)',
        width: '100%',
        transition: 'background 0.35s ease',
      }}
    >
      <div
        className="max-w-4xl mx-auto w-full"
        style={{ padding: 'clamp(52px, 6vw, 84px) clamp(20px, 4vw, 40px)' }}
      >
        <motion.div
          className="text-center mb-10"
          variants={reveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
        >
          <h2
            className="font-bold leading-tight"
            style={{
              fontSize: 'clamp(1.9rem, 4vw, 3rem)',
              color: 'var(--lp-text)',
              letterSpacing: '-0.025em',
              marginBottom: '0.75rem',
              transition: 'color 0.35s ease',
            }}
          >
            {t('wisehire.pricing.heading', 'Invite-based early access')}
          </h2>
          <p
            className="max-w-2xl mx-auto text-sm"
            style={{ color: 'var(--lp-text-muted)', lineHeight: 1.65, transition: 'color 0.35s ease' }}
          >
            {t(
              'wisehire.pricing.subheading',
              'Public self-service pricing and fixed plan limits are not published yet. Join the waitlist and we will confirm access, usage, support, and commercial terms before activation.',
            )}
          </p>
          <div
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full"
            style={{
              background: 'rgba(29,78,216,0.09)',
              border: '1px solid rgba(29,78,216,0.22)',
            }}
          >
            <Zap className="w-3.5 h-3.5" style={{ color: 'var(--lp-eyebrow)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--lp-eyebrow)' }}>
              {t('wisehire.pricing.earlyAccessBadge', 'Early Access — invitation required')}
            </span>
          </div>
        </motion.div>

        <motion.div
          variants={reveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="grid gap-5 md:grid-cols-[1.3fr_0.7fr]"
        >
          <div
            className="rounded-[20px] p-6 sm:p-8"
            style={{
              background: 'var(--lp-card)',
              border: '1px solid var(--lp-border-card)',
              transition: 'background 0.35s ease, border-color 0.35s ease',
            }}
          >
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--lp-text)' }}>
              {t('wisehire.pricing.workspaceTitle', 'What is in the early-access workspace')}
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--lp-text-muted)', lineHeight: 1.65 }}>
              {t(
                'wisehire.pricing.workspaceDescription',
                'These workflows are present in the current product. Availability of AI actions depends on the configured provider, and a recruiter must review every output.',
              )}
            </p>
            <ul className="grid gap-3 sm:grid-cols-2 mb-7">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(29,78,216,0.12)' }}
                  >
                    <Check className="w-3 h-3" style={{ color: 'var(--lp-eyebrow)' }} />
                  </span>
                  <span className="text-sm" style={{ color: 'var(--lp-text)', lineHeight: 1.5 }}>
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
            <motion.button
              onClick={onOpenWaitlist}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--lp-eyebrow)]"
              style={{
                minHeight: 44,
                borderRadius: 10,
                padding: '10px 18px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: 'var(--lp-eyebrow)',
                color: '#fff',
                border: 'none',
              }}
              whileHover={prefersReducedMotion ? {} : { scale: 1.03 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            >
              {t('wisehire.pricing.joinWaitlist', 'Join the Waitlist')}
            </motion.button>
          </div>

          <aside
            className="rounded-[20px] p-6 flex flex-col"
            style={{
              background: 'rgba(29,78,216,0.07)',
              border: '1px solid rgba(29,78,216,0.22)',
            }}
          >
            <ShieldCheck className="w-7 h-7 mb-4" style={{ color: 'var(--lp-eyebrow)' }} />
            <h3 className="text-base font-bold mb-2" style={{ color: 'var(--lp-text)' }}>
              {t('wisehire.pricing.termsTitle', 'Terms before activation')}
            </h3>
            <p className="text-sm flex-1" style={{ color: 'var(--lp-text-muted)', lineHeight: 1.65 }}>
              {t(
                'wisehire.pricing.termsDescription',
                'We will confirm plan limits, pricing, support, data-processing needs, and any enterprise commitments in writing. No public discount or unsupported feature is promised here.',
              )}
            </p>
            <a
              href="mailto:contact@thewise.cloud?subject=WiseHire%20Early%20Access%20Terms"
              className="inline-flex items-center gap-2 mt-5 font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-eyebrow)] rounded"
              style={{ color: 'var(--lp-eyebrow)' }}
            >
              <Mail className="w-4 h-4" />
              {t('wisehire.pricing.contact', 'Discuss team requirements')}
            </a>
          </aside>
        </motion.div>
      </div>
    </section>
  );
}
