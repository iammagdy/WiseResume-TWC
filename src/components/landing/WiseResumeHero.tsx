import { useRef } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import triggerHaptic from '@/lib/haptics';
import { LandingToggle } from '@/components/landing/LandingToggle';
import { FeatureTicker } from '@/components/landing/FeatureTicker';
import { heroContainerVariants, heroItemVariants } from '@/components/landing/landingAnimations';
import { useTypewriterWord, TYPEWRITER_WORDS } from '@/hooks/useTypewriter';

function HeroParallaxGlow({ prefersReducedMotion }: { prefersReducedMotion: boolean | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, prefersReducedMotion ? 0 : -80]);

  return (
    <motion.div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ y }}
    >
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '70vw',
          height: '40vh',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, var(--lp-hero-glow) 0%, transparent 70%)',
          filter: 'blur(40px)',
          opacity: 0.7,
        }}
      />
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
          {/* Mobile product toggle */}
          <div className="sm:hidden mb-4">
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
            className="mb-7"
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
            <span style={{ display: 'block', minHeight: '1.15em' }}>
              <span className="lp-gradient-text" style={{ display: 'inline-block' }}>
                {typewriterWord || '\u00A0'}
                <span className="lp-cursor" aria-hidden="true" />
              </span>
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            variants={heroItemVariants}
            className="mt-6 mb-10"
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

          {/* Trust badges */}
          <motion.div
            variants={heroItemVariants}
            className="mt-8 flex items-center gap-5 sm:gap-7 text-xs flex-wrap justify-center"
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
        viewport={{ once: false, amount: 0.15 }}
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
