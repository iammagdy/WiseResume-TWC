import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { ArrowRight, CheckCircle2, ChevronDown, Users } from 'lucide-react';

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

const WH_TYPEWRITER_WORDS = [
  'Hiring Manager',
  'Recruiter',
  'HR Director',
  'Head of People',
  'Talent Partner',
];

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
  onOpenWaitlist: () => void;
  mobileToggle?: ReactNode;
}

export function WiseHireHero({ onOpenWaitlist, mobileToggle }: WiseHireHeroProps) {
  const prefersReducedMotion = useReducedMotion();
  const typewriterWord = useWHTypewriter(WH_TYPEWRITER_WORDS, prefersReducedMotion);
  const waitlistCount = useCountUp(500, prefersReducedMotion);

  return (
    <section
      className="lp-hero-top relative flex flex-col items-center text-center px-4 sm:px-6 overflow-hidden"
      style={{
        background: 'var(--lp-bg)',
        paddingBottom: '4.5rem',
        transition: 'background 0.35s ease',
      }}
    >
      {/* Blue radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 55% at 50% 0%, var(--lp-hero-glow) 0%, transparent 65%)',
          transition: 'background 0.35s ease',
        }}
      />

      {/* Mobile product toggle slot — rendered here so it sits inside the hero padding area */}
      {mobileToggle}

      {/* WiseHire brand pill */}
      <div
        className="relative z-10 flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 sm:mb-6"
        style={{
          background: 'var(--lp-brand-pill-bg)',
          border: '1px solid var(--lp-brand-pill-border)',
          boxShadow: '0 0 18px 0 var(--lp-brand-pill-glow)',
          transition: 'background 0.35s ease, border-color 0.35s ease',
        }}
      >
        <span
          className="font-display font-semibold tracking-tight"
          style={{ fontSize: '0.85rem', color: 'var(--lp-eyebrow)', transition: 'color 0.35s ease' }}
        >
          Now in early access
        </span>
      </div>

      {/* Eyebrow */}
      <p
        className="relative z-10 mb-4 sm:mb-7"
        style={{
          fontSize: '0.8rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--lp-eyebrow)',
          fontWeight: 600,
          transition: 'color 0.35s ease',
        }}
      >
        AI-Powered HR Platform
      </p>

      {/* Headline */}
      <h1
        className="relative z-10 font-extrabold leading-[1.05] max-w-4xl"
        style={{
          fontSize: 'clamp(1.75rem, 8.5vw, 6.5rem)',
          color: 'var(--lp-text)',
          letterSpacing: '-0.035em',
          transition: 'color 0.35s ease',
        }}
      >
        <span className="sm:whitespace-nowrap" style={{ display: 'block' }}>Hire Smarter.</span>
        <span className="sm:whitespace-nowrap" style={{ display: 'block' }}>Screen Faster.</span>
      </h1>

      {/* Typewriter subtitle */}
      <p
        className="relative z-10 mt-4 sm:mt-5 wh-typewriter-line"
        style={{
          fontSize: 'clamp(1rem, 2.4vw, 1.35rem)',
          color: 'var(--lp-text-muted)',
          letterSpacing: '-0.01em',
          transition: 'color 0.35s ease',
        }}
      >
        Built for the{' '}
        <span className="wh-gradient-text" style={{ display: 'inline-block', fontWeight: 700 }}>
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
        AI that screens candidates, writes job descriptions, and surfaces your best hires — in minutes, not hours.
      </p>

      {/* CTAs */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3">
        <motion.button
          onClick={onOpenWaitlist}
          className="h-12 px-8 text-base font-semibold rounded-xl flex items-center gap-2"
          style={{ background: '#1D4ED8', color: '#fff' }}
          whileHover={prefersReducedMotion ? undefined : { scale: 1.04 }}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          Join the Waitlist
          <ArrowRight className="w-4 h-4" />
        </motion.button>
        <motion.button
          onClick={() => document.getElementById('wisehire-demo')?.scrollIntoView({ behavior: 'smooth' })}
          className="h-12 px-8 text-base font-semibold rounded-xl flex items-center gap-2"
          style={{
            background: 'transparent',
            color: 'var(--lp-eyebrow)',
            border: '1.5px solid rgba(29,78,216,0.35)',
          }}
          whileHover={prefersReducedMotion ? undefined : { scale: 1.04 }}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          See it in action
          <ChevronDown className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Trust badges — horizontal scroll strip on mobile, wrap on sm+ */}
      <motion.div
        className="relative z-10 mt-6 sm:mt-8 text-xs lp-trust-badges"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
        whileInView={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      >
        <span ref={waitlistCount.containerRef} className="flex items-center gap-1.5" style={{ color: 'var(--lp-trust-color)', transition: 'color 0.3s ease' }}>
          <Users className="w-3.5 h-3.5" style={{ color: 'var(--lp-trust-icon)', transition: 'color 0.3s ease' }} />
          <span ref={waitlistCount.countRef}>{waitlistCount.initialText}</span>+ on the waitlist
        </span>
        {['Invite-only access', '7-day free trial', 'No credit card'].map((item) => (
          <span key={item} className="flex items-center gap-1.5" style={{ color: 'var(--lp-trust-color)', transition: 'color 0.3s ease' }}>
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--lp-trust-icon)', transition: 'color 0.3s ease' }} />
            {item}
          </span>
        ))}
      </motion.div>
    </section>
  );
}
