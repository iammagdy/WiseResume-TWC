import { lazy, Suspense } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Check } from 'lucide-react';

const LazyEditorDemo = lazy(() => import('@/components/landing/EditorDemo').then((m) => ({ default: m.EditorDemo })));
const LazyPortfolioDemo = lazy(() => import('@/components/landing/PortfolioDemo').then((m) => ({ default: m.PortfolioDemo })));
const LazyTailoringDemo = lazy(() => import('@/components/landing/TailoringDemo').then((m) => ({ default: m.TailoringDemo })));
const LazyInterviewDemo = lazy(() => import('@/components/landing/InterviewDemo').then((m) => ({ default: m.InterviewDemo })));
const LazyTrackerDemo = lazy(() => import('@/components/landing/TrackerDemo').then((m) => ({ default: m.TrackerDemo })));

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

const DemoFallback = () => (
  <div style={{ width: 260, height: 280, borderRadius: 20, background: 'var(--lp-card-glass)' }} />
);

export function FeatureSection({ data, sectionRef }: FeatureSectionProps) {
  const BadgeIcon = data.badge.icon;
  const isRtl = data.direction === 'rtl';
  const sectionBg = BAND_BG[data.bandColor ?? 'dark1'];

  const textCard = (
    <div
      className={`lp-animate ${isRtl ? 'lp-from-right' : 'lp-from-left'} flex flex-col justify-center gap-5 p-8`}
      style={{
        borderRadius: 24,
        background: 'var(--lp-card-glass)',
        border: '1px solid var(--lp-border-card)',
        minHeight: 280,
        transition: 'background 0.3s ease, border-color 0.3s ease, opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1)',
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
          background: 'rgba(99,102,241,0.12)',
          color: 'var(--lp-eyebrow)',
          border: '1px solid rgba(99,102,241,0.22)',
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
    </div>
  );

  const mediaCard = (
    <div
      className={`lp-animate ${isRtl ? 'lp-from-left' : 'lp-from-right'} flex items-center justify-center p-6`}
      style={{
        borderRadius: 24,
        background: 'var(--lp-card-glass)',
        border: '1px solid var(--lp-border-card)',
        minHeight: 280,
        transition: 'background 0.3s ease, border-color 0.3s ease, opacity 0.65s cubic-bezier(0.22,1,0.36,1) 100ms, transform 0.65s cubic-bezier(0.22,1,0.36,1) 100ms',
      }}
    >
      <Suspense fallback={<DemoFallback />}>
        {data.demo === 'editor' && <LazyEditorDemo />}
        {data.demo === 'tailoring' && <LazyTailoringDemo />}
        {data.demo === 'portfolio' && <LazyPortfolioDemo />}
        {data.demo === 'interview' && <LazyInterviewDemo />}
        {data.demo === 'tracker' && <LazyTrackerDemo />}
      </Suspense>
    </div>
  );

  const bulletsCard = (
    <div
      className="lp-animate flex flex-col gap-3 p-6"
      style={{
        borderRadius: 20,
        background: 'var(--lp-card-glass)',
        border: '1px solid var(--lp-border-card)',
        transition: 'background 0.3s ease, border-color 0.3s ease, opacity 0.65s cubic-bezier(0.22,1,0.36,1) 200ms, transform 0.65s cubic-bezier(0.22,1,0.36,1) 200ms',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(99,102,241,0.12)' }}
        >
          <BadgeIcon className="w-4 h-4" style={{ color: '#818CF8' }} />
        </div>
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--lp-text-muted)', letterSpacing: '0.06em' }}
        >
          Key Benefits
        </p>
      </div>
      <ul className="flex flex-wrap gap-2">
        {data.bullets.map((bullet, i) => (
          <li
            key={bullet}
            className="flex items-start gap-2 text-sm"
            style={{ color: 'var(--lp-text)', transitionDelay: `${i * 70}ms`, minWidth: '240px', flex: '1 1 240px', transition: 'color 0.3s ease' }}
          >
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: 'rgba(99,102,241,0.12)' }}
            >
              <Check className="w-2.5 h-2.5" style={{ color: '#818CF8' }} />
            </span>
            <span style={{ lineHeight: 1.55 }}>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <section
      ref={sectionRef as React.Ref<HTMLElement>}
      id={`feature-${data.id}`}
      aria-label={data.title}
      style={{
        background: sectionBg,
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        transition: 'background 0.3s ease',
      }}
    >
      {/* Watermark big label */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 'clamp(5rem, 14vw, 10rem)',
          fontWeight: 900,
          color: 'var(--lp-card-glass)',
          pointerEvents: 'none',
          userSelect: 'none',
          letterSpacing: '-0.05em',
          lineHeight: 1,
          opacity: 0.6,
        }}
      >
        {data.bigLabel}
      </span>

      <div
        className="max-w-6xl mx-auto w-full relative"
        style={{ padding: 'clamp(48px, 6vw, 80px) clamp(20px, 4vw, 40px)' }}
      >
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4"
          style={{ direction: isRtl ? 'rtl' : 'ltr' }}
        >
          <div style={{ direction: 'ltr' }} data-direction={isRtl ? 'right' : 'left'}>{textCard}</div>
          <div style={{ direction: 'ltr' }} data-direction={isRtl ? 'left' : 'right'}>{mediaCard}</div>
        </div>
        <div>{bulletsCard}</div>
      </div>
    </section>
  );
}
