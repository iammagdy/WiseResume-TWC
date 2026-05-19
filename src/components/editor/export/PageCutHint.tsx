import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import haptics from '@/lib/haptics';

const STORAGE_KEY = 'wr-page-cut-hint-seen';

interface PageCutHintProps {
  anchorRef: React.RefObject<HTMLElement | null>;
}

export function PageCutHint({ anchorRef }: PageCutHintProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      return;
    }
    const showTimer = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    if (!visible || !anchorRef.current) return;
    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [visible, anchorRef]);

  const dismiss = () => {
    haptics.light();
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible || !position) return null;

  return (
    <div
      role="status"
      className="fixed z-50 max-w-[240px] -translate-x-1/2 -translate-y-full pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{ top: position.top, left: position.left }}
    >
      <div className="rounded-lg border border-border bg-card shadow-lg px-3 py-2 text-left">
        <p className="text-xs font-medium text-foreground pr-5">
          Tap to choose 1–3 pages or set where each page ends
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center hover:bg-muted touch-manipulation"
          aria-label="Dismiss tip"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <div
          className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 rotate-45 border-r border-b border-border bg-card"
          aria-hidden
        />
      </div>
    </div>
  );
}

export function usePageCutHintPulse(): boolean {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    try {
      setPulse(localStorage.getItem(STORAGE_KEY) !== '1');
    } catch {
      setPulse(false);
    }
  }, []);
  return pulse;
}
