import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

const WH_TYPEWRITER_WORDS = [
  'Hiring Manager',
  'Recruiter',
  'HR Director',
  'Head of People',
  'Talent Partner',
];

function useWHTypewriter(words: string[]) {
  const [displayed, setDisplayed] = useState('');
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'erasing'>('typing');

  useEffect(() => {
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
  }, [phase, charIdx, wordIdx, words]);

  return displayed;
}

interface WiseHireHeroProps {
  onOpenWaitlist: () => void;
}

export function WiseHireHero({ onOpenWaitlist }: WiseHireHeroProps) {
  const typewriterWord = useWHTypewriter(WH_TYPEWRITER_WORDS);
  const [ctaPulse, setCtaPulse] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setCtaPulse(true), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      className="relative flex flex-col items-center text-center px-4 sm:px-6 overflow-hidden"
      style={{
        background: 'var(--lp-bg)',
        paddingTop: 'calc(7.75rem + env(safe-area-inset-top))',
        paddingBottom: '4.5rem',
        transition: 'background 0.35s ease',
      }}
    >
      <style>{`
        @keyframes wh-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(29,78,216,0); }
          50% { box-shadow: 0 0 0 10px rgba(29,78,216,0.14); }
        }
        .wh-cta-pulse { animation: wh-pulse 2.8s ease-in-out infinite; }

        .wh-gradient-text {
          background: linear-gradient(135deg, #60A5FA 0%, #3B82F6 40%, #1D4ED8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .lp-root[data-lp-scheme="light"] .wh-gradient-text {
          background: linear-gradient(135deg, #1D4ED8 0%, #2563EB 50%, #3B82F6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .wh-cursor {
          display: inline-block;
          width: 3px;
          height: 0.85em;
          background: #3B82F6;
          margin-left: 2px;
          vertical-align: middle;
          border-radius: 1px;
          animation: lp-blink 1s step-end infinite;
        }
        @keyframes lp-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @media (prefers-reduced-motion: reduce) {
          .wh-cta-pulse { animation: none; }
        }
      `}</style>

      {/* Blue radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 55% at 50% 0%, var(--lp-hero-glow) 0%, transparent 65%)',
          transition: 'background 0.35s ease',
        }}
      />

      {/* WiseHire brand pill */}
      <div
        className="relative z-10 flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 lp-hero-sub"
        style={{
          background: 'var(--lp-brand-pill-bg)',
          border: '1px solid var(--lp-brand-pill-border)',
          boxShadow: '0 0 18px 0 var(--lp-brand-pill-glow)',
          transition: 'background 0.35s ease, border-color 0.35s ease',
        }}
      >
        <span style={{ fontSize: '0.75rem', marginRight: '-2px' }}>🏢</span>
        <span
          className="font-display font-semibold tracking-tight"
          style={{ fontSize: '0.85rem', color: 'var(--lp-eyebrow)', transition: 'color 0.35s ease' }}
        >
          WiseHire — Now in early access
        </span>
      </div>

      {/* Eyebrow */}
      <p
        className="relative z-10 mb-7 lp-hero-sub"
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
          fontSize: 'clamp(2rem, 8.5vw, 6.5rem)',
          color: 'var(--lp-text)',
          letterSpacing: '-0.035em',
          transition: 'color 0.35s ease',
        }}
      >
        <span style={{ display: 'block', whiteSpace: 'nowrap' }}>Hire Smarter.</span>
        <span style={{ display: 'block', whiteSpace: 'nowrap' }}>Screen Faster.</span>
      </h1>

      {/* Typewriter subtitle */}
      <p
        className="relative z-10 mt-5 lp-hero-sub"
        style={{
          fontSize: 'clamp(1rem, 2.4vw, 1.35rem)',
          color: 'var(--lp-text-muted)',
          letterSpacing: '-0.01em',
          transition: 'color 0.35s ease',
        }}
      >
        Built for the{' '}
        <span className="wh-gradient-text" style={{ display: 'inline-block', minWidth: '2ch', fontWeight: 700 }}>
          {typewriterWord || '\u00A0'}
          <span className="wh-cursor" aria-hidden="true" />
        </span>
      </p>

      {/* Subheading */}
      <p
        className="relative z-10 mt-4 mb-10 lp-hero-sub"
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
      <div className="relative z-10 lp-hero-cta flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={onOpenWaitlist}
          className={`h-12 px-8 text-base font-semibold rounded-xl flex items-center gap-2 transition-all ${ctaPulse ? 'wh-cta-pulse' : ''}`}
          style={{ background: '#1D4ED8', color: '#fff' }}
        >
          Join the Waitlist
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Trust badges */}
      <div className="relative z-10 mt-8 flex items-center gap-5 sm:gap-7 text-xs flex-wrap justify-center lp-hero-trust">
        {['Invite-only access', '7-day free trial', 'No credit card'].map((item) => (
          <span key={item} className="flex items-center gap-1.5" style={{ color: 'var(--lp-trust-color)', transition: 'color 0.3s ease' }}>
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--lp-trust-icon)', transition: 'color 0.3s ease' }} />
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
