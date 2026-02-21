import { useEffect, useState, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { haptics } from '@/lib/haptics';

/** Context-aware action words for experience/summary sections */
const ACTION_WORDS: Record<string, string[]> = {
  experience: ['Managed', 'Led', 'Developed', 'Implemented', 'Achieved', 'Increased'],
  summary: ['Experienced', 'Skilled', 'Proficient', 'Accomplished', 'Results-driven'],
  projects: ['Built', 'Designed', 'Created', 'Deployed', 'Integrated', 'Automated'],
  default: ['•', '—', 'Responsible for', 'Successfully'],
};

function getActiveSection(): string {
  const active = document.activeElement;
  if (!active) return 'default';
  const section = active.closest('[data-section]');
  if (!section) return 'default';
  const name = section.getAttribute('data-section') || 'default';
  return ACTION_WORDS[name] ? name : 'default';
}

function insertTextAtCursor(text: string) {
  const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
  if (!el || !('setRangeText' in el)) return;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  el.setRangeText(text, start, end, 'end');
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

export function KeyboardToolbar() {
  const [visible, setVisible] = useState(false);
  const [activeSection, setActiveSection] = useState('default');

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const open = document.documentElement.classList.contains('keyboard-open');
      setVisible(open);
      if (open) setActiveSection(getActiveSection());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Update section when focus changes
  useEffect(() => {
    if (!visible) return;
    const onFocus = () => setActiveSection(getActiveSection());
    document.addEventListener('focusin', onFocus);
    return () => document.removeEventListener('focusin', onFocus);
  }, [visible]);

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

  const handleQuickInsert = (text: string) => {
    haptics.light();
    insertTextAtCursor(text);
  };

  const words = ACTION_WORDS[activeSection] || ACTION_WORDS.default;

  return (
    <div
      className="fixed left-0 right-0 z-[60] flex flex-col glass-surface border-t border-border/30"
      style={{ bottom: 'var(--keyboard-height, 0px)' }}
    >
      {/* Quick-insert row */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto scrollbar-none border-b border-border/20">
        {words.map(word => (
          <button
            key={word}
            type="button"
            onClick={() => handleQuickInsert(word + ' ')}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted/60 text-foreground hover:bg-muted active:scale-95 transition-all touch-manipulation whitespace-nowrap min-h-[32px]"
          >
            {word}
          </button>
        ))}
      </div>
      {/* Navigation row */}
      <div className="flex items-center justify-between px-3 h-11">
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
    </div>
  );
}
