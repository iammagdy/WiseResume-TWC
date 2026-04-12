import { lazy, Suspense, useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Check } from 'lucide-react';

const LazyEditorDemo = lazy(() => import('@/components/landing/EditorDemo').then((m) => ({ default: m.EditorDemo })));
const LazyPortfolioDemo = lazy(() => import('@/components/landing/PortfolioDemo').then((m) => ({ default: m.PortfolioDemo })));
const LazyTailoringDemo = lazy(() => import('@/components/landing/TailoringDemo').then((m) => ({ default: m.TailoringDemo })));
const LazyInterviewDemo = lazy(() => import('@/components/landing/InterviewDemo').then((m) => ({ default: m.InterviewDemo })));
const LazyTrackerDemo = lazy(() => import('@/components/landing/TrackerDemo').then((m) => ({ default: m.TrackerDemo })));

const DemoFallback = ({ bandColor }: { bandColor: BandColor }) => {
  const styles = BAND_STYLES[bandColor];
  return (
    <div style={{ width: 260, height: 280, borderRadius: 20, background: styles.cardBg }} />
  );
};

export type DemoKey = 'editor' | 'tailoring' | 'portfolio' | 'interview' | 'tracker';
export type BandColor = 'brand' | 'beige' | 'dark' | 'tint';

export interface FeatureSectionData {
  id: string;
  direction: 'ltr' | 'rtl';
  badge: { icon: LucideIcon; label: string; color: string };
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

interface BandStyle {
  bg: string;
  text: string;
  textMuted: string;
  checkColor: string;
  badgeBg: string;
  badgeText: string;
  cardBg: string;
  iconBg: string;
  bigLabelColor: string;
}

const BAND_STYLES: Record<BandColor, BandStyle> = {
  brand: {
    bg: '#4F46E5',
    text: '#fff',
    textMuted: 'rgba(255,255,255,0.72)',
    checkColor: '#fff',
    badgeBg: 'rgba(255,255,255,0.18)',
    badgeText: '#fff',
    cardBg: 'rgba(255,255,255,0.12)',
    iconBg: 'rgba(255,255,255,0.15)',
    bigLabelColor: 'rgba(255,255,255,0.04)',
  },
  beige: {
    bg: '#E8E0D6',
    text: '#1A1A2E',
    textMuted: '#6B6670',
    checkColor: '#4F46E5',
    badgeBg: '#fff',
    badgeText: '#4F46E5',
    cardBg: '#fff',
    iconBg: 'rgba(79,70,229,0.1)',
    bigLabelColor: 'rgba(26,26,46,0.04)',
  },
  dark: {
    bg: '#1A1A2E',
    text: '#fff',
    textMuted: 'rgba(255,255,255,0.6)',
    checkColor: '#fff',
    badgeBg: 'rgba(255,255,255,0.12)',
    badgeText: '#fff',
    cardBg: 'rgba(255,255,255,0.07)',
    iconBg: 'rgba(255,255,255,0.1)',
    bigLabelColor: 'rgba(255,255,255,0.03)',
  },
  tint: {
    bg: '#EEF2FF',
    text: '#1A1A2E',
    textMuted: '#6B6670',
    checkColor: '#4F46E5',
    badgeBg: '#fff',
    badgeText: '#4F46E5',
    cardBg: '#fff',
    iconBg: 'rgba(79,70,229,0.1)',
    bigLabelColor: 'rgba(26,26,46,0.04)',
  },
};

export function FeatureSection({ data, sectionRef }: FeatureSectionProps) {
  const BadgeIcon = data.badge.icon;
  const isRtl = data.direction === 'rtl';
  const band = data.bandColor ?? 'beige';
  const s = BAND_STYLES[band];

  const textCard = (
    <div
      className={`lp-animate ${isRtl ? 'lp-from-right' : 'lp-from-left'} flex flex-col justify-center gap-5 p-8`}
      style={{
        borderRadius: 28,
        background: s.cardBg,
        boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
        minHeight: 280,
      }}
    >
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold w-fit"
        style={{ background: s.badgeBg, color: s.badgeText }}
      >
        <BadgeIcon className="w-3.5 h-3.5" />
        {data.badge.label}
      </span>

      <div>
        <h2
          className="text-2xl sm:text-3xl font-bold leading-tight mb-3"
          style={{ color: s.text, letterSpacing: '-0.02em' }}
        >
          {data.title}
        </h2>
        <p
          className="text-sm leading-relaxed"
          style={{ color: s.textMuted, lineHeight: 1.65 }}
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
        borderRadius: 28,
        background: s.cardBg,
        boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
        minHeight: 280,
        transitionDelay: '120ms',
      }}
    >
      <Suspense fallback={<DemoFallback bandColor={band} />}>
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
        borderRadius: 24,
        background: s.cardBg,
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        transitionDelay: '240ms',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: s.iconBg }}
        >
          <BadgeIcon className="w-4 h-4" style={{ color: band === 'brand' || band === 'dark' ? '#fff' : '#4F46E5' }} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: s.textMuted, letterSpacing: '0.06em' }}>Key Benefits</p>
      </div>
      <ul className="space-y-2">
        {data.bullets.map((bullet, i) => (
          <li
            key={bullet}
            className="flex items-start gap-2 text-sm"
            style={{ color: s.text, transitionDelay: `${i * 80}ms` }}
          >
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: s.iconBg }}
            >
              <Check className="w-2.5 h-2.5" style={{ color: s.checkColor }} />
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
      style={{ background: s.bg, width: '100%', position: 'relative', overflow: 'hidden' }}
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
          color: s.bigLabelColor,
          pointerEvents: 'none',
          userSelect: 'none',
          letterSpacing: '-0.05em',
          lineHeight: 1,
        }}
      >
        {data.bigLabel}
      </span>

      <div
        className="max-w-6xl mx-auto w-full relative"
        style={{ padding: 'clamp(48px, 6vw, 80px) clamp(20px, 4vw, 40px)' }}
      >
        {/* Row 1: text card + media card */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5"
          style={{ direction: isRtl ? 'rtl' : 'ltr' }}
        >
          <div style={{ direction: 'ltr' }}>{textCard}</div>
          <div style={{ direction: 'ltr' }}>{mediaCard}</div>
        </div>

        {/* Row 2: bullets/benefits card (full width) */}
        <div>{bulletsCard}</div>
      </div>
    </section>
  );
}

