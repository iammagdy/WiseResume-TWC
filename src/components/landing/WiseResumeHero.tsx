import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import triggerHaptic from '@/lib/haptics';
import { getSafeMatchMedia } from '@/lib/envUtils';
import { LandingToggle } from '@/components/landing/LandingToggle';
import { FeatureTicker } from '@/components/landing/FeatureTicker';
import { heroContainerVariants, heroItemVariants } from '@/components/landing/landingAnimations';
import { TypewriterHeadlineLine } from '@/components/landing/TypewriterHeadlineLine';
import { useTypewriterWord } from '@/hooks/useTypewriter';
import { useLocale } from '@/i18n/LocaleProvider';

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
  const { locale, t } = useLocale();

  const typewriterWords = [
    t('landing.typewriterWords.word0', 'Senior Developer'),
    t('landing.typewriterWords.word1', 'Product Manager'),
    t('landing.typewriterWords.word2', 'Data Analyst'),
    t('landing.typewriterWords.word3', 'UX Designer'),
    t('landing.typewriterWords.word4', 'Data Engineer'),
    t('landing.typewriterWords.word5', 'Marketing Lead'),
  ];

  const typewriterWord = useTypewriterWord(typewriterWords);
  const [navigating, setNavigating] = useState(false);

  return (
    <>
      <section
        ref={heroRef}
        className="lp-hero-top relative flex flex-col items-center text-center px-4 sm:px-6 overflow-hidden"
        style={{ background: 'var(--lp-bg)', paddingBottom: 'clamp(4.5rem, 8vw, 6.5rem)' }}
        data-section="hero"
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
              {t('landing.standOutAsA', 'Stand out as a')}
            </span>
            <TypewriterHeadlineLine word={typewriterWord} showCursor />
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
            {t('landing.heroSubheading', 'AI that builds, tailors, and lands your next job.')}
          </motion.p>

          {/* CTA */}
          <motion.div variants={heroItemVariants}>
            {isAuthenticated ? (
              <motion.button
                onClick={() => {
                  if (navigating) return;
                  setNavigating(true);
                  triggerHaptic.light();
                  navigate('/dashboard');
                }}
                disabled={navigating}
                aria-disabled={navigating}
                className="h-12 px-8 text-base font-semibold rounded-xl flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#9E1B22] disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ background: 'var(--lp-brand)', color: '#fff' }}
                whileHover={prefersReducedMotion || navigating ? {} : { scale: 1.04, boxShadow: '0 0 28px 4px rgba(158,27,34,0.45)' }}
                whileTap={prefersReducedMotion || navigating ? {} : { scale: 0.97, boxShadow: '0 0 10px 2px rgba(158,27,34,0.25)' }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                data-track="hero-go-to-dashboard"
              >
                {t('landing.goToDashboard', 'Go to Dashboard')}
                <ArrowRight className="w-4 h-4" style={{ transform: locale === 'ar' ? 'rotate(180deg)' : undefined }} />
              </motion.button>
            ) : (
              <motion.button
                onClick={onCTA}
                className="h-12 px-8 text-base font-semibold rounded-xl flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#9E1B22]"
                style={{ background: 'var(--lp-brand)', color: '#fff' }}
                whileHover={prefersReducedMotion ? {} : { scale: 1.04, boxShadow: '0 0 28px 4px rgba(158,27,34,0.45)' }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.97, boxShadow: '0 0 10px 2px rgba(158,27,34,0.25)' }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                data-track="hero-get-started-free"
              >
                {t('landing.getStartedFree', 'Get Started Free')}
                <ArrowRight className="w-4 h-4" style={{ transform: locale === 'ar' ? 'rotate(180deg)' : undefined }} />
              </motion.button>
            )}
          </motion.div>

          {/* Trust badges — horizontal scroll strip on mobile, wrap on sm+ */}
          <motion.div
            variants={heroItemVariants}
            className="mt-6 sm:mt-8 text-xs lp-trust-badges"
          >
            {[
              t('landing.freeToStart', 'Free to start'),
              t('landing.noCreditCard', 'No credit card'),
              t('landing.aiPowered', 'AI-powered'),
            ].map((item) => (
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
        className="mt-3 sm:mt-0"
        initial={prefersReducedMotion ? 'visible' : 'hidden'}
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={{
          hidden: { opacity: 0, y: 60 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
        }}
      >
        <FeatureTicker lpMode />
      </motion.div>
    </>
  );
}
