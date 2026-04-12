import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useThemeLogo } from '@/hooks/useThemeLogo';

interface FooterProps {
  lpMode?: boolean;
}

export function Footer({ lpMode }: FooterProps) {
  const logo = useThemeLogo();
  return (
    <footer
      style={
        lpMode
          ? {
              borderTop: '1px solid var(--lp-border)',
              background: 'var(--lp-section-alt)',
              marginTop: 0,
              transition: 'background 0.3s ease, border-color 0.3s ease',
            }
          : undefined
      }
      className={lpMode ? 'relative' : 'relative mt-16 border-t border-border'}
    >
      <div className="py-10 flex flex-col items-center gap-4">
        <img src={logo} alt="WiseResume" className="w-8 h-8 object-contain rounded" />

        <div
          className="flex items-center gap-1.5 text-xs"
          style={lpMode ? { color: 'var(--lp-text-subtle)', transition: 'color 0.3s ease' } : undefined}
        >
          <ShieldCheck
            className="w-3.5 h-3.5"
            style={lpMode ? { color: 'rgba(99,102,241,0.65)' } : undefined}
          />
          <span>Your data is encrypted and secure</span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <Link
            to="/privacy-policy"
            className="transition-colors"
            style={lpMode ? { color: 'var(--lp-text-subtle)' } : undefined}
          >
            Privacy Policy
          </Link>
          <span
            className="w-px h-3"
            style={lpMode ? { background: 'var(--lp-border)' } : undefined}
          />
          <Link
            to="/terms-of-service"
            className="transition-colors"
            style={lpMode ? { color: 'var(--lp-text-subtle)' } : undefined}
          >
            Terms of Service
          </Link>
        </div>

        <p
          className="text-xs"
          style={lpMode ? { color: 'var(--lp-text-subtle)', transition: 'color 0.3s ease' } : undefined}
        >
          &copy; 2026 WiseResume &mdash; The Wise Cloud.
        </p>
      </div>
    </footer>
  );
}
