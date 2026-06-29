import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
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
import { useLocale } from '@/i18n/LocaleProvider';

interface WiseResumeContentProps {
  prefersReducedMotion: boolean | null;
  isDark: boolean;
  onCTA: () => void;
}

export function WiseResumeContent({ prefersReducedMotion }: WiseResumeContentProps) {
  const { t } = useLocale();
  const sectionItem = prefersReducedMotion ? REDUCED_SECTION_ITEM : SCATTER_SECTION_ITEM;
  const [activeIdx, setActiveIdx] = useState(-1);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) { setHasScrolled(true); return; }
    const onScroll = () => { if (window.scrollY > 80) { setHasScrolled(true); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [prefersReducedMotion]);
  const total = featureSections.length;
  const clampedActiveIdx = Math.min(activeIdx, total - 1);
  const activeLabel = clampedActiveIdx >= 0 
    ? t(`landing.features.${featureSections[clampedActiveIdx].id}.title`, featureSections[clampedActiveIdx].title) 
    : null;

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
              <h2
                className="font-bold leading-tight"
                style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', color: 'var(--lp-text)', letterSpacing: '-0.025em' }}
              >
                {t('landing.fifteenTools', '15+ AI tools. One platform.')}<br />
                <span style={{ color: 'var(--lp-eyebrow)' }}>{t('landing.unfairAdvantage', 'Your unfair advantage in the job market.')}</span>
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
            <motion.div
              aria-hidden="true"
              initial={{ opacity: 1 }}
              animate={{ opacity: hasScrolled ? 0 : 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{ pointerEvents: 'none', display: 'flex', justifyContent: 'center', marginTop: 4 }}
            >
              <motion.div
                animate={prefersReducedMotion ? {} : { y: [0, 6, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                style={{ color: 'var(--lp-eyebrow)', opacity: 0.65 }}
              >
                <ChevronDown className="w-5 h-5" />
              </motion.div>
            </motion.div>
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
