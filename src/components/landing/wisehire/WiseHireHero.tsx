import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { ArrowRight, CheckCircle2, ChevronDown, LayoutDashboard, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useLocale } from '@/i18n/LocaleProvider';

function useCountUp(target: number, prefersReduced: boolean | null, duration = 1400) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(containerRef, { once: true, amount: 0.5 });

  // For reduced-motion: set the final value immediately on mount (no inView gate needed)
  useEffect(() => {
    if (prefersReduced && countRef.current) {
      countRef.current.textContent = String(target);
    }
  }, [prefersReduced, target]);

  // For normal motion: animate via RAF when element comes into view
  useEffect(() => {
    const el = countRef.current;
    if (!inView || !el || prefersReduced) return;
    el.textContent = '0';
    const start = performance.now();
    let rafId: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = String(Math.round(ease * target));
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [inView, target, duration, prefersReduced]);

  const initialText = prefersReduced ? String(target) : '0';
  return { containerRef, countRef, initialText };
}

function useWHTypewriter(words: string[], prefersReduced: boolean | null) {
  const [displayed, setDisplayed] = useState(prefersReduced ? words[0] : '');
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(prefersReduced ? words[0].length : 0);
  const [phase, setPhase] = useState<'typing' | 'erasing'>('typing');

  useEffect(() => {
    if (prefersReduced) {
      setDisplayed(words[0]);
      return;
    }
    const current = words[wordIdx];
    if (phase === 'typing') {
      if (charIdx < current.length) {
        const t = setTimeout(() => {
          setDisplayed(current.slice(0, charIdx + 1));
          setCharIdx((i) => i + 1);
        }, 60);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setPhase('erasing'), 2200);
        return () => clearTimeout(t);
      }
    } else {
      if (charIdx > 0) {
        const t = setTimeout(() => {
          setCharIdx((i) => i - 1);
          setDisplayed(current.slice(0, charIdx - 1));
        }, Math.max(20, 320 / current.length));
        return () => clearTimeout(t);
      } else {
        setWordIdx((i) => (i + 1) % words.length);
        setCharIdx(0);
        setDisplayed('');
        setPhase('typing');
      }
    }
  }, [phase, charIdx, wordIdx, words, prefersReduced]);

  return displayed;
}

interface WiseHireHeroProps {
  isAuthenticated: boolean;
  onOpenWaitlist: () => void;
  mobileToggle?: ReactNode;
}

function WhHeroDecor({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      aria-hidden="true"
      className={`wh-hero-decor wh-hero-decor-${side}`}
    >
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="92" strokeWidth="1" />
        <circle cx="100" cy="100" r="68" strokeWidth="1" />
        <circle cx="100" cy="100" r="44" strokeWidth="1" />
        <circle cx="100" cy="100" r="20" strokeWidth="1" />
        <circle cx="192" cy="100" r="3" />
        <circle cx="100" cy="32"  r="3" />
        <circle cx="100" cy="168" r="3" />
        <circle cx="156" cy="44"  r="2" />
        <circle cx="44"  cy="156" r="2" />
      </svg>
    </div>
  );
}

