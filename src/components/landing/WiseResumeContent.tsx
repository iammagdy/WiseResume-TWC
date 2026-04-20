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
import { features, featureSections } from '@/components/landing/wiseResumeFeatureData';
import { ScrollStack, ScrollStackItem } from '@/components/landing/ScrollStack';

interface WiseResumeContentProps {
  prefersReducedMotion: boolean | null;
  isDark: boolean;
  onCTA: () => void;
}

export function WiseResumeContent({ prefersReducedMotion }: WiseResumeContentProps) {
  const sectionItem = prefersReducedMotion ? REDUCED_SECTION_ITEM : SCATTER_SECTION_ITEM;
  const [activeIdx, setActiveIdx] = useState(-1);
  const total = featureSections.length;
  const totalTools = features.length;
  const activeLabel = activeIdx >= 0 ? featureSections[activeIdx]?.title : null;

  return (
    <>
      {/* ─── SECTION 1A: SEPARATOR (scatter animation) ─── */}
      <motion.div
        variants={sectionItem}
        custom={1}
        initial={prefersReducedMotion ? 'visible' : 'hidden'}
        whileInView="visible"
        viewport={{ once: true, amount: 0.05 }}
      >
        <div className="lp-separator" aria-hidden="true" />
      </motion.div>

      {/* ─── SECTION 1B: SCROLL STACK (opacity-only fade — no transforms)  ─── */}
      {/* position:sticky on the header breaks when any ancestor has a CSS
          transform applied. Using opacity-only here keeps the stacking context
          clean so the sticky header pins correctly while the user scrolls. */}
      <motion.div
        initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        viewport={{ once: true, amount: 0.02 }}
      >
        <div
          className="lp-stack-section"
          style={{ ['--lp-stack-gap' as string]: '240px' }}
        >
          <div className="lp-stack-sticky-header">
            <div>
              <p style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--lp-eyebrow)', fontWeight: 600, marginBottom: '0.75rem' }}>
                {totalTools} AI-powered tools — {total} highlighted below
              </p>
              <h2
                className="font-bold leading-tight"
                style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', color: 'var(--lp-text)', letterSpacing: '-0.025em' }}
              >
                {totalTools} AI tools. One platform.<br />
                <span className="lp-gradient-text">Your unfair advantage in the job market.</span>
              </h2>
            </div>
            <div
              className="lp-stack-step-chip"
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
      <motion.div
        variants={sectionItem}
        custom={2}
        initial={prefersReducedMotion ? 'visible' : 'hidden'}
        whileInView="visible"
        viewport={{ once: true, amount: 0.05 }}
      >
        <SoftDivider />
        <TrustSection />
      </motion.div>

      {/* ─── SECTION 3: PWA STRIP ─── */}
      <motion.div
        variants={sectionItem}
        custom={3}
        initial={prefersReducedMotion ? 'visible' : 'hidden'}
        whileInView="visible"
        viewport={{ once: true, amount: 0.05 }}
      >
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
      <motion.div
        variants={sectionItem}
        custom={4}
        initial={prefersReducedMotion ? 'visible' : 'hidden'}
        whileInView="visible"
        viewport={{ once: true, amount: 0.05 }}
      >
        <Footer lpMode />
      </motion.div>
    </>
  );
}
