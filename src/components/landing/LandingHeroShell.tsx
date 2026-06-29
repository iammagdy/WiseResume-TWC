import { TYPEWRITER_WORDS } from '@/hooks/useTypewriter';
import { TypewriterHeadlineLine } from '@/components/landing/TypewriterHeadlineLine';
import { useLocale } from '@/i18n/LocaleProvider';

interface LandingHeroShellProps {
  mode: 'jobseeker' | 'wisehire';
}

export default function LandingHeroShell({ mode }: LandingHeroShellProps) {
  const { locale, t } = useLocale();
  if (mode === 'wisehire') {
    return (
      <section
        className="lp-hero-top relative flex flex-col items-center text-center px-4 sm:px-6 overflow-hidden"
        style={{ background: 'var(--lp-bg)', paddingBottom: '4rem', minHeight: 'min(640px, 88dvh)' }}
      >
        {/* Match the live hero's layered background so the static shell
            (used as the LCP placeholder before the motion stage hydrates)
            shares the same visual language and there's no flash/swap when
            the lazy WiseHireHero takes over. The eyebrow + headline are
            identical to the live hero so LCP measurement stays anchored
            on the same H1. */}
        <div aria-hidden="true" className="wh-hero-bg" />
        <div aria-hidden="true" className="wh-hero-vignette" />
        <h1
          className="relative z-10 font-extrabold leading-[1.04] max-w-4xl"
          style={{
            fontSize: 'clamp(1.75rem, 8.5vw, 6.5rem)',
            color: 'var(--lp-text)',
            letterSpacing: '-0.04em',
          }}
        >
          <span className="sm:whitespace-nowrap" style={{ display: 'block' }}>
            {t('landing.wiseHireHeroLead')}
          </span>
          <span className="sm:whitespace-nowrap" style={{ display: 'block' }}>
            {t('landing.wiseHireHeroSecond')}
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
            {t('landing.individualHeroLead')}
          </span>
          <TypewriterHeadlineLine word={locale === 'ar' ? t('landing.individualHeroWord') : TYPEWRITER_WORDS[0]} />
        </h1>
      </div>
    </section>
  );
}
