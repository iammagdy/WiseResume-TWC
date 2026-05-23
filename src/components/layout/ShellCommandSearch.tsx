import { Search } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface ShellCommandSearchProps {
  className?: string;
  /** Icon-only trigger for narrow mobile top bar */
  compact?: boolean;
}

export function ShellCommandSearch({ className, compact = false }: ShellCommandSearchProps) {
  const openPalette = () => {
    haptics.selection();
    window.dispatchEvent(new Event('open-command-palette'));
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={openPalette}
        className={cn(
          'flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl',
          'border border-border/80 bg-card/70 text-muted-foreground',
          'hover:text-foreground hover:border-primary/25 hover:bg-card transition-colors active:scale-95',
          className,
        )}
        aria-label="Search commands and tools"
      >
        <Search className="w-4 h-4" aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openPalette}
      className={cn(
        'app-shell-command-search group flex items-center gap-3 w-full h-10 lg:h-11 text-left',
        'touch-manipulation active:scale-[0.99] transition-all',
        className,
      )}
      aria-label="Search commands, resumes, and tools"
    >
      <Search
        className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors"
        aria-hidden
      />
      <span className="flex-1 min-w-0 truncate text-sm text-muted-foreground group-hover:text-foreground transition-colors">
        Search commands, resumes, tools…
      </span>
      <kbd className="hidden md:inline-flex items-center gap-0.5 rounded-lg border border-border/80 bg-muted/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground shrink-0">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}
