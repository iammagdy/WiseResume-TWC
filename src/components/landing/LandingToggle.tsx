import { useState } from 'react';
import { useLocale } from '@/i18n/LocaleProvider';

interface LandingToggleProps {
  mode: 'jobseeker' | 'wisehire';
  onModeChange: (mode: 'jobseeker' | 'wisehire', origin: { x: number; y: number }) => void;
  prefersReducedMotion: boolean | null;
  uid?: string;
  compact?: boolean;
}

// Step 5 (U-5): toned-down active states so the toggle reads as a
// secondary segmented control, not as a primary CTA. The Sign In
// button keeps the strong filled-red treatment as the dominant action.
//
// Step 4 (B-3, post-review): rewritten to use CSS transitions / CSS
// keyframes only — no framer-motion import. This component is mounted
// inside the always-eager landing header, so any framer-motion import
// here would force the framer runtime into the entry chunk.

const RED_BG = 'rgba(158,27,34,0.14)';
const BLUE_BG = 'rgba(29,78,216,0.14)';
const RED_SHADOW = 'inset 0 0 0 1px rgba(158,27,34,0.55)';
const BLUE_SHADOW = 'inset 0 0 0 1px rgba(29,78,216,0.55)';

export function LandingToggle({ mode, onModeChange, prefersReducedMotion, uid: _uid = '', compact = false }: LandingToggleProps) {
  const { locale, t } = useLocale();
  const [burstKey, setBurstKey] = useState(0);
  const [burstLeft, setBurstLeft] = useState('25%');
  const [burstColor, setBurstColor] = useState('rgba(158,27,34,0.65)');

  const fireBurst = (targetMode: 'jobseeker' | 'wisehire') => {
    if (prefersReducedMotion) return;
    setBurstLeft(targetMode === 'jobseeker' ? '25%' : '75%');
    setBurstColor(targetMode === 'jobseeker' ? 'rgba(158,27,34,0.65)' : 'rgba(29,78,216,0.65)');
    setBurstKey((k) => k + 1);
  };

  const handleJobSeeker = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (mode !== 'jobseeker') fireBurst('jobseeker');
    const rect = e.currentTarget.getBoundingClientRect();
    const origin = { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
    onModeChange('jobseeker', origin);
    window.history.pushState({}, '', locale === 'ar' ? '/ar' : '/');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleCompanies = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (mode !== 'wisehire') fireBurst('wisehire');
    const rect = e.currentTarget.getBoundingClientRect();
    const origin = { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
    onModeChange('wisehire', origin);
    window.history.pushState({}, '', locale === 'ar' ? '/ar/enterprises' : '/enterprises');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const inner = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        background: 'var(--lp-toggle-bg)',
        border: '1px solid var(--lp-toggle-border)',
        borderRadius: 99,
        padding: 3,
        gap: 2,
        boxShadow: '0 2px 14px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
        transition: 'border-color 0.35s ease, background 0.35s ease',
        overflow: 'hidden',
      }}
    >
      {/* Ignition burst — CSS keyframe defined in index-landing.css, re-keyed to retrigger. */}
      {!prefersReducedMotion && burstKey > 0 && (
        <div
          key={burstKey}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: burstLeft,
            top: '50%',
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${burstColor} 0%, transparent 70%)`,
            pointerEvents: 'none',
            zIndex: 20,
            animation: 'lp-toggle-burst 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        />
      )}

      {/* Individuals button */}
      <button
        onClick={handleJobSeeker}
        aria-pressed={mode === 'jobseeker'}
        style={{
          position: 'relative',
          fontSize: '0.72rem',
          fontWeight: 600,
          padding: '4px 14px',
          minHeight: 44,
          borderRadius: 99,
          border: 'none',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          background: 'transparent',
          color: mode === 'jobseeker' ? 'var(--lp-text)' : 'var(--lp-toggle-color)',
          transition: 'color 0.35s ease',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 99,
            background: mode === 'jobseeker' ? RED_BG : 'transparent',
            boxShadow: mode === 'jobseeker' ? RED_SHADOW : 'none',
            transition: 'background 0.35s ease, box-shadow 0.35s ease',
            pointerEvents: 'none',
          }}
        />
        <span
          aria-hidden="true"
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'inline-block',
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: mode === 'jobseeker' ? 'rgba(158,27,34,0.95)' : 'rgba(158,27,34,0.7)',
            flexShrink: 0,
            transition: 'background 0.35s ease',
          }}
        />
        <span style={{ position: 'relative', zIndex: 1 }}>{t('landing.individuals')}</span>
      </button>

      {/* Enterprises button */}
      <button
        onClick={handleCompanies}
        aria-pressed={mode === 'wisehire'}
        style={{
          position: 'relative',
          fontSize: '0.72rem',
          fontWeight: 600,
          padding: '4px 14px',
          minHeight: 44,
          borderRadius: 99,
          border: 'none',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          background: 'transparent',
          color: mode === 'wisehire' ? 'var(--lp-text)' : 'var(--lp-toggle-color)',
          transition: 'color 0.35s ease',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 99,
            background: mode === 'wisehire' ? BLUE_BG : 'transparent',
            boxShadow: mode === 'wisehire' ? BLUE_SHADOW : 'none',
            transition: 'background 0.35s ease, box-shadow 0.35s ease',
            pointerEvents: 'none',
          }}
        />
        <span
          aria-hidden="true"
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'inline-block',
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: mode === 'wisehire' ? 'rgba(29,78,216,0.95)' : 'rgba(29,78,216,0.7)',
            flexShrink: 0,
            transition: 'background 0.35s ease',
          }}
        />
        <span style={{ position: 'relative', zIndex: 1 }}>{t('landing.enterprises')}</span>
      </button>
    </div>
  );

  if (compact) {
    return (
      <div
        role="group"
        aria-label={t('common.productSwitcher')}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}
      >
        {inner}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={t('common.productSwitcher')}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'auto',
        minHeight: 44,
        padding: '0 16px',
        background: 'transparent',
        flexShrink: 0,
      }}
    >
      {inner}
    </div>
  );
}