export function WiseHireHero({ isAuthenticated, onOpenWaitlist, mobileToggle }: WiseHireHeroProps) {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const prefersReducedMotion = useReducedMotion();
  const { t, locale } = useLocale();

  const typewriterWords = [
    t('landing.wisehire.typewriter.word0', 'Hiring Manager'),
    t('landing.wisehire.typewriter.word1', 'Recruiter'),
    t('landing.wisehire.typewriter.word2', 'HR Director'),
    t('landing.wisehire.typewriter.word3', 'Head of People'),
    t('landing.wisehire.typewriter.word4', 'Talent Partner'),
  ];
  const typewriterWord = useWHTypewriter(typewriterWords, prefersReducedMotion);
  const waitlistCount = useCountUp(500, prefersReducedMotion);
  const showDashboardCta = isAuthenticated && isAdmin;

  return (
    <section
      className="lp-hero-top relative flex flex-col items-center text-center px-4 sm:px-6 overflow-hidden"
      style={{
        background: 'var(--lp-bg)',
        paddingBottom: '4.5rem',
        transition: 'background 0.35s ease',
      }}
    >
      {/* Decorative background layers (radial blue glow + grid mesh +
          vignette) and the orbital "pipeline ring" side ornaments were
          removed at the user's request so the WiseHire landing matches
          WiseResume's clean aurora-only look. The shared aurora canvas
          (rendered by AuroraLayer above the route tree) is now the
          sole hero background. WhHeroDecor / .wh-hero-bg / .wh-hero-vignette
          definitions are intentionally left in place so the visual can
          be reinstated without re-authoring it. */}

      {/* Mobile product toggle slot — rendered here so it sits inside the hero padding area */}
      {mobileToggle}

      {/* WiseHire brand pill — now with a live dot + animated sheen */}
      <div
        className="wh-pill relative z-10 flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 sm:mb-6"
        style={{
          background: 'var(--lp-brand-pill-bg)',
          border: '1px solid var(--lp-brand-pill-border)',
          boxShadow: '0 0 18px 0 var(--lp-brand-pill-glow)',
          transition: 'background 0.35s ease, border-color 0.35s ease',
        }}
      >
        <span aria-hidden="true" className="wh-pill-dot" />
        <span
          className="font-display font-semibold tracking-tight"
          style={{ fontSize: '0.85rem', color: 'var(--lp-eyebrow)', transition: 'color 0.35s ease' }}
        >
          {t('landing.wisehire.nowInEarlyAccess', 'Now in early access')}
        </span>
      </div>

      {/* Headline */}
      <h1
        className="relative z-10 font-extrabold leading-[1.04] max-w-4xl"
        style={{
          fontSize: 'clamp(1.75rem, 8.5vw, 6.5rem)',
          color: 'var(--lp-text)',
          letterSpacing: '-0.04em',
          transition: 'color 0.35s ease',
        }}
      >
        <span className="sm:whitespace-nowrap" style={{ display: 'block' }}>
          {t('landing.wisehire.hireSmarter', 'Hire Smarter.')}
        </span>
        <span className="sm:whitespace-nowrap" style={{ display: 'block' }}>
          {t('landing.wisehire.screenFaster', 'Screen Faster.')}
        </span>
      </h1>

      {/* Typewriter subtitle — caret softened via CSS .wh-cursor box-shadow */}
      <p
        className="relative z-10 mt-4 sm:mt-5 wh-typewriter-line"
        style={{
          fontSize: 'clamp(1rem, 2.4vw, 1.35rem)',
          color: 'var(--lp-text-muted)',
          letterSpacing: '-0.01em',
          transition: 'color 0.35s ease',
        }}
      >
        {t('landing.wisehire.builtFor', 'Built for the ')}{' '}
        <span style={{ display: 'inline-block', fontWeight: 700, color: 'var(--lp-eyebrow)' }}>
          {typewriterWord || '\u00A0'}
          {!prefersReducedMotion && <span className="wh-cursor" aria-hidden="true" />}
        </span>
      </p>

      {/* Subheading */}
      <p
        className="relative z-10 mt-3 mb-7 sm:mt-4 sm:mb-10"
        style={{
          fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
          lineHeight: 1.65,
          color: 'var(--lp-text-muted)',
          maxWidth: 480,
          transition: 'color 0.35s ease',
        }}
      >
        {t('landing.wisehire.subheading', 'AI that screens candidates, writes job descriptions, and surfaces your best hires — in minutes, not hours.')}
      </p>

      {/* CTAs — primary now uses a token-driven glow + hover lift; secondary
          gets a clearer hover/focus state. Tightened gap (12 → 10px). */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center gap-2.5">
        <motion.button
          onClick={showDashboardCta ? () => navigate('/wisehire/dashboard') : onOpenWaitlist}
          className="wh-cta-primary h-12 px-8 text-base font-semibold rounded-xl flex items-center gap-2"
          whileHover={prefersReducedMotion ? undefined : { y: -2, scale: 1.03, boxShadow: '0 0 28px 4px rgba(29,78,216,0.45)' }}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.97, boxShadow: '0 0 10px 2px rgba(29,78,216,0.25)' }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          {showDashboardCta ? (
            <>
              {t('landing.wisehire.goToDashboard', 'Go to Dashboard')}
              <LayoutDashboard className="w-4 h-4" />
            </>
          ) : (
            <>
              {t('landing.wisehire.joinWaitlist', 'Join the Waitlist')}
              <ArrowRight className="w-4 h-4" style={{ transform: locale === 'ar' ? 'rotate(180deg)' : undefined }} />
            </>
          )}
        </motion.button>
        <motion.button
          onClick={() => document.getElementById('wisehire-demo')?.scrollIntoView({ behavior: 'smooth' })}
          className="wh-cta-secondary h-12 px-8 text-base font-semibold rounded-xl flex items-center gap-2"
          whileHover={prefersReducedMotion ? undefined : { y: -1, scale: 1.02, boxShadow: '0 0 18px 3px rgba(29,78,216,0.22)' }}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          {t('landing.wisehire.seeInAction', 'See it in action')}
          <ChevronDown className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Trust badges — sm+ wraps in a subtle pill-style container with
          dot separators between badges; mobile keeps the existing scroll
          strip via the global .lp-trust-badges rules. The 500+ count
          gets the brand accent color via .wh-trust-count. */}
      <motion.div
        className="relative z-10 mt-6 sm:mt-8 text-xs lp-trust-badges wh-trust-container"
        initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: 0.15 }}
      >
        <span ref={waitlistCount.containerRef} className="flex items-center gap-1.5" style={{ color: 'var(--lp-trust-color)', transition: 'color 0.3s ease' }}>
          <Users className="w-3.5 h-3.5" style={{ color: 'var(--lp-trust-icon)', transition: 'color 0.3s ease' }} />
          <span ref={waitlistCount.countRef} className="wh-trust-count">{waitlistCount.initialText}</span>
          <span className="wh-trust-count">+</span>
          <span>&nbsp;{t('landing.wisehire.onTheWaitlist', 'on the waitlist')}</span>
        </span>
        {[
          t('landing.wisehire.inviteOnly', 'Invite-only access'),
          t('landing.wisehire.freeTrial', '7-day free trial'),
          t('landing.wisehire.noCreditCard', 'No credit card'),
        ].map((item) => (
          <span key={item} className="flex items-center gap-1.5" style={{ color: 'var(--lp-trust-color)', transition: 'color 0.3s ease' }}>
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--lp-trust-icon)', transition: 'color 0.3s ease' }} />
            {item}
          </span>
        ))}
      </motion.div>
    </section>
  );
}
