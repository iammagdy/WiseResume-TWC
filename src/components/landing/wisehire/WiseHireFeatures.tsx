import { motion, useReducedMotion } from 'framer-motion';
import { Brain, FileText, Kanban, Users, Archive, Rocket } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';

const ENTRY_DIRS = [
  { x: -100, y: 70 },
  { x: 100, y: 70 },
  { x: -100, y: 80 },
  { x: 100, y: 80 },
  { x: 0, y: 90 },
  { x: 0, y: 90 },
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

interface WiseHireFeaturesProps {
  onOpenWaitlist: () => void;
}

export function WiseHireFeatures({ onOpenWaitlist }: WiseHireFeaturesProps) {
  const { t } = useLocale();
  const prefersReducedMotion = useReducedMotion();

  const pillars = [
    {
      icon: Brain,
      title: t('wisehire.features.briefGenerator.title', 'AI Brief Generator'),
      desc: t('wisehire.features.briefGenerator.desc', 'Instantly generate a structured candidate brief — match score, key strengths, red flags, and top interview questions — from any CV.'),
      badge: '01',
    },
    {
      icon: FileText,
      title: t('wisehire.features.jdWriter.title', 'JD Writer'),
      desc: t('wisehire.features.jdWriter.desc', 'Write bias-free, compelling job descriptions in seconds. AI tailors the tone and requirements to attract the right candidates.'),
      badge: '02',
    },
    {
      icon: Kanban,
      title: t('wisehire.features.pipeline.title', 'Pipeline Board'),
      desc: t('wisehire.features.pipeline.desc', 'Drag-and-drop kanban for your hiring pipeline. Track every candidate from applied to offer with full status history.'),
      badge: '03',
    },
    {
      icon: Users,
      title: t('wisehire.features.bulkScreening.title', 'Bulk Screening'),
      desc: t('wisehire.features.bulkScreening.desc', 'Upload multiple CVs at once. AI scores and ranks every applicant against your role criteria — no manual reading required.'),
      badge: '04',
    },
    {
      icon: Archive,
      title: t('wisehire.features.talentPool.title', 'Talent Pool'),
      desc: t('wisehire.features.talentPool.desc', 'Never lose a great candidate. Build a searchable pool of past applicants you can re-engage for future roles instantly.'),
      badge: '05',
    },
  ];

  const headingVariant = prefersReducedMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.25 } } }
    : { hidden: { opacity: 0, y: 80 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } } };

  return (
    <section
      style={{
        background: 'var(--lp-section-alt)',
        borderTop: '1px solid var(--lp-border)',
        borderBottom: '1px solid var(--lp-border)',
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
            {t('wisehire.features.heading', 'Five tools. One hiring OS.')}
          </h2>
          <p
            className="max-w-md mx-auto text-sm"
            style={{ color: 'var(--lp-text-muted)', lineHeight: 1.65, transition: 'color 0.35s ease' }}
          >
            {t('wisehire.features.subheading', 'Everything your hiring team needs in one place — from writing the JD to making the offer.')}
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon;
            const itemVariant = makeItemVariant(i, prefersReducedMotion);
            return (
              <motion.div
                key={pillar.badge}
                variants={itemVariant}
                className="lp-feature-card flex flex-col gap-4 p-6"
                style={{
                  borderRadius: 18,
                  background: 'var(--lp-card)',
                  border: '1px solid var(--lp-border-card)',
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(29,78,216,0.10)' }}
                  >
                    <Icon className="w-5 h-5" style={{ color: 'var(--lp-eyebrow)', transition: 'color 0.35s ease' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        color: 'var(--lp-eyebrow)',
                        marginBottom: 4,
                        transition: 'color 0.35s ease',
                      }}
                    >
                      {pillar.badge}
                    </div>
                    <h3
                      className="font-semibold text-sm leading-snug"
                      style={{ color: 'var(--lp-text)', marginBottom: 6, transition: 'color 0.35s ease' }}
                    >
                      {pillar.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: 'var(--lp-text-muted)', lineHeight: 1.6, transition: 'color 0.35s ease' }}
                    >
                      {pillar.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* CTA card — fills the last slot */}
          <motion.button
            variants={makeItemVariant(5, prefersReducedMotion)}
            className="flex flex-col items-center justify-center gap-4 p-6 text-center w-full"
            style={{
              borderRadius: 18,
              background: 'rgba(29,78,216,0.07)',
              border: '1px solid rgba(29,78,216,0.18)',
              cursor: 'pointer',
            }}
            onClick={onOpenWaitlist}
            whileHover={prefersReducedMotion ? {} : { scale: 1.04 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(29,78,216,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Rocket className="w-6 h-6" style={{ color: 'var(--lp-eyebrow)' }} />
            </div>
            <div>
              <p className="font-semibold text-sm mb-1" style={{ color: 'var(--lp-text)' }}>{t('wisehire.features.ctaEarlyAccess', 'Get early access')}</p>
              <p className="text-sm" style={{ color: 'var(--lp-text-muted)' }}>{t('wisehire.features.ctaWaitlistDesc', 'Join the waitlist and be first to try WiseHire')}</p>
            </div>
            <span
              style={{
                background: 'var(--lp-eyebrow)',
                color: '#fff',
                borderRadius: 99,
                padding: '7px 18px',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {t('wisehire.features.joinWaitlist', 'Join Waitlist')}
            </span>
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
