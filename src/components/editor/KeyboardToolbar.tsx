import { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { haptics } from '@/lib/haptics';

export function KeyboardToolbar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setVisible(document.documentElement.classList.contains('keyboard-open'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;

  const getFocusables = () =>
    Array.from(
      document.querySelectorAll<HTMLElement>(
        '.editor-scroll-container input, .editor-scroll-container textarea'
      )
    );

  const moveFocus = (direction: -1 | 1) => {
    haptics.light();
    const focusables = getFocusables();
    const idx = focusables.indexOf(document.activeElement as HTMLElement);
    const next = focusables[idx + direction];
    if (next) {
      next.focus();
      setTimeout(() => next.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }
  };

  const handleDone = () => {
    haptics.light();
    (document.activeElement as HTMLElement)?.blur?.();
  };

  return (
    <div
      className="fixed left-0 right-0 z-[60] flex items-center justify-between px-3 h-11 glass-surface border-t border-border/30"
      style={{ bottom: 'var(--keyboard-height, 0px)' }}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => moveFocus(-1)}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground active:scale-95 transition-all touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Previous field"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => moveFocus(1)}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground active:scale-95 transition-all touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Next field"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
      <button
        type="button"
        onClick={handleDone}
        className="px-4 py-2 text-sm font-semibold text-primary hover:text-primary/80 active:scale-95 transition-all touch-manipulation min-h-[44px] flex items-center justify-center"
      >
        Done
      </button>
    </div>
  );
}