interface FeatureDotNavProps {
  sectionIds: string[];
}

export function FeatureDotNav({ sectionIds }: FeatureDotNavProps) {
  const [activeIdx, setActiveIdx] = useState(-1);
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id, idx) => {
      const el = document.getElementById(`feature-${id}`);
      if (!el) return;

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveIdx(idx);
          }
        },
        { threshold: 0.5 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((obs) => obs.disconnect());
  }, [sectionIds]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(`feature-${id}`);
    if (el) el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
  };

  if (activeIdx < 0) return null;

  return (
    <div
      className="fixed right-5 top-1/2 -translate-y-1/2 z-30 hidden xl:flex flex-col gap-3"
      aria-label="Feature section navigation"
      role="navigation"
    >
      {sectionIds.map((id, idx) => (
        <button
          key={id}
          onClick={() => scrollToSection(id)}
          aria-label={`Go to feature section ${idx + 1}`}
          style={{
            borderRadius: '50%',
            width: idx === activeIdx ? 10 : 8,
            height: idx === activeIdx ? 10 : 8,
            background: idx === activeIdx ? 'var(--lp-brand, #4F46E5)' : 'rgba(79,70,229,0.25)',
            boxShadow: idx === activeIdx ? '0 0 8px var(--lp-brand, rgba(79,70,229,0.5))' : 'none',
            transition: 'all 0.3s ease',
            border: 'none',
            cursor: 'pointer',
          }}
        />
      ))}
    </div>
  );
}
