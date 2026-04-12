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
              borderTop: '1px solid rgba(255,255,255,0.07)',
              background: '#0a0a0f',
              marginTop: 0,
            }
          : undefined
      }
      className={lpMode ? 'relative' : 'relative mt-16 border-t border-border'}
    >
      <div className="py-10 flex flex-col items-center gap-4">
        <img
          src={logo}
          alt="WiseResume"
          className="w-8 h-8 object-contain rounded"
        />

        <div
          className="flex items-center gap-1.5 text-xs"
          style={lpMode ? { color: 'rgba(240,240,245,0.35)' } : undefined}
        >
          <ShieldCheck
            className="w-3.5 h-3.5"
            style={lpMode ? { color: 'rgba(99,102,241,0.7)' } : undefined}
          />
          <span>Your data is encrypted and secure</span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <Link
            to="/privacy-policy"
            className="transition-colors"
            style={
              lpMode
                ? { color: 'rgba(240,240,245,0.35)' }
                : undefined
            }
          >
            Privacy Policy
          </Link>
          <span
            className="w-px h-3"
            style={lpMode ? { background: 'rgba(255,255,255,0.1)' } : undefined}
          />
          <Link
            to="/terms-of-service"
            className="transition-colors"
            style={
              lpMode
                ? { color: 'rgba(240,240,245,0.35)' }
                : undefined
            }
          >
            Terms of Service
          </Link>
        </div>

        <p
          className="text-xs"
          style={lpMode ? { color: 'rgba(240,240,245,0.25)' } : undefined}
        >
          &copy; 2026 WiseResume &mdash; The Wise Cloud.
        </p>
      </div>
    </footer>
  );
}
