import { useState } from 'react';
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
  /* Phase 4: track which scroll-stack card is currently active so the
     sticky header can show "Step N of M — <label>". -1 = none yet. */
  const [activeIdx, setActiveIdx] = useState(-1);
  const total = featureSections.length;
  const activeLabel = activeIdx >= 0 ? featureSections[activeIdx]?.title : null;

  return (
    <>
      {/* ─── SECTION 1: HEADING + SCROLLSTACK FEATURE SECTIONS ─── */}
      <motion.div variants={sectionItem} custom={1}>
        {/* Phase 5: collapsed three stacked dividers (lp-separator + 2x SoftDivider)
            into one intentional gradient hairline. */}
        <div className="lp-separator" aria-hidden="true" />
        {/* Phase 4: --lp-stack-gap = itemDistance / 2 so the inter-card
            hairline divider lands at the geometric midpoint of the gap. */}
        <div
          className="lp-stack-section"
          style={{ ['--lp-stack-gap' as string]: '240px' }}
        >
          <div className="lp-stack-sticky-header">
            <motion.div
              variants={lpItemVariants}
              initial={prefersReducedMotion ? 'visible' : 'hidden'}
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              <p style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--lp-eyebrow)', fontWeight: 600, marginBottom: '0.75rem' }}>
                See it in action
              </p>
              <h2
                className="font-bold leading-tight"
                style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', color: 'var(--lp-text)', letterSpacing: '-0.025em' }}
              >
                Five tools. One platform.<br />
                <span className="lp-gradient-text">Your unfair advantage in the job market.</span>
              </h2>
            </motion.div>
            <div
              className="lp-stack-step-chip"
              data-active={activeIdx >= 0}
              aria-live="polite"
            >
              <span className="lp-stack-step-chip-num">
                {Math.max(activeIdx + 1, 1).toString().padStart(2, '0')}
              </span>
              <span className="lp-stack-step-chip-sep">/</span>
              <span>{total.toString().padStart(2, '0')}</span>
              {activeLabel && (
                <>
                  <span className="lp-stack-step-chip-sep" aria-hidden="true">·</span>
                  <span>{activeLabel}</span>
                </>
              )}
            </div>
          </div>
          <ScrollStack
            useWindowScroll
            itemDistance={480}
            itemScale={0.025}
            itemStackDistance={20}
            stackPosition="20%"
            baseScale={0.88}
            onActiveCardChange={setActiveIdx}
          >
            {featureSections.map((section) => (
              <ScrollStackItem key={section.id}>
                <FeatureSection data={section} />
              </ScrollStackItem>
            ))}
          </ScrollStack>
        </div>
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
            viewport={{ once: true, amount: 0.2 }}
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
