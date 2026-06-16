import { useCallback, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

export type PortfolioEditorTab = 'setup' | 'content' | 'design' | 'more' | 'visitors';

const TABS: { id: PortfolioEditorTab; label: string }[] = [
  { id: 'setup', label: 'Setup' },
  { id: 'content', label: 'Content' },
  { id: 'design', label: 'Design' },
  { id: 'visitors', label: 'Visitors' },
  { id: 'more', label: 'More' },
];

interface PortfolioTabStripProps {
  activeTab: PortfolioEditorTab;
  onTabChange: (tab: PortfolioEditorTab) => void;
  className?: string;
}

export function PortfolioTabStrip({ activeTab, onTabChange, className }: PortfolioTabStripProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const nextIndex =
      e.key === 'ArrowRight'
        ? (index + 1) % TABS.length
        : (index - 1 + TABS.length) % TABS.length;
    onTabChange(TABS[nextIndex].id);
    document.getElementById(`portfolio-tab-${TABS[nextIndex].id}`)?.focus();
  }, [onTabChange]);

  return (
    <nav
      id="portfolio-tab-strip"
      className={cn(
        'flex gap-1 p-1 rounded-2xl border border-border/70 bg-muted/30 overflow-x-auto scrollbar-none',
        className,
      )}
      aria-label="Portfolio sections"
      role="tablist"
    >
      {TABS.map((tab, index) => {
        const selected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`portfolio-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`portfolio-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            data-active={selected ? 'true' : 'false'}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className="portfolio-editor-tab min-h-[44px] touch-manipulation snap-start shrink-0 whitespace-nowrap"
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
