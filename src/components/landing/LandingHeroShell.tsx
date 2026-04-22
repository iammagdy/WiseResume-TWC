import { TYPEWRITER_WORDS } from '@/hooks/useTypewriter';

interface LandingHeroShellProps {
  mode: 'jobseeker' | 'wisehire';
}

const longestTypewriterWord = TYPEWRITER_WORDS.reduce(
  (a, b) => (a.length >= b.length ? a : b),
  ''
);

export default function LandingHeroShell({ mode }: LandingHeroShellProps) {
  if (mode === 'wisehire') {
    return (
      <section
        className="lp-hero-top relative flex flex-col items-center text-center px-4 sm:px-6 overflow-hidden"
        style={{ background: 'var(--lp-bg)', paddingBottom: '4rem', minHeight: 640 }}
      >
        {/* Match the live hero's layered background so the static shell
            (used as the LCP placeholder before the motion stage hydrates)
            shares the same visual language and there's no flash/swap when
            the lazy WiseHireHero takes over. The eyebrow + headline are
            identical to the live hero so LCP measurement stays anchored
            on the same H1. */}
        <div aria-hidden="true" className="wh-hero-bg" />
        <div aria-hidden="true" className="wh-hero-vignette" />
        <p
          className="wh-eyebrow-row relative z-10 mb-4 sm:mb-7"
          style={{
            fontSize: '0.8rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          AI-Powered HR Platform
        </p>
        <h1
          className="relative z-10 font-extrabold leading-[1.04] max-w-4xl"
          style={{
            fontSize: 'clamp(1.75rem, 8.5vw, 6.5rem)',
            color: 'var(--lp-text)',
            letterSpacing: '-0.04em',
          }}
        >
          <span className="sm:whitespace-nowrap" style={{ display: 'block' }}>
            Hire <span className="wh-headline-accent">Smarter.</span>
          </span>
          <span className="sm:whitespace-nowrap" style={{ display: 'block' }}>
            Screen <span className="wh-headline-accent">Faster.</span>
          </span>
        </h1>
      </section>
    );
  }

  return (
    <section
      className="lp-hero-top relative flex flex-col items-center text-center px-4 sm:px-6 overflow-hidden"
      style={{ background: 'var(--lp-bg)', paddingBottom: '4rem', minHeight: 640 }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 50% 0%, var(--lp-hero-glow) 0%, transparent 65%)',
        }}
      />
      <div className="relative z-10 flex flex-col items-center text-center w-full">
        <p
          className="mb-4 sm:mb-7"
          style={{
            fontSize: '0.8rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--lp-eyebrow)',
            fontWeight: 600,
          }}
        >
          AI-Powered Career Platform
        </p>
        <h1
          className="font-extrabold leading-[1.05]"
          style={{
            fontSize: 'clamp(1.9rem, 9vw, 5.5rem)',
            color: 'var(--lp-text)',
            letterSpacing: '-0.035em',
            overflow: 'visible',
            width: '100%',
            maxWidth: '100vw',
          }}
        >
          <span className="sm:whitespace-nowrap" style={{ display: 'block' }}>
            Stand out as a
          </span>
          <span
            className="lp-typewriter-line"
            style={{ display: 'inline-block', position: 'relative' }}
          >
            <span
              aria-hidden="true"
              style={{ visibility: 'hidden', display: 'block', whiteSpace: 'nowrap' }}
            >
              {longestTypewriterWord}
            </span>
            <span
              className="lp-gradient-text"
              style={{
                display: 'block',
                position: 'absolute',
                inset: 0,
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              {TYPEWRITER_WORDS[0]}
            </span>
          </span>
        </h1>
      </div>
    </section>
  );
}
