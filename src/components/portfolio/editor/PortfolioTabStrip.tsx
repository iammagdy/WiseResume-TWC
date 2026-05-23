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
  return (
    <nav
      id="portfolio-tab-strip"
      className={cn(
        'flex gap-1 p-1 rounded-2xl border border-border/70 bg-muted/30 overflow-x-auto scrollbar-none',
        className,
      )}
      aria-label="Portfolio sections"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          id={`portfolio-tab-${tab.id}`}
          type="button"
          data-active={activeTab === tab.id ? 'true' : 'false'}
          onClick={() => onTabChange(tab.id)}
          className="portfolio-editor-tab min-h-[44px] touch-manipulation snap-start shrink-0 whitespace-nowrap"
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
