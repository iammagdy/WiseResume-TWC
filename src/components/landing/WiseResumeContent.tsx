import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { FeatureSection } from '@/components/landing/FeatureSection';
import { TrustSection } from '@/components/landing/TrustSection';
import { SoftDivider } from '@/components/landing/SoftDivider';
import { Footer } from '@/components/landing/Footer';
import { InstallButton } from '@/components/pwa/InstallButton';
import {
  SCATTER_SECTION_ITEM, REDUCED_SECTION_ITEM,
  lpContainerVariants, lpItemVariants,
} from '@/components/landing/landingAnimations';
import {
  features, featureSections, FEATURE_IDS, FEATURE_NAV_LABELS,
} from '@/components/landing/wiseResumeFeatureData';

function FeatureNumberedNav({ sectionIds, labels }: { sectionIds: string[]; labels: string[] }) {
  const [activeIdx, setActiveIdx] = useState(-1);
  const [scrollStart, setScrollStart] = useState(true);
  const [scrollEnd, setScrollEnd] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    sectionIds.forEach((id, idx) => {
      const el = document.getElementById(`feature-${id}`);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveIdx(idx); },
        { threshold: 0.4 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [sectionIds]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setScrollStart(el.scrollLeft <= 4);
      setScrollEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(`feature-${id}`);
    if (el) el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
  };

  return (
    <div
      className="lp-feature-nav-wrapper"
      data-scroll-start={scrollStart ? 'true' : 'false'}
      data-scroll-end={scrollEnd ? 'true' : 'false'}
      data-scroll-mid={!scrollStart ? 'true' : 'false'}
      style={{
        position: 'sticky', top: 92, zIndex: 40,
        background: 'var(--lp-nav-bg)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--lp-nav-border)', transition: 'background 0.3s ease',
      }}
    >
      <div ref={scrollRef} className="w-full overflow-x-auto py-4 px-4 sm:px-6">
        <div className="flex items-center justify-center gap-1 sm:gap-2 min-w-max mx-auto">
          {sectionIds.map((id, idx) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="transition-all duration-200 text-xs sm:text-sm font-medium px-3 sm:px-4 rounded-full whitespace-nowrap"
              style={{
                minHeight: 44, minWidth: 44,
                background: activeIdx === idx ? 'var(--lp-brand-pill-bg)' : 'transparent',
                color: activeIdx === idx ? 'var(--lp-brand)' : 'var(--lp-text-subtle)',
                border: activeIdx === idx ? '1px solid var(--lp-brand-pill-border)' : '1px solid transparent',
              }}
            >
              {labels[idx]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface WiseResumeContentProps {
  prefersReducedMotion: boolean | null;
  isDark: boolean;
  onCTA: () => void;
}

export function WiseResumeContent({ prefersReducedMotion, isDark, onCTA }: WiseResumeContentProps) {
  const sectionItem = prefersReducedMotion ? REDUCED_SECTION_ITEM : SCATTER_SECTION_ITEM;

  return (
    <>
      {/* ─── SECTION 1: FEATURE NAV + HEADING + FEATURE BAND SECTIONS ─── */}
      <motion.div variants={sectionItem} custom={1}>
        <div className="lp-separator" aria-hidden="true" />
        <FeatureNumberedNav sectionIds={FEATURE_IDS} labels={FEATURE_NAV_LABELS} />
        <motion.div
          className="text-center px-4 sm:px-6 py-16 max-w-4xl mx-auto"
          variants={lpItemVariants}
          initial={prefersReducedMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
          style={{ background: 'var(--lp-bg)' }}
        >
          <p style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--lp-eyebrow)', fontWeight: 600, marginBottom: '0.75rem' }}>
            See it in action
          </p>
          <h2
            className="font-bold leading-tight"
            style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: 'var(--lp-text)', letterSpacing: '-0.02em' }}
          >
            Five tools. One platform.<br />
            <span className="lp-gradient-text">Your unfair advantage in the job market.</span>
          </h2>
        </motion.div>
        <SoftDivider />
        {featureSections.map((section) => (
          <FeatureSection key={section.id} data={section} />
        ))}
        <SoftDivider />
      </motion.div>

      {/* ─── SECTION 2: EVERYTHING YOU NEED GRID ─── */}
      <motion.div variants={sectionItem} custom={2}>
        <section className="px-4 sm:px-6 py-20" style={{ background: 'var(--lp-bg)' }}>
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="text-center mb-12"
              variants={lpItemVariants}
              initial={prefersReducedMotion ? 'visible' : 'hidden'}
              whileInView="visible"
              viewport={{ once: false, amount: 0.2 }}
            >
              <p style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--lp-eyebrow)', fontWeight: 600, marginBottom: '0.75rem' }}>
                Full toolkit
              </p>
              <h2 className="font-bold" style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', color: 'var(--lp-text)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                Everything you need
              </h2>
              <p style={{ color: 'var(--lp-text-muted)' }} className="max-w-md mx-auto">
                One platform for your entire job search
              </p>
            </motion.div>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto"
              variants={lpContainerVariants}
              initial={prefersReducedMotion ? 'visible' : 'hidden'}
              whileInView="visible"
              viewport={{ once: false, amount: 0.1 }}
            >
              {features.map((f) => (
                <motion.div
                  key={f.title}
                  variants={lpItemVariants}
                  className="flex items-start gap-4 p-5 lp-feature-card"
                  style={{ borderRadius: 16, background: 'var(--lp-card)', border: '1px solid var(--lp-border-card)' }}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? f.bgDark : f.bgLight}`}>
                    <f.icon className={`w-5 h-5 ${isDark ? f.colorDark : f.colorLight}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--lp-text)' }}>{f.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--lp-text-muted)' }}>{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </motion.div>

      {/* ─── SECTION 3: TRUST SECTION ─── */}
      <motion.div variants={sectionItem} custom={3}>
        <SoftDivider />
        <TrustSection />
      </motion.div>

      {/* ─── SECTION 4: PWA STRIP ─── */}
      <motion.div variants={sectionItem} custom={4}>
        <section className="px-4 sm:px-6 py-10" style={{ background: 'var(--lp-section-alt)', borderTop: '1px solid var(--lp-border)' }}>
          <motion.div
            className="max-w-xl mx-auto text-center"
            variants={lpItemVariants}
            initial={prefersReducedMotion ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
          >
            <p className="font-semibold mb-1" style={{ color: 'var(--lp-text)' }}>Install WiseResume</p>
            <p className="text-sm mb-4" style={{ color: 'var(--lp-text-muted)' }}>Add to your home screen for a native app experience</p>
            <InstallButton />
          </motion.div>
        </section>
      </motion.div>

      {/* ─── SECTION 5: CLOSING CTA + FOOTER ─── */}
      <motion.div variants={sectionItem} custom={5}>
        <section
          className="text-center"
          style={{
            background: 'var(--lp-section-alt)',
            borderTop: '1px solid var(--lp-border)',
            padding: 'clamp(52px, 6vw, 84px) clamp(20px, 4vw, 40px)',
            transition: 'background 0.35s ease',
          }}
        >
          <div className="max-w-2xl mx-auto">
            <p style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--lp-eyebrow)', fontWeight: 600, marginBottom: '0.75rem', transition: 'color 0.35s ease' }}>
              Start today
            </p>
            <h2
              className="font-bold leading-tight"
              style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', color: 'var(--lp-text)', letterSpacing: '-0.025em', marginBottom: '0.75rem', transition: 'color 0.35s ease' }}
            >
              Your career edge<br />starts here.
            </h2>
            <p className="max-w-md mx-auto text-sm mb-8" style={{ color: 'var(--lp-text-muted)', lineHeight: 1.65, transition: 'color 0.35s ease' }}>
              Free to start. No credit card. AI-powered results from day one.
            </p>
            <motion.button
              type="button"
              onClick={onCTA}
              className="inline-flex items-center gap-2 h-12 px-10 text-base font-semibold rounded-xl"
              style={{ background: '#9E1B22', color: '#fff' }}
              whileHover={prefersReducedMotion ? {} : { scale: 1.04 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </section>
        <Footer lpMode />
      </motion.div>
    </>
  );
}
