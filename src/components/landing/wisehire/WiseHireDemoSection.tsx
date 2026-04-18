import { lazy, Suspense, useEffect, useRef, useState, type ComponentType } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Brain, Kanban, FileText, Upload, Archive, CheckCircle2, type LucideIcon } from 'lucide-react';
import { ScrollStack, ScrollStackItem } from '@/components/landing/ScrollStack';

/* Phase 2: lazy-load each WiseHire demo component so they don't bloat
   the initial bundle. Mirrors the pattern in FeatureSection.tsx. */
const BriefDemo = lazy(() => import('./BriefDemo').then((m) => ({ default: m.BriefDemo })));
const PipelineDemo = lazy(() => import('./PipelineDemo').then((m) => ({ default: m.PipelineDemo })));
const JDDemo = lazy(() => import('./JDDemo').then((m) => ({ default: m.JDDemo })));
const BulkScreeningDemo = lazy(() => import('./BulkScreeningDemo').then((m) => ({ default: m.BulkScreeningDemo })));
const TalentPoolDemo = lazy(() => import('./TalentPoolDemo').then((m) => ({ default: m.TalentPoolDemo })));
const OfferTrackerDemo = lazy(() => import('./OfferTrackerDemo').then((m) => ({ default: m.OfferTrackerDemo })));

const DemoFallback = () => (
  <div aria-hidden="true" style={{ minHeight: 320, width: '100%' }} />
);

/* Visibility-gated mount: only mounts (and triggers React.lazy import)
   when the slot is approaching the viewport. Keeps height stable via
   DemoFallback so ScrollStack measurements stay accurate. */
function LazyOnVisible({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [visible]);

  return (
    <div ref={ref} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      {visible ? children : <DemoFallback />}
    </div>
  );
}

const DEMOS: { key: string; label: string; icon: LucideIcon; desc: string; Demo: ComponentType }[] = [
  { key: 'brief', label: 'Brief Generator', icon: Brain, desc: 'AI reads a CV and produces a structured candidate brief with match score, strengths, red flags, and interview questions — in under 10 seconds.', Demo: BriefDemo },
  { key: 'jd', label: 'JD Writer', icon: FileText, desc: 'Type a job title, click generate. AI writes a complete, bias-aware job description tailored to the role and your company voice.', Demo: JDDemo },
  { key: 'pipeline', label: 'Pipeline Board', icon: Kanban, desc: 'Visualise your full hiring funnel with drag-and-drop kanban. Every candidate, every stage, every status — at a glance.', Demo: PipelineDemo },
  { key: 'bulk', label: 'Bulk Screening', icon: Upload, desc: 'Upload multiple CVs at once. AI scores and ranks every applicant against your role criteria — no manual reading required.', Demo: BulkScreeningDemo },
  { key: 'pool', label: 'Talent Pool', icon: Archive, desc: 'Never lose a great candidate. Build a searchable pool of past applicants you can re-engage for future roles instantly.', Demo: TalentPoolDemo },
  { key: 'offers', label: 'Offer Tracker', icon: CheckCircle2, desc: 'Track every offer from sent to signed. See salary, status, and next steps for each candidate in one live view.', Demo: OfferTrackerDemo },
];

export function WiseHireDemoSection() {
  const prefersReducedMotion = useReducedMotion();
  /* Phase 4: track active scroll-stack card for the sticky step chip. */
  const [activeIdx, setActiveIdx] = useState(-1);
  const total = DEMOS.length;
  const activeLabel = activeIdx >= 0 ? DEMOS[activeIdx]?.label : null;

  const headingVariant = prefersReducedMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.25 } } }
    : { hidden: { opacity: 0, y: 80 }, visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 22 } } };

  return (
    <section
      id="wisehire-demo"
      style={{
        background: 'var(--lp-section-alt2)',
        borderTop: '1px solid var(--lp-border)',
        width: '100%',
        scrollMarginTop: '96px',
        transition: 'background 0.35s ease',
      }}
    >
      <div
        className="lp-stack-section"
        style={{ ['--lp-stack-gap' as string]: '260px' }}
      >
      <div className="lp-stack-sticky-header">
        <motion.div
          variants={headingVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.25 }}
        >
          <p
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--lp-eyebrow)',
              fontWeight: 600,
              marginBottom: '0.75rem',
              transition: 'color 0.35s ease',
            }}
          >
            See it in action
          </p>
          <h2
            className="font-bold leading-tight"
            style={{
              fontSize: 'clamp(1.9rem, 4vw, 2.8rem)',
              color: 'var(--lp-text)',
              letterSpacing: '-0.025em',
              transition: 'color 0.35s ease',
            }}
          >
            Watch AI handle the heavy lifting
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
        itemDistance={520}
        itemScale={0.025}
        itemStackDistance={20}
        stackPosition="20%"
        baseScale={0.88}
        onActiveCardChange={setActiveIdx}
      >
        {DEMOS.map(({ key, label, icon: Icon, desc, Demo }) => (
          <ScrollStackItem key={key}>
            <div
              style={{
                width: '100%',
              }}
            >
              <div
                className="max-w-6xl mx-auto w-full"
                style={{ padding: 'clamp(32px, 4vw, 56px) clamp(20px, 4vw, 40px)' }}
              >
                <div
                  style={{
                    borderRadius: 24,
                    background: 'var(--lp-card)',
                    border: '1px solid var(--lp-border-card)',
                    padding: 'clamp(20px, 3vw, 36px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 24,
                    transition: 'background 0.35s ease, border-color 0.35s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: 'rgba(29,78,216,0.10)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: '#3B82F6' }} />
                    </div>
                    <div>
                      <h3
                        className="font-bold"
                        style={{ fontSize: 'clamp(1.1rem, 2vw, 1.4rem)', color: 'var(--lp-text)', letterSpacing: '-0.015em' }}
                      >
                        {label}
                      </h3>
                      <p
                        style={{
                          fontSize: '0.82rem',
                          color: 'var(--lp-text-muted)',
                          lineHeight: 1.6,
                          maxWidth: 560,
                          marginTop: 2,
                          transition: 'color 0.35s ease',
                        }}
                      >
                        {desc}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-center lp-stack-parallax">
                    <LazyOnVisible>
                      <Suspense fallback={<DemoFallback />}>
                        <Demo />
                      </Suspense>
                    </LazyOnVisible>
                  </div>
                </div>
              </div>
            </div>
          </ScrollStackItem>
        ))}
      </ScrollStack>
      </div>
    </section>
  );
}
