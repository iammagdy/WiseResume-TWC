import { Menu, Search, Shield } from 'lucide-react';
import { getHub2Def, type Hub2Id } from '@/lib/devkit-v2/devKit2HubConfig';

interface DevKit2TopBarProps {
  activeHub: Hub2Id;
  adminEmail: string;
  secondsUntilLock: number | null;
  onOpenMobileMenu: () => void;
  onOpenCommandPalette: () => void;
}

function formatLockTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function DevKit2TopBar({
  activeHub,
  adminEmail,
  secondsUntilLock,
  onOpenMobileMenu,
  onOpenCommandPalette,
}: DevKit2TopBarProps) {
  const hub = getHub2Def(activeHub);
  const HubIcon = hub.icon;

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-card/95 backdrop-blur px-4 lg:px-6">
      {/* Left — hub identity */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-primary">
          <HubIcon size={15} />
          <div className="h-4 w-px bg-border" />
        </div>

        <div>
          <h1 className="text-sm font-semibold text-foreground leading-none">
            {hub.label}
          </h1>
          <p className="mt-0.5 hidden md:block text-[10px] font-mono text-muted-foreground">
            {hub.description}
          </p>
        </div>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Command palette trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 transition-all"
        >
          <Search size={13} />
          <span className="hidden sm:inline">Search hubs…</span>
          <kbd className="hidden md:inline-flex rounded border border-border bg-muted px-1 py-0.5 font-mono text-[9px]">
            ⌘K
          </kbd>
        </button>

        {/* Production badge */}
        <div className="hidden md:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[10px] font-mono font-medium text-emerald-400">
            Production
          </span>
        </div>

        {/* Admin email */}
        {adminEmail && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-2 py-1 text-xs font-mono text-muted-foreground max-w-[140px] md:max-w-none">
            <Shield size={11} className="text-primary shrink-0" />
            <span className="truncate">{adminEmail}</span>
          </div>
        )}

        {/* Session countdown */}
        {secondsUntilLock !== null && (
          <div className="flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-[10px] font-mono text-amber-400">
            <span className="hidden md:inline">Lock&nbsp;</span>
            <span>{formatLockTime(Math.max(0, Math.ceil(secondsUntilLock)))}</span>
          </div>
        )}

        {/* DevKit2 preview badge */}
        <span className="hidden sm:inline-flex items-center rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
          v2 preview
        </span>
      </div>
    </header>
  );
}
