import { useNavigate } from 'react-router-dom';
import { LogIn, LogOut, Sun, Moon, LayoutDashboard } from 'lucide-react';
import { LandingToggle } from '@/components/landing/LandingToggle';
import type { Profile } from '@/hooks/useProfile';

interface LandingHeaderProps {
  mode: 'jobseeker' | 'wisehire';
  isDark: boolean;
  scrolled: boolean;
  themeLogo: string;
  profile: Profile | null | undefined;
  user: { id: string } | null | undefined;
  isAuthenticated: boolean;
  authLoading: boolean;
  prefersReducedMotion: boolean | null;
  onModeChange: (mode: 'jobseeker' | 'wisehire', origin: { x: number; y: number }) => void;
  onThemeToggle: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onOpenWaitlist: () => void;
  onSignOut: () => void;
}

export function LandingHeader({
  mode,
  isDark,
  scrolled,
  themeLogo,
  isAuthenticated,
  authLoading,
  prefersReducedMotion,
  onModeChange,
  onThemeToggle,
  onSignOut,
}: LandingHeaderProps) {
  const navigate = useNavigate();

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 55,
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        background: scrolled
          ? 'var(--lp-header-bg, rgba(255,255,255,0.85))'
          : 'transparent',
        borderBottom: scrolled ? '1px solid var(--lp-border, rgba(0,0,0,0.07))' : '1px solid transparent',
        transition: 'background 0.25s ease, border-color 0.25s ease, backdrop-filter 0.25s ease',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 1.25rem',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <a href="/" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <img src={themeLogo} alt="WiseResume" style={{ height: 28, width: 'auto' }} />
        </a>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div className="hidden sm:block">
            <LandingToggle
              uid="hdr"
              mode={mode}
              prefersReducedMotion={prefersReducedMotion}
              onModeChange={onModeChange}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <button
            onClick={onThemeToggle}
            aria-label="Toggle theme"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--lp-muted, #666)',
            }}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {!authLoading && (
            isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => navigate('/dashboard')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--lp-border, rgba(0,0,0,0.12))',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'var(--lp-text, #111)',
                  }}
                >
                  <LayoutDashboard size={15} />
                  Dashboard
                </button>
                <button
                  onClick={onSignOut}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: 'var(--lp-muted, #666)',
                  }}
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '6px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--lp-border, rgba(0,0,0,0.12))',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'var(--lp-text, #111)',
                }}
              >
                <LogIn size={15} />
                Sign in
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
