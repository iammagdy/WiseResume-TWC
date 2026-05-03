import { useState } from 'react';
import { motion } from 'framer-motion';
import { FeatureSection } from '@/components/landing/FeatureSection';
import { TrustSection } from '@/components/landing/TrustSection';
import { SoftDivider } from '@/components/landing/SoftDivider';
import { Footer } from '@/components/landing/Footer';
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
  const [activeIdx, setActiveIdx] = useState(-1);
  const total = featureSections.length;
  const clampedActiveIdx = Math.min(activeIdx, total - 1);
  const activeLabel = clampedActiveIdx >= 0 ? featureSections[clampedActiveIdx]?.title : null;

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

      {/* ─── SECTION 1B: SCROLL STACK ─── */}
      {/* NO motion.div wrapper here — any animated ancestor (even opacity-only)
          causes Framer Motion to add will-change which promotes a compositing
          layer, silently breaking position:sticky on lp-stack-sticky-header.
          Matches the WiseHireDemoSection structure exactly (bare top-level div). */}
        <div
          className="lp-stack-section"
          style={{ ['--lp-stack-gap' as string]: '240px' }}
        >
          <div className="lp-stack-sticky-header">
            <div>
              <p style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--lp-eyebrow)', fontWeight: 600, marginBottom: '0.75rem' }}>
                15+ AI-powered tools — {total} highlighted below
              </p>
              <h2
                className="font-bold leading-tight"
                style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', color: 'var(--lp-text)', letterSpacing: '-0.025em' }}
              >
                15+ AI tools. One platform.<br />
                <span className="lp-gradient-text">Your unfair advantage in the job market.</span>
              </h2>
            </div>
            <div
              className="lp-stack-step-chip"
              aria-live="polite"
            >
              <span className="lp-stack-step-chip-num">
                {Math.max(clampedActiveIdx + 1, 1).toString().padStart(2, '0')}
              </span>
              <span className="lp-stack-step-chip-sep">/</span>
              <span>{total.toString().padStart(2, '0')}</span>
              {activeLabel && (
                <>
                  <span className="lp-stack-step-chip-sep lp-stack-step-chip-label" aria-hidden="true">·</span>
                  <span className="lp-stack-step-chip-label">{activeLabel}</span>
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

      {/* ─── SECTION 3: FOOTER ─── */}
      <motion.div
        variants={sectionItem}
        custom={3}
        initial={prefersReducedMotion ? 'visible' : 'hidden'}
        whileInView="visible"
        viewport={{ once: true, amount: 0.05 }}
      >
        <Footer lpMode />
      </motion.div>
    </>
  );
}
