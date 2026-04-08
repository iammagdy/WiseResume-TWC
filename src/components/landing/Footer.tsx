import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useThemeLogo } from '@/hooks/useThemeLogo';

export function Footer() {
  const logo = useThemeLogo();
  return (
    <footer className="relative mt-16 border-t border-border">
      <div className="py-10 flex flex-col items-center gap-4">
        <img
          src={logo}
          alt="WiseResume"
          className="w-8 h-8 object-contain rounded"
        />

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span>Your data is encrypted and secure</span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <Link
            to="/privacy-policy"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
          <span className="w-px h-3 bg-border" />
          <Link
            to="/terms-of-service"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Terms of Service
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          &copy; 2026 WiseResume &mdash; The Wise Cloud.
        </p>
      </div>
    </footer>
  );
}
