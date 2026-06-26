import { motion, useReducedMotion } from 'framer-motion';
import { Check, Star, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const ENTRY_DIRS = [
  { x: -100, y: 80 },
  { x: 0, y: 100 },
  { x: 0, y: 100 },
  { x: 100, y: 80 },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

function makeItemVariant(i: number, reduced: boolean | null) {
  if (reduced) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.25 } },
    };
  }
  const dir = ENTRY_DIRS[i] ?? { x: 0, y: 80 };
  return {
    hidden: { opacity: 0, x: dir.x, y: dir.y },
    visible: {
      opacity: 1, x: 0, y: 0,
      transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
    },
  };
}

const tiers = [
  {
    name: 'Starter',
    price: '$49',
    period: '/mo',
    tagline: 'For small teams getting started with AI hiring',
    highlight: false,
    features: [
      '5 active roles',
      '50 candidate briefs / month',
      'AI Brief Generator',
      'JD Writer',
      'Pipeline Board',
      'Email support',
    ],
  },
  {
    name: 'Professional',
    price: '$149',
    period: '/mo',
    tagline: 'For growing teams that hire continuously',
    highlight: true,
    features: [
      '25 active roles',
      '250 candidate briefs / month',
      'Everything in Starter',
      'Bulk CV Screening',
      'Priority support',
      'Team collaboration (up to 5 seats)',
    ],
  },
  {
    name: 'Business',
    price: '$399',
    period: '/mo',
    tagline: 'For high-volume hiring across the organisation',
    highlight: false,
    features: [
      'Unlimited active roles',
      '1,000 candidate briefs / month',
      'Everything in Professional',
      'Talent Pool',
      'API access',
      'Dedicated Customer Success',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    tagline: 'Tailored to your organisation\'s scale and security requirements',
    highlight: false,
    features: [
      'Unlimited everything',
      'Custom AI training on your roles',
      'SSO / SCIM provisioning',
      'Custom integrations (ATS, HRIS)',
      'SLA & uptime guarantee',
      'Enterprise support & MSA',
    ],
  },
];

interface WiseHirePricingProps {
  onOpenWaitlist: () => void;
}

export function WiseHirePricing({ onOpenWaitlist }: WiseHirePricingProps) {
  const prefersReducedMotion = useReducedMotion();

  const headingVariant = prefersReducedMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.25 } } }
    : { hidden: { opacity: 0, y: 80 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } } };

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
        className="max-w-6xl mx-auto w-full"
        style={{ padding: 'clamp(52px, 6vw, 84px) clamp(20px, 4vw, 40px)' }}
      >
        <motion.div
          className="text-center mb-12"
          variants={headingVariant}
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
            Simple, transparent pricing
          </h2>
          <p
            className="max-w-md mx-auto text-sm"
            style={{ color: 'var(--lp-text-muted)', lineHeight: 1.65, transition: 'color 0.35s ease' }}
          >
            Join the waitlist now for early access pricing — locked in for life.
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
              Early Access — 40% off all tiers for waitlist members
            </span>
          </div>
        </motion.div>

        <motion.div
          className="wh-pricing-mobile-scroll gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              variants={makeItemVariant(i, prefersReducedMotion)}
              className="wh-pricing-mobile-card flex flex-col"
              style={{
                borderRadius: 20,
                background: tier.highlight ? 'rgba(29,78,216,0.08)' : 'var(--lp-card)',
                border: tier.highlight ? '1.5px solid rgba(29,78,216,0.35)' : '1px solid var(--lp-border-card)',
                padding: '24px 20px',
                position: 'relative',
                transition: 'background 0.35s ease, border-color 0.35s ease',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -11,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--lp-card)',
                  border: '1px solid var(--lp-border-card)',
                  borderRadius: 99,
                  padding: '3px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--lp-eyebrow)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.05em',
                }}
              >
                Early Access
              </div>

              <p
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: tier.highlight ? 'var(--lp-eyebrow)' : 'var(--lp-text-muted)',
                  marginBottom: tier.highlight ? 6 : 10,
                  transition: 'color 0.35s ease',
                }}
              >
                {tier.name}
              </p>

              {tier.highlight && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'var(--lp-eyebrow)',
                    color: '#fff',
                    borderRadius: 99,
                    padding: '2px 9px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    marginBottom: 10,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Star className="w-3 h-3" /> Most Popular
                </div>
              )}

              <div className="flex items-baseline gap-1 mb-2">
                <span
                  style={{
                    fontSize: tier.price === 'Custom' ? '1.6rem' : '2rem',
                    fontWeight: 800,
                    color: 'var(--lp-text)',
                    letterSpacing: '-0.03em',
                    transition: 'color 0.35s ease',
                  }}
                >
                  {tier.price}
                </span>
                {tier.period && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--lp-text-muted)', transition: 'color 0.35s ease' }}>
                    {tier.period}
                  </span>
                )}
              </div>

              <p
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--lp-text-muted)',
                  lineHeight: 1.5,
                  marginBottom: 18,
                  minHeight: 36,
                  transition: 'color 0.35s ease',
                }}
              >
                {tier.tagline}
              </p>

              <ul className="flex flex-col gap-2.5 flex-1 mb-6">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(29,78,216,0.12)' }}
                    >
                      <Check className="w-2.5 h-2.5" style={{ color: 'var(--lp-eyebrow)' }} />
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--lp-text)', lineHeight: 1.45, transition: 'color 0.35s ease' }}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              {tier.name === 'Enterprise' ? (
                <Link
                  to="/enterprise"
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--lp-eyebrow)]"
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 0',
                    borderRadius: 10,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: 'transparent',
                    color: 'var(--lp-eyebrow)',
                    border: '1.5px solid rgba(29,78,216,0.35)',
                    textAlign: 'center',
                    textDecoration: 'none',
                  }}
                >
                  Learn More
                </Link>
              ) : (
                <motion.button
                  onClick={onOpenWaitlist}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--lp-eyebrow)]"
                  style={{
                    width: '100%',
                    padding: '10px 0',
                    minHeight: 44,
                    borderRadius: 10,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: tier.highlight ? 'var(--lp-eyebrow)' : 'transparent',
                    color: tier.highlight ? '#fff' : 'var(--lp-eyebrow)',
                    border: tier.highlight ? 'none' : '1.5px solid rgba(29,78,216,0.35)',
                  }}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.04 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                >
                  Join the Waitlist
                </motion.button>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
