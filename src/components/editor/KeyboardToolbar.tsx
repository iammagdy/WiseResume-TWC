import { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown, Undo2, Redo2 } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { useKeyboard } from '@/context/KeyboardContext';

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

interface KeyboardToolbarProps {
  canUndo?: boolean;
  canRedo?: boolean;
  undoDescription?: string;
  redoDescription?: string;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function KeyboardToolbar({
  canUndo = false,
  canRedo = false,
  undoDescription = '',
  redoDescription = '',
  onUndo,
  onRedo,
}: KeyboardToolbarProps) {
  const { isOpen } = useKeyboard();
  const [activeSection, setActiveSection] = useState('default');

  useEffect(() => {
    if (isOpen) setActiveSection(getActiveSection());
  }, [isOpen]);

  // Update section when focus changes while keyboard is open
  useEffect(() => {
    if (!isOpen) return;
    const onFocus = () => setActiveSection(getActiveSection());
    document.addEventListener('focusin', onFocus);
    return () => document.removeEventListener('focusin', onFocus);
  }, [isOpen]);

  if (!isOpen) return null;

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

  const handleUndo = () => {
    haptics.light();
    onUndo?.();
  };

  const handleRedo = () => {
    haptics.light();
    onRedo?.();
  };

  const words = ACTION_WORDS[activeSection] || ACTION_WORDS.default;

  return (
    <div
      className="fixed left-0 right-0 z-keyboard-toolbar flex flex-col bg-card border-t border-border"
      style={{ bottom: 'var(--keyboard-height, 0px)' }}
    >
      {/* Quick-insert row */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto scrollbar-none border-b border-border">
        {words.map(word => (
          <button
            key={word}
            type="button"
            onClick={() => handleQuickInsert(word + ' ')}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-foreground hover:bg-muted active:scale-95 transition-all touch-manipulation whitespace-nowrap min-h-[32px]"
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
          {/* Undo/Redo divider */}
          <div className="w-px h-5 bg-border mx-1" />
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            aria-label={canUndo ? `Undo: ${undoDescription}` : 'Nothing to undo'}
            title={canUndo ? `Undo: ${undoDescription}` : 'Nothing to undo'}
            aria-disabled={!canUndo}
            className="p-2 rounded-lg active:scale-95 transition-all touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground"
          >
            <Undo2 className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            aria-label={canRedo ? `Redo: ${redoDescription}` : 'Nothing to redo'}
            title={canRedo ? `Redo: ${redoDescription}` : 'Nothing to redo'}
            aria-disabled={!canRedo}
            className="p-2 rounded-lg active:scale-95 transition-all touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground"
          >
            <Redo2 className="w-5 h-5" />
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
