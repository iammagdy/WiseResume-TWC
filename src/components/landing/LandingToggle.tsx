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
  };

  const handleCompanies = () => {
    onModeChange('wisehire');
    const url = new URL(window.location.href);
    url.searchParams.set('for', 'companies');
    window.history.pushState({}, '', url.toString());
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 36,
        borderBottom: '1px solid var(--lp-border)',
        gap: 6,
        padding: '0 16px',
        background: 'var(--lp-section-alt)',
        transition: 'background 0.35s ease, border-color 0.35s ease',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: '0.68rem',
          letterSpacing: '0.04em',
          color: 'var(--lp-text-subtle)',
          fontWeight: 500,
          marginRight: 2,
          transition: 'color 0.35s ease',
          whiteSpace: 'nowrap',
        }}
      >
        I'm a:
      </span>

      <button
        onClick={handleJobSeeker}
        style={{
          fontSize: '0.72rem',
          fontWeight: 600,
          padding: '3px 12px',
          borderRadius: 99,
          border: '1px solid',
          transition: 'all 0.25s ease',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          background: mode === 'jobseeker' ? '#9E1B22' : 'transparent',
          color: mode === 'jobseeker' ? '#fff' : 'var(--lp-text-muted)',
          borderColor: mode === 'jobseeker' ? '#9E1B22' : 'var(--lp-border)',
        }}
        aria-pressed={mode === 'jobseeker'}
      >
        For Job Seekers
      </button>

      <button
        onClick={handleCompanies}
        style={{
          fontSize: '0.72rem',
          fontWeight: 600,
          padding: '3px 12px',
          borderRadius: 99,
          border: '1px solid',
          transition: 'all 0.25s ease',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          background: mode === 'wisehire' ? '#1D4ED8' : 'transparent',
          color: mode === 'wisehire' ? '#fff' : 'var(--lp-text-muted)',
          borderColor: mode === 'wisehire' ? '#1D4ED8' : 'var(--lp-border)',
        }}
        aria-pressed={mode === 'wisehire'}
      >
        For Companies
      </button>
    </div>
  );
}
