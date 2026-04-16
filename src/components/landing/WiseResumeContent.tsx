import { motion } from 'framer-motion';
import { FeatureSection } from '@/components/landing/FeatureSection';
import { TrustSection } from '@/components/landing/TrustSection';
import { SoftDivider } from '@/components/landing/SoftDivider';
import { Footer } from '@/components/landing/Footer';
import { InstallButton } from '@/components/pwa/InstallButton';
import {
  SCATTER_SECTION_ITEM, REDUCED_SECTION_ITEM,
  lpItemVariants,
} from '@/components/landing/landingAnimations';
import { featureSections } from '@/components/landing/wiseResumeFeatureData';
import { ScrollStack, ScrollStackItem } from '@/components/landing/ScrollStack';

interface WiseResumeContentProps {
  prefersReducedMotion: boolean | null;
  isDark: boolean;
  onCTA: () => void;
}

export function WiseResumeContent({ prefersReducedMotion }: WiseResumeContentProps) {
  const sectionItem = prefersReducedMotion ? REDUCED_SECTION_ITEM : SCATTER_SECTION_ITEM;

  return (
    <>
      {/* ─── SECTION 1: HEADING + SCROLLSTACK FEATURE SECTIONS ─── */}
      <motion.div variants={sectionItem} custom={1}>
        <div className="lp-separator" aria-hidden="true" />
        <motion.div
          className="text-center px-4 sm:px-6 py-16 max-w-4xl mx-auto"
          variants={lpItemVariants}
          initial={prefersReducedMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
          style={{ background: 'var(--lp-bg)' }}
        >
          <p style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--lp-eyebrow)', fontWeight: 600, marginBottom: '0.75rem' }}>
            See it in action
          </p>
          <h2
            className="font-bold leading-tight"
            style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: 'var(--lp-text)', letterSpacing: '-0.02em' }}
          >
            Five tools. One platform.<br />
            <span className="lp-gradient-text">Your unfair advantage in the job market.</span>
          </h2>
        </motion.div>
        <SoftDivider />
        <ScrollStack
          useWindowScroll
          itemDistance={480}
          itemScale={0.025}
          itemStackDistance={20}
          stackPosition="20%"
          baseScale={0.88}
        >
          {featureSections.map((section) => (
            <ScrollStackItem key={section.id}>
              <FeatureSection data={section} />
            </ScrollStackItem>
          ))}
        </ScrollStack>
        <SoftDivider />
      </motion.div>

      {/* ─── SECTION 2: TRUST SECTION ─── */}
      <motion.div variants={sectionItem} custom={2}>
        <SoftDivider />
        <TrustSection />
      </motion.div>

      {/* ─── SECTION 3: PWA STRIP ─── */}
      <motion.div variants={sectionItem} custom={3}>
        <section className="px-4 sm:px-6 py-10" style={{ background: 'var(--lp-section-alt)', borderTop: '1px solid var(--lp-border)' }}>
          <motion.div
            className="max-w-xl mx-auto text-center"
            variants={lpItemVariants}
            initial={prefersReducedMotion ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
          >
            <p className="font-semibold mb-1" style={{ color: 'var(--lp-text)' }}>Install WiseResume</p>
            <p className="text-sm mb-4" style={{ color: 'var(--lp-text-muted)' }}>Add to your home screen for a native app experience</p>
            <InstallButton />
          </motion.div>
        </section>
      </motion.div>

      {/* ─── SECTION 4: FOOTER ─── */}
      <motion.div variants={sectionItem} custom={4}>
        <Footer lpMode />
      </motion.div>
    </>
  );
}
