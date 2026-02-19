import { Globe } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border/30 bg-card/30 backdrop-blur-sm mt-10">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm text-foreground">WiseResume</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>

          {/* Social placeholder icons */}
          <div className="flex items-center gap-3">
            {['X', 'Li', 'Gh'].map((label) => (
              <a
                key={label}
                href="#"
                className="w-8 h-8 rounded-full bg-muted/50 border border-border/30 flex items-center justify-center text-xs text-muted-foreground hover:text-foreground hover:border-border transition-all"
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          © 2025 WiseResume. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
