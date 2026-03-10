import { Sparkles, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import wiseAiLogo from '@/assets/wise-ai-logo.webp';

export function Footer() {
  return (
    <footer className="relative mt-10">
      <div
        className="h-px w-full"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.5) 30%, hsl(var(--accent) / 0.5) 70%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      <div className="py-8 flex flex-col items-center gap-3">
        <img
          src={wiseAiLogo}
          alt="WiseResume"
          className="w-8 h-8 object-contain rounded-lg"
        />
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Sparkles className="w-3 h-3 text-primary" />
          <span>
            Built with{' '}
            <span className="text-primary font-medium" style={{ textShadow: '0 0 8px hsl(var(--primary) / 0.4)' }}>
              AI
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
          <ShieldCheck className="w-3 h-3 text-primary/60" />
          <span>Your data is encrypted and secure</span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <Link to="/privacy-policy" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            Privacy Policy
          </Link>
          <span className="w-px h-3 bg-border/30" />
          <Link to="/terms-of-service" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            Terms of Service
          </Link>
        </div>

        <p className="text-[11px] text-muted-foreground/50">
          © 2026 WiseResume
        </p>
      </div>
    </footer>
  );
}
