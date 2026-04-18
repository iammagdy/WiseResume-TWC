import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useThemeLogo } from '@/hooks/useThemeLogo';

interface FooterProps {
  lpMode?: boolean;
  product?: 'wisehire';
}

export function Footer({ lpMode, product }: FooterProps) {
  const logo = useThemeLogo();
  const isWiseHire = product === 'wisehire';
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
        <img
          src={logo}
          alt={isWiseHire ? 'WiseHire' : 'WiseResume'}
          className="w-8 h-8 object-contain rounded"
          style={isWiseHire ? { filter: 'hue-rotate(220deg) saturate(2) brightness(0.85)' } : undefined}
        />

        <div
          className="flex items-center gap-1.5 text-xs"
          style={lpMode ? { color: 'var(--lp-text-muted)', transition: 'color 0.3s ease' } : undefined}
        >
          <ShieldCheck
            className="w-3.5 h-3.5"
            style={
              lpMode
                ? { color: isWiseHire ? 'rgba(29,78,216,0.65)' : 'rgba(158,27,34,0.65)' }
                : undefined
            }
          />
          <span>Your data is encrypted and secure</span>
        </div>

        <div className="flex items-center gap-1 text-xs">
          <Link
            to="/privacy-policy"
            className="transition-colors"
            style={lpMode
              ? { color: 'var(--lp-text-muted)', padding: '10px 12px', display: 'inline-flex', alignItems: 'center', minHeight: 44, textDecoration: 'underline', textDecorationColor: 'var(--lp-border)', textUnderlineOffset: 3 }
              : { padding: '10px 12px', display: 'inline-flex', alignItems: 'center', minHeight: 44 }
            }
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
            style={lpMode
              ? { color: 'var(--lp-text-muted)', padding: '10px 12px', display: 'inline-flex', alignItems: 'center', minHeight: 44, textDecoration: 'underline', textDecorationColor: 'var(--lp-border)', textUnderlineOffset: 3 }
              : { padding: '10px 12px', display: 'inline-flex', alignItems: 'center', minHeight: 44 }
            }
          >
            Terms of Service
          </Link>
        </div>

        <p
          className="text-xs"
          style={lpMode ? { color: 'var(--lp-text-muted)', transition: 'color 0.3s ease' } : undefined}
        >
          {isWiseHire
            ? <>&copy; 2026 WiseHire &mdash; The Wise Cloud.</>
            : <>&copy; 2026 WiseResume &mdash; The Wise Cloud.</>
          }
        </p>
      </div>
    </footer>
  );
}
