import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { Suspense } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Check } from 'lucide-react';

const LazyEditorDemo = lazyWithRetry(() => import('@/components/landing/EditorDemo').then((m) => ({ default: m.EditorDemo })));
const LazyPortfolioDemo = lazyWithRetry(() => import('@/components/landing/PortfolioDemo').then((m) => ({ default: m.PortfolioDemo })));
const LazyTailoringDemo = lazyWithRetry(() => import('@/components/landing/TailoringDemo').then((m) => ({ default: m.TailoringDemo })));
const LazyInterviewDemo = lazyWithRetry(() => import('@/components/landing/InterviewDemo').then((m) => ({ default: m.InterviewDemo })));
const LazyTrackerDemo = lazyWithRetry(() => import('@/components/landing/TrackerDemo').then((m) => ({ default: m.TrackerDemo })));

export type DemoKey = 'editor' | 'tailoring' | 'portfolio' | 'interview' | 'tracker';
export type BandColor = 'dark1' | 'dark2' | 'dark3' | 'brand' | 'beige' | 'dark' | 'tint';

export interface FeatureSectionData {
  id: string;
  direction: 'ltr' | 'rtl';
  badge: { icon: LucideIcon; label: string; color: string };
  categoryLabel?: string;
  bigLabel: string;
  title: string;
  desc: string;
  bullets: string[];
  demo: DemoKey;
  bandColor?: BandColor;
}

interface FeatureSectionProps {
  data: FeatureSectionData;
  sectionRef?: React.Ref<HTMLElement>;
}

const BAND_BG: Record<BandColor, string> = {
  dark1: 'var(--lp-section-alt)',
  dark2: 'var(--lp-bg)',
  dark3: 'var(--lp-section-alt2)',
  brand: 'var(--lp-section-alt)',
  beige: 'var(--lp-bg)',
  dark: 'var(--lp-section-alt)',
  tint: 'var(--lp-section-alt2)',
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

function makeSlideVariant(xOffset: number, yOffset = 70) {
  return {
    hidden: { opacity: 0, x: xOffset, y: yOffset },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 200, damping: 22 },
    },
  };
}

const bulletsVariant = {
  hidden: { opacity: 0, y: 100 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 200, damping: 22 },
  },
};

const DemoFallback = () => (
  <div style={{ width: 260, height: 280, borderRadius: 20, background: 'var(--lp-card-glass)' }} />
);

