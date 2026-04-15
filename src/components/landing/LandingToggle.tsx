import { motion } from 'framer-motion';

interface LandingToggleProps {
  mode: 'jobseeker' | 'wisehire';
  onModeChange: (mode: 'jobseeker' | 'wisehire') => void;
}

export function LandingToggle({ mode, onModeChange }: LandingToggleProps) {
  const handleJobSeeker = () => {
    onModeChange('jobseeker');
    const url = new URL(window.location.href);
    url.searchParams.delete('for');
    window.history.pushState({}, '', url.toString());
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleCompanies = () => {
    onModeChange('wisehire');
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
        }}
      >
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
            transition: 'color 0.25s ease',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          {mode === 'jobseeker' && (
            <motion.div
              layoutId="landing-toggle-indicator"
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 99,
                background: 'linear-gradient(135deg, #b91c1c 0%, #9E1B22 100%)',
                boxShadow: '0 1px 8px rgba(158,27,34,0.45)',
              }}
              transition={{ type: 'spring', stiffness: 480, damping: 38 }}
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
              background: mode === 'jobseeker' ? 'rgba(255,255,255,0.75)' : 'rgba(158,27,34,0.7)',
              flexShrink: 0,
              transition: 'background 0.25s ease',
            }}
          />
          <span style={{ position: 'relative', zIndex: 1 }}>Individuals</span>
        </button>

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
            transition: 'color 0.25s ease',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          {mode === 'wisehire' && (
            <motion.div
              layoutId="landing-toggle-indicator"
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 99,
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                boxShadow: '0 1px 8px rgba(29,78,216,0.45)',
              }}
              transition={{ type: 'spring', stiffness: 480, damping: 38 }}
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
              background: mode === 'wisehire' ? 'rgba(255,255,255,0.75)' : 'rgba(29,78,216,0.7)',
              flexShrink: 0,
              transition: 'background 0.25s ease',
            }}
          />
          <span style={{ position: 'relative', zIndex: 1 }}>Enterprises</span>
        </button>
      </div>
    </div>
  );
}
