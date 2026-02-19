import { Linkedin, Github, Sparkles } from 'lucide-react';
import wiseAiLogo from '@/assets/wise-ai-logo.png';

export function Footer() {
  return (
    <footer className="relative mt-10">
      {/* Gradient divider */}
      <div
        className="h-px w-full"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.5) 30%, hsl(var(--accent) / 0.5) 70%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      <div className="bg-card/40 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex flex-col items-center gap-6">
            {/* Brand + tagline */}
            <div className="relative flex flex-col items-center gap-2">
              {/* Faint glow behind logo */}
              <div
                className="absolute -top-4 w-24 h-24 rounded-full opacity-20 blur-2xl pointer-events-none"
                style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }}
                aria-hidden="true"
              />
              <img
                src={wiseAiLogo}
                alt="WiseResume"
                className="relative z-10 w-10 h-10 object-contain"
              />
              <span className="font-display font-bold text-foreground text-sm tracking-wide">
                WiseResume
              </span>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Sparkles className="w-3 h-3 text-primary" />
                <span>
                  Built with{' '}
                  <span className="text-primary font-medium" style={{ textShadow: '0 0 8px hsl(var(--primary) / 0.4)' }}>
                    AI
                  </span>
                </span>
              </div>
            </div>

            {/* Links */}
            <div className="flex items-center gap-5 text-xs text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <span className="w-px h-3 bg-border/40" aria-hidden="true" />
              <a href="#" className="hover:text-foreground transition-colors">
                Terms of Service
              </a>
              <span className="w-px h-3 bg-border/40" aria-hidden="true" />
              <a href="#" className="hover:text-foreground transition-colors">
                Contact
              </a>
            </div>

            {/* Social icons */}
            <div className="flex items-center gap-3">
              <a
                href="#"
                aria-label="X / Twitter"
                className="w-9 h-9 rounded-full border border-border/30 bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/10 transition-all active:scale-95"
              >
                <span className="text-xs font-bold leading-none">𝕏</span>
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="w-9 h-9 rounded-full border border-border/30 bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/10 transition-all active:scale-95"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="#"
                aria-label="GitHub"
                className="w-9 h-9 rounded-full border border-border/30 bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/10 transition-all active:scale-95"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

          <p className="text-center text-[11px] text-muted-foreground/60 mt-8">
            © 2026 WiseResume. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
