import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import triggerHaptic from '@/lib/haptics';
import { getSafeMatchMedia } from '@/lib/envUtils';
import { LandingToggle } from '@/components/landing/LandingToggle';
import { FeatureTicker } from '@/components/landing/FeatureTicker';
import { heroContainerVariants, heroItemVariants } from '@/components/landing/landingAnimations';
import { useTypewriterWord, TYPEWRITER_WORDS } from '@/hooks/useTypewriter';

function HeroParallaxGlow({ prefersReducedMotion }: { prefersReducedMotion: boolean | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState(() => getSafeMatchMedia('(min-width: 640px)').matches);

  useEffect(() => {
    const mql = getSafeMatchMedia('(min-width: 640px)');
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const { scrollY } = useScroll();
  // Only drive the parallax on desktop; on mobile the glow stays static to avoid
  // full-layer repaints every scroll frame on mid-range devices.
  const parallaxRange = isDesktop && !prefersReducedMotion ? -80 : 0;
  const y = useTransform(scrollY, [0, 600], [0, parallaxRange]);

  return (
    <motion.div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        y,
        willChange: isDesktop && !prefersReducedMotion ? 'transform' : 'auto',
      }}
    >
      <div className="lp-hero-parallax-glow" />
    </motion.div>
  );
}

interface WiseResumeHeroProps {
  mode: 'jobseeker' | 'wisehire';
  prefersReducedMotion: boolean | null;
  themeLogo: string;
  isAuthenticated: boolean;
  heroRef: React.RefObject<HTMLElement | null>;
  onModeChange: (m: 'jobseeker' | 'wisehire', origin: { x: number; y: number }) => void;
  onCTA: () => void;
}

export function WiseResumeHero({
  mode, prefersReducedMotion, themeLogo, isAuthenticated, heroRef, onModeChange, onCTA,
}: WiseResumeHeroProps) {
  const navigate = useNavigate();
  const typewriterWord = useTypewriterWord(TYPEWRITER_WORDS);

  return (
    <>
      <section
        ref={heroRef}
        className="lp-hero-top relative flex flex-col items-center text-center px-4 sm:px-6 overflow-hidden"
        style={{ background: 'var(--lp-bg)', paddingBottom: '4rem' }}
      >
        {/* Indigo radial glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 80% 55% at 50% 0%, var(--lp-hero-glow) 0%, transparent 65%)',
            transition: 'background 0.3s ease',
          }}
        />
        {/* Parallax depth layer */}
        <HeroParallaxGlow prefersReducedMotion={prefersReducedMotion} />

        {/* Stagger container wrapping all hero content */}
        <motion.div
          className="relative z-10 flex flex-col items-center text-center w-full"
          variants={heroContainerVariants}
          initial={prefersReducedMotion ? 'visible' : 'hidden'}
          animate="visible"
        >
          {/* Mobile product toggle — sits clearly inside the hero (header breathing
              room is handled by .lp-hero-top) with extra bottom spacing before the eyebrow. */}
          <div className="sm:hidden mt-1 mb-6">
            <LandingToggle
              uid="mob"
              compact
              mode={mode}
              prefersReducedMotion={prefersReducedMotion}
              onModeChange={onModeChange}
            />
          </div>

          {/* Eyebrow */}
          <motion.p
            variants={heroItemVariants}
            className="mb-4 sm:mb-7"
            style={{
              fontSize: '0.8rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--lp-eyebrow)',
              fontWeight: 600,
              transition: 'color 0.3s ease',
            }}
          >
            AI-Powered Career Platform
          </motion.p>

          {/* Main headline with typewriter */}
          <motion.h1
            variants={heroItemVariants}
            className="font-extrabold leading-[1.05]"
            style={{
              fontSize: 'clamp(1.9rem, 9vw, 5.5rem)',
              color: 'var(--lp-text)',
              letterSpacing: '-0.035em',
              transition: 'color 0.3s ease',
              overflow: 'visible',
              width: '100%',
              maxWidth: '100vw',
            }}
          >
            <span className="sm:whitespace-nowrap" style={{ display: 'block' }}>
              Stand out as a
            </span>
            {/* lp-typewriter-line: inline-block so it only takes the width it needs,
                with a hidden longest-word sentinel to reserve constant horizontal space
                and prevent layout shifts as words cycle. */}
            <span className="lp-typewriter-line" style={{ display: 'inline-block', position: 'relative' }}>
              {/* Invisible sentinel reserves the width of the longest possible word */}
              <span aria-hidden="true" style={{ visibility: 'hidden', display: 'block', whiteSpace: 'nowrap' }}>
                {TYPEWRITER_WORDS.reduce((a, b) => a.length >= b.length ? a : b)}
              </span>
              {/* Visible gradient text, absolutely centred over the sentinel */}
              <span
                className="lp-gradient-text"
                style={{ display: 'block', position: 'absolute', inset: 0, textAlign: 'center', whiteSpace: 'nowrap' }}
              >
                {typewriterWord || '\u00A0'}
                <span className="lp-cursor" aria-hidden="true" />
              </span>
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            variants={heroItemVariants}
            className="mt-4 mb-7 sm:mt-6 sm:mb-10"
            style={{
              fontSize: 'clamp(1rem, 2.2vw, 1.2rem)',
              lineHeight: 1.6,
              color: 'var(--lp-text-muted)',
              maxWidth: 500,
            }}
          >
            AI that builds, tailors, and lands your next job.
          </motion.p>

          {/* CTA */}
          <motion.div variants={heroItemVariants}>
            {isAuthenticated ? (
              <motion.button
                onClick={() => { triggerHaptic.light(); navigate('/dashboard'); }}
                className="h-12 px-8 text-base font-semibold rounded-xl flex items-center gap-2"
                style={{ background: '#9E1B22', color: '#fff' }}
                whileHover={prefersReducedMotion ? {} : { scale: 1.04 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            ) : (
              <motion.button
                onClick={onCTA}
                className="h-12 px-8 text-base font-semibold rounded-xl flex items-center gap-2"
                style={{ background: '#9E1B22', color: '#fff' }}
                whileHover={prefersReducedMotion ? {} : { scale: 1.04 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            )}
          </motion.div>

          {/* Trust badges — horizontal scroll strip on mobile, wrap on sm+ */}
          <motion.div
            variants={heroItemVariants}
            className="mt-6 sm:mt-8 text-xs lp-trust-badges"
          >
            {['Free to start', 'No credit card', 'AI-powered'].map((item) => (
              <span key={item} className="flex items-center gap-1.5" style={{ color: 'var(--lp-trust-color)', transition: 'color 0.3s ease' }}>
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--lp-trust-icon)', transition: 'color 0.3s ease' }} />
                {item}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Feature ticker */}
      <motion.div
        initial={prefersReducedMotion ? 'visible' : 'hidden'}
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={{
          hidden: { opacity: 0, y: 60 },
          visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 22 } },
        }}
      >
        <FeatureTicker lpMode />
      </motion.div>
    </>
  );
}
