import { Sparkles } from 'lucide-react';
import wiseAiLogo from '@/assets/wise-ai-logo.png';

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
          className="w-8 h-8 object-contain"
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
        <p className="text-[11px] text-muted-foreground/50">
          © 2026 WiseResume
        </p>
      </div>
    </footer>
  );
}
