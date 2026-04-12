import { lazy, Suspense, useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';

const LazyEditorDemo = lazy(() => import('@/components/landing/EditorDemo').then((m) => ({ default: m.EditorDemo })));
const LazyPortfolioDemo = lazy(() => import('@/components/landing/PortfolioDemo').then((m) => ({ default: m.PortfolioDemo })));
const LazyTailoringDemo = lazy(() => import('@/components/landing/TailoringDemo').then((m) => ({ default: m.TailoringDemo })));
const LazyInterviewDemo = lazy(() => import('@/components/landing/InterviewDemo').then((m) => ({ default: m.InterviewDemo })));
const LazyTrackerDemo = lazy(() => import('@/components/landing/TrackerDemo').then((m) => ({ default: m.TrackerDemo })));

const DemoFallback = () => (
  <div className="w-[260px] h-[280px] rounded-2xl border border-border bg-muted/50 animate-pulse" />
);

export type DemoKey = 'editor' | 'tailoring' | 'portfolio' | 'interview' | 'tracker';

export interface FeatureSectionData {
  id: string;
  direction: 'ltr' | 'rtl';
  badge: { icon: LucideIcon; label: string; color: string };
  bigLabel: string;
  title: string;
  desc: string;
  bullets: string[];
  demo: DemoKey;
}

interface FeatureSectionProps {
  data: FeatureSectionData;
  sectionRef?: React.Ref<HTMLElement>;
}

export function FeatureSection({ data, sectionRef }: FeatureSectionProps) {
  const prefersReducedMotion = useReducedMotion();
  const BadgeIcon = data.badge.icon;
  const isRtl = data.direction === 'rtl';

  const textBlock = (
    <motion.div
      className="flex flex-col justify-center gap-5"
      initial={prefersReducedMotion ? false : { opacity: 0, x: isRtl ? 32 : -32 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
    >
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold w-fit ${data.badge.color}`}>
        <BadgeIcon className="w-3.5 h-3.5" />
        {data.badge.label}
      </span>

      <div>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-tight mb-3">
          {data.title}
        </h2>
        <p className="text-base text-muted-foreground leading-relaxed max-w-sm">
          {data.desc}
        </p>
      </div>

      <ul className="space-y-2.5">
        {data.bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2.5 text-sm text-foreground/80">
            <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-primary" />
            </span>
            {bullet}
          </li>
        ))}
      </ul>
    </motion.div>
  );

  const demoBlock = (
    <motion.div
      className="flex items-center justify-center"
      initial={prefersReducedMotion ? false : { opacity: 0, x: isRtl ? -32 : 32 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, delay: 0.1, ease: 'easeOut' }}
    >
      <Suspense fallback={<DemoFallback />}>
        {data.demo === 'editor' && <LazyEditorDemo />}
        {data.demo === 'tailoring' && <LazyTailoringDemo />}
        {data.demo === 'portfolio' && <LazyPortfolioDemo />}
        {data.demo === 'interview' && <LazyInterviewDemo />}
        {data.demo === 'tracker' && <LazyTrackerDemo />}
      </Suspense>
    </motion.div>
  );

  return (
    <section
      ref={sectionRef as React.Ref<HTMLElement>}
      id={`feature-${data.id}`}
      className="relative py-16 sm:py-24 px-4 sm:px-6 overflow-hidden min-h-[70vh] flex flex-col justify-center"
      aria-label={data.title}
    >
      <span
        className="absolute inset-0 flex items-center justify-center text-[clamp(5rem,14vw,10rem)] font-black text-foreground/[0.03] dark:text-foreground/[0.04] select-none pointer-events-none leading-none tracking-tighter"
        aria-hidden="true"
      >
        {data.bigLabel}
      </span>

      <div className="max-w-5xl mx-auto relative">
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 gap-12 sm:gap-16 items-center ${
            isRtl ? 'sm:[direction:rtl]' : ''
          }`}
        >
          <div className={isRtl ? 'sm:[direction:ltr]' : ''}>{textBlock}</div>
          <div className={isRtl ? 'sm:[direction:ltr]' : ''}>{demoBlock}</div>
        </div>
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
          className={`rounded-full transition-all duration-300 ${
            idx === activeIdx
              ? 'w-2.5 h-2.5 bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]'
              : 'w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/60'
          }`}
        />
      ))}
    </div>
  );
}
