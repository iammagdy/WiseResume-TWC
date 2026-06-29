import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { Component, Suspense, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Check, RefreshCw } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';

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
      transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
    },
  };
}

const bulletsVariant = {
  hidden: { opacity: 0, y: 100 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

const DemoFallback = () => (
  <div
    role="status"
    aria-label="Loading demo"
    style={{ width: 260, height: 280, borderRadius: 20, background: 'var(--lp-card-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
  >
    <span style={{ fontSize: '0.72rem', color: 'var(--lp-text-muted)', letterSpacing: '0.05em' }}>Loading…</span>
  </div>
);

interface DemoErrorBoundaryState { hasError: boolean; retryCount: number }
class DemoErrorBoundary extends Component<{ children: ReactNode }, DemoErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }
  static getDerivedStateFromError(_: Error) { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      const { retryCount } = this.state;
      const exhausted = retryCount >= 2;
      return (
        <div
          role="alert"
          style={{ width: 260, height: 280, borderRadius: 20, background: 'var(--lp-card-glass)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '0 16px' }}
        >
          <RefreshCw style={{ width: 18, height: 18, color: 'var(--lp-text-muted)' }} aria-hidden="true" />
          <span style={{ fontSize: '0.72rem', color: 'var(--lp-text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
            {retryCount === 0 ? 'Demo unavailable' : 'Still unavailable — check your connection'}
          </span>
          {exhausted ? (
            <button
              onClick={() => window.location.reload()}
              style={{ fontSize: '0.72rem', color: 'var(--lp-eyebrow)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', minHeight: 44, padding: '0 8px', outline: 'none' }}
              className="focus-visible:ring-2 focus-visible:ring-[var(--lp-eyebrow)] focus-visible:ring-offset-1 rounded"
            >
              Reload page
            </button>
          ) : (
            <button
              onClick={() => this.setState((s) => ({ hasError: false, retryCount: s.retryCount + 1 }))}
              style={{ fontSize: '0.72rem', color: 'var(--lp-eyebrow)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', minHeight: 44, padding: '0 8px', outline: 'none' }}
              className="focus-visible:ring-2 focus-visible:ring-[var(--lp-eyebrow)] focus-visible:ring-offset-1 rounded"
            >
              Try again
            </button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export function FeatureSection({ data, sectionRef }: FeatureSectionProps) {
  const { t, locale } = useLocale();
  const BadgeIcon = data.badge.icon;
  const isRtl = locale === 'ar' ? data.direction === 'ltr' : data.direction === 'rtl';
  const sectionBg = BAND_BG[data.bandColor ?? 'dark1'];
  const prefersReducedMotion = useReducedMotion();

  const title = t(`landing.features.${data.id}.title`, data.title);
  const desc = t(`landing.features.${data.id}.desc`, data.desc);
  const badgeLabel = t(`landing.features.${data.id}.badge`, data.badge.label);
  const bigLabel = t(`landing.features.${data.id}.bigLabel`, data.bigLabel);
  const categoryLabel = data.categoryLabel ? t(`landing.features.${data.id}.categoryLabel`, data.categoryLabel) : undefined;
  const bullets = data.bullets.map((bullet, idx) => t(`landing.features.${data.id}.bullets.${idx}`, bullet));

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
      {categoryLabel && (
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
          {categoryLabel}
        </p>
      )}

      <motion.span
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold w-fit cursor-default"
        style={{
          background: 'rgba(158,27,34,0.10)',
          color: 'var(--lp-eyebrow)',
          border: '1px solid rgba(158,27,34,0.22)',
        }}
        whileHover={prefersReducedMotion ? {} : { borderColor: 'rgba(158,27,34,0.5)', background: 'rgba(158,27,34,0.16)' }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.span
          whileHover={prefersReducedMotion ? {} : { scale: 1.22, rotate: -8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: 'inline-flex' }}
        >
          <BadgeIcon className="w-3.5 h-3.5" />
        </motion.span>
        {badgeLabel}
      </motion.span>

      <div>
        <h2
          className="text-2xl sm:text-3xl font-bold leading-tight mb-3"
          style={{ color: 'var(--lp-text)', letterSpacing: '-0.025em', transition: 'color 0.3s ease' }}
        >
          {title}
        </h2>
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'var(--lp-text-muted)', lineHeight: 1.7, transition: 'color 0.3s ease' }}
        >
          {desc}
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
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, width: '100%' }}>
      <div className="lp-stack-parallax w-full flex items-center justify-center">
        <DemoErrorBoundary>
        <Suspense fallback={<DemoFallback />}>
          {data.demo === 'editor' && <LazyEditorDemo />}
          {data.demo === 'tailoring' && <LazyTailoringDemo />}
          {data.demo === 'portfolio' && <LazyPortfolioDemo />}
          {data.demo === 'interview' && <LazyInterviewDemo />}
          {data.demo === 'tracker' && <LazyTrackerDemo />}
        </Suspense>
      </DemoErrorBoundary>
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
      <ul className="lp-stack-bullets flex flex-wrap gap-2">
        {bullets.map((bullet) => (
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
      aria-label={title}
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
          {bigLabel}
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