export function FeatureSection({ data, sectionRef }: FeatureSectionProps) {
  const BadgeIcon = data.badge.icon;
  const isRtl = data.direction === 'rtl';
  const sectionBg = BAND_BG[data.bandColor ?? 'dark1'];
  const prefersReducedMotion = useReducedMotion();

  const textSlide = prefersReducedMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.25 } } }
    : makeSlideVariant(isRtl ? 100 : -100, 40);

  const mediaSlide = prefersReducedMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.25 } } }
    : makeSlideVariant(isRtl ? -100 : 100, 40);

  const bulletsSlide = prefersReducedMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.25 } } }
    : bulletsVariant;

  const textCard = (
    <motion.div
      variants={textSlide}
      className="lp-stack-pane lp-stack-pane-text flex flex-col justify-center gap-5 p-6"
      style={{
        borderRadius: 24,
      }}
    >
      {data.categoryLabel && (
        <p
          style={{
            fontSize: '0.72rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 700,
            color: 'var(--lp-eyebrow)',
            marginBottom: '-6px',
            transition: 'color 0.3s ease',
          }}
        >
          {data.categoryLabel}
        </p>
      )}

      <span
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold w-fit"
        style={{
          background: 'rgba(158,27,34,0.10)',
          color: 'var(--lp-eyebrow)',
          border: '1px solid rgba(158,27,34,0.22)',
        }}
      >
        <BadgeIcon className="w-3.5 h-3.5" />
        {data.badge.label}
      </span>

      <div>
        <h2
          className="text-2xl sm:text-3xl font-bold leading-tight mb-3"
          style={{ color: 'var(--lp-text)', letterSpacing: '-0.025em', transition: 'color 0.3s ease' }}
        >
          {data.title}
        </h2>
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'var(--lp-text-muted)', lineHeight: 1.7, transition: 'color 0.3s ease' }}
        >
          {data.desc}
        </p>
      </div>
    </motion.div>
  );

  const mediaCard = (
    <motion.div
      variants={mediaSlide}
      className="lp-stack-pane lp-stack-pane-media flex items-center justify-center p-6"
      style={{
        borderRadius: 24,
      }}
    >
      {/* Phase 4: parallax wrapper is a plain div so its CSS transform
          (driven by --card-translate-y) is not overridden by the
          framer-motion transform applied to the parent motion.div. */}
      {/* Wrap parallax in an overflow:hidden bounded box so the inverse
          translate (driven by --card-translate-y) cannot push pills,
          tooltips, or floating UI past the card edge (U-1/U-2). */}
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, width: '100%' }}>
      <div className="lp-stack-parallax w-full flex items-center justify-center">
        <Suspense fallback={<DemoFallback />}>
          {data.demo === 'editor' && <LazyEditorDemo />}
          {data.demo === 'tailoring' && <LazyTailoringDemo />}
          {data.demo === 'portfolio' && <LazyPortfolioDemo />}
          {data.demo === 'interview' && <LazyInterviewDemo />}
          {data.demo === 'tracker' && <LazyTrackerDemo />}
        </Suspense>
      </div>
      </div>
    </motion.div>
  );

  const bulletsCard = (
    <motion.div
      variants={bulletsSlide}
      className="lp-stack-pane flex flex-col gap-3 p-6"
      style={{
        borderRadius: 20,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(158,27,34,0.10)' }}
        >
          <BadgeIcon className="w-4 h-4" style={{ color: 'var(--lp-eyebrow)' }} />
        </div>
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--lp-text-muted)', letterSpacing: '0.06em' }}
        >
          Key Benefits
        </p>
      </div>
      <ul className="lp-stack-bullets flex flex-wrap gap-2">
        {data.bullets.map((bullet) => (
          <li
            key={bullet}
            className="lp-stack-bullet flex items-start gap-2 text-sm"
            style={{ color: 'var(--lp-text)', flex: '1 1 240px', minWidth: 0, transition: 'color 0.3s ease' }}
          >
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: 'rgba(158,27,34,0.10)' }}
            >
              <Check className="w-2.5 h-2.5" style={{ color: 'var(--lp-eyebrow)' }} />
            </span>
            <span style={{ lineHeight: 1.55 }}>{bullet}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );

  return (
    <section
      ref={sectionRef as React.Ref<HTMLElement>}
      id={`feature-${data.id}`}
      aria-label={data.title}
      data-section={`feature-${data.id}`}
      style={{
        background: sectionBg,
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        transition: 'background 0.3s ease',
      }}
    >
      <div
        className="max-w-6xl mx-auto w-full relative"
        style={{ padding: 'clamp(24px, 3vw, 44px) clamp(20px, 4vw, 40px)' }}
      >
        {/* Watermark big label — anchored INSIDE the bounded container so
            it can never escape the rounded card edge during scroll-stack
            scaling (U-1/U-2). Previously sat at section level with
            inset:0 and bled past the card's rounded corners. */}
        <span
          aria-hidden="true"
          className="lp-stack-watermark"
          style={{
            position: 'absolute',
            inset: '0 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'clamp(4rem, 11vw, 8rem)',
            fontWeight: 900,
            color: 'var(--lp-card-glass)',
            pointerEvents: 'none',
            userSelect: 'none',
            letterSpacing: '-0.05em',
            lineHeight: 1,
            opacity: 0.5,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            zIndex: 0,
          }}
        >
          {data.bigLabel}
        </span>
        <motion.div
          variants={containerVariants}
          initial="visible"
          animate="visible"
        >
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4"
            style={{ direction: isRtl ? 'rtl' : 'ltr' }}
          >
            <div style={{ direction: 'ltr' }} data-direction={isRtl ? 'right' : 'left'}>{textCard}</div>
            <div style={{ direction: 'ltr' }} data-direction={isRtl ? 'left' : 'right'}>{mediaCard}</div>
          </div>
          <div>{bulletsCard}</div>
        </motion.div>
      </div>
    </section>
  );
}
