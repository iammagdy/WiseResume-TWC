import { type RefObject } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Zap } from 'lucide-react';
import { LandingToggle } from '@/components/landing/LandingToggle';

interface WiseResumeHeroProps {
  mode: 'jobseeker' | 'wisehire';
  prefersReducedMotion: boolean | null;
  themeLogo: string;
  isAuthenticated: boolean;
  heroRef: RefObject<HTMLElement | null>;
  onModeChange: (mode: 'jobseeker' | 'wisehire', origin: { x: number; y: number }) => void;
  onCTA: (plan?: string) => void;
}

export function WiseResumeHero({
  mode,
  prefersReducedMotion,
  themeLogo,
  isAuthenticated,
  heroRef,
  onModeChange,
  onCTA,
}: WiseResumeHeroProps) {
  return (
    <section
      ref={heroRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '5rem 1.25rem 4rem',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <div className="sm:hidden flex justify-center mb-6">
          <LandingToggle
            uid="hero-mob"
            mode={mode}
            prefersReducedMotion={prefersReducedMotion}
            onModeChange={onModeChange}
            compact
          />
        </div>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '4px 12px',
                borderRadius: '100px',
                fontSize: '0.78rem',
                fontWeight: 600,
                background: 'rgba(185,28,28,0.1)',
                color: '#b91c1c',
                border: '1px solid rgba(185,28,28,0.18)',
              }}
            >
              <Zap size={12} />
              AI-Powered Career Platform
            </span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              marginBottom: '1.25rem',
              color: 'var(--lp-text, #111)',
            }}
          >
            Build your career with{' '}
            <span style={{ color: '#b91c1c' }}>AI that actually works</span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
              color: 'var(--lp-muted, #555)',
              maxWidth: 560,
              margin: '0 auto 2rem',
              lineHeight: 1.65,
            }}
          >
            ATS-optimized resumes, AI interview coaching, portfolio websites, and job tracking — all in one platform.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {isAuthenticated ? (
              <a
                href="/dashboard"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.75rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #b91c1c 0%, #9E1B22 100%)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                  boxShadow: '0 2px 12px rgba(185,28,28,0.35)',
                }}
              >
                Go to Dashboard <ArrowRight size={16} />
              </a>
            ) : (
              <>
                <button
                  onClick={() => onCTA()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.75rem',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #b91c1c 0%, #9E1B22 100%)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 12px rgba(185,28,28,0.35)',
                  }}
                >
                  Get Started Free <ArrowRight size={16} />
                </button>
                <a
                  href="/examples"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '10px',
                    border: '1px solid var(--lp-border, rgba(0,0,0,0.12))',
                    color: 'var(--lp-text, #111)',
                    fontWeight: 500,
                    fontSize: '0.95rem',
                    textDecoration: 'none',
                    background: 'none',
                  }}
                >
                  See Examples
                </a>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
