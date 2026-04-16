import { useState } from 'react';
import { motion } from 'framer-motion';

interface LandingToggleProps {
  mode: 'jobseeker' | 'wisehire';
  onModeChange: (mode: 'jobseeker' | 'wisehire', origin: { x: number; y: number }) => void;
  prefersReducedMotion: boolean | null;
}

const RED_BG = 'linear-gradient(135deg, #b91c1c 0%, #9E1B22 100%)';
const BLUE_BG = 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)';
const RED_SHADOW = '0 1px 8px rgba(158,27,34,0.55), 0 0 18px rgba(158,27,34,0.2)';
const BLUE_SHADOW = '0 1px 8px rgba(29,78,216,0.55), 0 0 18px rgba(29,78,216,0.2)';

export function LandingToggle({ mode, onModeChange, prefersReducedMotion }: LandingToggleProps) {
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
    const url = new URL(window.location.href);
    url.searchParams.delete('for');
    window.history.pushState({}, '', url.toString());
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleCompanies = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (mode !== 'wisehire') fireBurst('wisehire');
    const rect = e.currentTarget.getBoundingClientRect();
    const origin = { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
    onModeChange('wisehire', origin);
    const url = new URL(window.location.href);
    url.searchParams.set('for', 'companies');
    window.history.pushState({}, '', url.toString());
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 42,
        padding: '0 16px',
        background: 'transparent',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          background: 'var(--lp-toggle-bg)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid var(--lp-toggle-border)',
          borderRadius: 99,
          padding: 3,
          gap: 2,
          boxShadow: '0 2px 14px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
          transition: 'border-color 0.35s ease, background 0.35s ease',
          overflow: 'hidden',
        }}
      >
        {/* Ignition burst — radiates from the clicked button on each mode switch */}
        {!prefersReducedMotion && burstKey > 0 && (
          <motion.div
            key={burstKey}
            layoutId="lp-toggle-burst"
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
              translateX: '-50%',
              translateY: '-50%',
            }}
            initial={{ scale: 1, opacity: 0 }}
            animate={{ scale: 2.5, opacity: [0, 0.4, 0] }}
            transition={{ duration: 0.5, times: [0, 0.25, 1], ease: [0.16, 1, 0.3, 1] }}
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
            borderRadius: 99,
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            background: 'transparent',
            color: mode === 'jobseeker' ? '#fff' : 'var(--lp-toggle-color)',
            transition: 'color 0.35s ease',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          {mode === 'jobseeker' && (
            <motion.div
              layoutId="landing-toggle-indicator"
              animate={{ background: RED_BG, boxShadow: RED_SHADOW }}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 99,
              }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          )}
          <span
            aria-hidden="true"
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'inline-block',
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: mode === 'jobseeker' ? 'rgba(255,255,255,0.85)' : 'rgba(158,27,34,0.7)',
              flexShrink: 0,
              transition: 'background 0.35s ease',
            }}
          />
          <span style={{ position: 'relative', zIndex: 1 }}>Individuals</span>
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
            borderRadius: 99,
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            background: 'transparent',
            color: mode === 'wisehire' ? '#fff' : 'var(--lp-toggle-color)',
            transition: 'color 0.35s ease',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          {mode === 'wisehire' && (
            <motion.div
              layoutId="landing-toggle-indicator"
              animate={{ background: BLUE_BG, boxShadow: BLUE_SHADOW }}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 99,
              }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          )}
          <span
            aria-hidden="true"
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'inline-block',
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: mode === 'wisehire' ? 'rgba(255,255,255,0.85)' : 'rgba(29,78,216,0.7)',
              flexShrink: 0,
              transition: 'background 0.35s ease',
            }}
          />
          <span style={{ position: 'relative', zIndex: 1 }}>Enterprises</span>
        </button>
      </div>
    </div>
  );
}
