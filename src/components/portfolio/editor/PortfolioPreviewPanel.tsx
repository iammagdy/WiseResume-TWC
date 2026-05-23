import type { ReactNode } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PortfolioPreviewMode = 'desktop' | 'mobile';

interface PortfolioPreviewPanelProps {
  previewMode: PortfolioPreviewMode;
  onPreviewModeChange: (mode: PortfolioPreviewMode) => void;
  children: ReactNode;
  className?: string;
}

export function PortfolioPreviewPanel({
  previewMode,
  onPreviewModeChange,
  children,
  className,
}: PortfolioPreviewPanelProps) {
  return (
    <section className={cn('portfolio-editor-preview-panel', className)} aria-label="Portfolio preview">
      <div className="portfolio-editor-preview-panel__head">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Live preview
          </p>
          <p className="text-xs font-medium text-foreground mt-0.5">See changes before you publish</p>
        </div>
        <div
          className="flex items-center gap-0.5 p-0.5 rounded-xl bg-background border border-border/70"
          role="tablist"
          aria-label="Preview device"
        >
          <button
            type="button"
            role="tab"
            aria-selected={previewMode === 'desktop'}
            onClick={() => onPreviewModeChange('desktop')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
              previewMode === 'desktop'
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Monitor className="w-3.5 h-3.5" aria-hidden />
            Desktop
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={previewMode === 'mobile'}
            onClick={() => onPreviewModeChange('mobile')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
              previewMode === 'mobile'
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Smartphone className="w-3.5 h-3.5" aria-hidden />
            Mobile
          </button>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
