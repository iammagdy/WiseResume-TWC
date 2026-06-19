import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { Suspense, type ReactNode, type RefObject } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import {
  SCATTER_WRAPPER_VARIANTS, SCATTER_SECTION_ITEM,
  REDUCED_MOTION_WRAPPER, REDUCED_SECTION_ITEM,
} from './landingAnimations';
import { SoftDivider } from './SoftDivider';
import { LandingToggle } from './LandingToggle';
import { WiseResumeHero } from './WiseResumeHero';

const WiseResumeContent = lazyWithRetry(() =>
  import('./WiseResumeContent').then((m) => ({ default: m.WiseResumeContent }))
);
const WiseHireHero = lazyWithRetry(() =>
  import('./wisehire/WiseHireHero').then((m) => ({ default: m.WiseHireHero }))
);
const WiseHireFeatures = lazyWithRetry(() =>
  import('./wisehire/WiseHireFeatures').then((m) => ({ default: m.WiseHireFeatures }))
);
const WiseHirePricing = lazyWithRetry(() =>
  import('./wisehire/WiseHirePricing').then((m) => ({ default: m.WiseHirePricing }))
);
const WiseHireDemoSection = lazyWithRetry(() =>
  import('./wisehire/WiseHireDemoSection').then((m) => ({ default: m.WiseHireDemoSection }))
);
const WiseHireTrustSection = lazyWithRetry(() =>
  import('./wisehire/WiseHireTrustSection').then((m) => ({ default: m.WiseHireTrustSection }))
);
const WiseHireFeatureTicker = lazyWithRetry(() =>
  import('./wisehire/WiseHireFeatureTicker').then((m) => ({ default: m.WiseHireFeatureTicker }))
);
const WiseHireClosingCTA = lazyWithRetry(() =>
  import('./wisehire/WiseHireClosingCTA').then((m) => ({ default: m.WiseHireClosingCTA }))
);

const LpFallback = ({ minHeight = 320 }: { minHeight?: number }): ReactNode => (
  <div
    aria-hidden
    style={{
      minHeight,
      width: '100%',
      background: 'linear-gradient(180deg, var(--lp-card) 0%, var(--lp-card-2, var(--lp-card)) 100%)',
    }}
  />
);

interface LandingMotionStageProps {
  mode: 'jobseeker' | 'wisehire';
  prefersReducedMotion: boolean;
  isDark: boolean;
  isAuthenticated: boolean;
  themeLogo: string;
  heroRef: RefObject<HTMLElement>;
  onCTA: (plan?: string) => void;
  onLandingModeChange: (m: 'jobseeker' | 'wisehire', btnOrigin: { x: number; y: number }) => void;
  onOpenWaitlist: () => void;
}

/**
 * Lazy-loaded motion stage. Hosts the AnimatePresence + LazyMotion tree
 * so framer-motion (and the heavy `domAnimation` feature bundle) are
 * BOTH excluded from the landing entry chunk. Vite emits this entire
 * subtree as its own chunk, fetched in parallel with first paint.
 */
export default function LandingMotionStage({
  mode,
  prefersReducedMotion,
  isDark,
  isAuthenticated,
  themeLogo,
  heroRef,
  onCTA,
  onLandingModeChange,
  onOpenWaitlist,
}: LandingMotionStageProps) {
  const sectionItem = prefersReducedMotion ? REDUCED_SECTION_ITEM : SCATTER_SECTION_ITEM;
  const wrapperVariants = prefersReducedMotion ? REDUCED_MOTION_WRAPPER : SCATTER_WRAPPER_VARIANTS;

  return (
    <LazyMotion features={domAnimation} strict>
      <AnimatePresence mode="popLayout">
        {mode === 'wisehire' ? (
          <m.div key="wisehire" variants={wrapperVariants} initial="hidden" animate="visible" exit="exit">
            <m.div variants={sectionItem} custom={0}>
              <Suspense fallback={<LpFallback minHeight={640} />}>
                <WiseHireHero
                  isAuthenticated={isAuthenticated}
                  onOpenWaitlist={onOpenWaitlist}
                  mobileToggle={
                    <div className="sm:hidden relative z-10 flex justify-center mt-1 mb-6">
                      <LandingToggle uid="mob" compact mode={mode} prefersReducedMotion={prefersReducedMotion} onModeChange={onLandingModeChange} />
                    </div>
                  }
                />
              </Suspense>
              <SoftDivider product="wisehire" />
              <Suspense fallback={<LpFallback minHeight={120} />}><WiseHireFeatureTicker /></Suspense>
            </m.div>
            <m.div variants={sectionItem} custom={1}>
              <Suspense fallback={<LpFallback minHeight={600} />}><WiseHireDemoSection /></Suspense>
            </m.div>
            <m.div variants={sectionItem} custom={2}>
              <SoftDivider product="wisehire" />
              <Suspense fallback={<LpFallback minHeight={400} />}><WiseHireTrustSection /></Suspense>
            </m.div>
            <m.div variants={sectionItem} custom={3}>
              <SoftDivider product="wisehire" />
              <Suspense fallback={<LpFallback minHeight={480} />}><WiseHireFeatures onOpenWaitlist={onOpenWaitlist} /></Suspense>
            </m.div>
            <m.div variants={sectionItem} custom={4}>
              <SoftDivider product="wisehire" />
              <Suspense fallback={<LpFallback minHeight={520} />}><WiseHirePricing onOpenWaitlist={onOpenWaitlist} /></Suspense>
            </m.div>
            <m.div variants={sectionItem} custom={5}>
              <Suspense fallback={<LpFallback minHeight={320} />}>
                <WiseHireClosingCTA prefersReducedMotion={prefersReducedMotion} onOpenWaitlist={onOpenWaitlist} />
              </Suspense>
            </m.div>
          </m.div>
        ) : (
          <m.div key="wiseresume" variants={wrapperVariants} initial="hidden" animate="visible" exit="exit">
            <m.div variants={sectionItem} custom={0}>
              <WiseResumeHero
                mode={mode}
                prefersReducedMotion={prefersReducedMotion}
                themeLogo={themeLogo}
                isAuthenticated={isAuthenticated}
                heroRef={heroRef}
                onModeChange={onLandingModeChange}
                onCTA={onCTA}
              />
            </m.div>
            <Suspense fallback={<LpFallback minHeight={800} />}>
              <WiseResumeContent prefersReducedMotion={prefersReducedMotion} isDark={isDark} onCTA={onCTA} />
            </Suspense>
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}
