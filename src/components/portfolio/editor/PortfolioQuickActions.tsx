import { QrCode, Wand2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PortfolioQuickActionsProps {
  onQrCode: () => void;
  onGenerateAll: () => void;
  generatingAll: boolean;
  generatingBio: boolean;
  generatingSEO: boolean;
  className?: string;
}

export function PortfolioQuickActions({
  onQrCode,
  onGenerateAll,
  generatingAll,
  generatingBio,
  generatingSEO,
  className,
}: PortfolioQuickActionsProps) {
  const busy = generatingAll || generatingBio || generatingSEO;

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-3', className)}>
      <button
        type="button"
        onClick={onQrCode}
        className="portfolio-editor-quick-action flex items-center gap-3 px-4 py-3.5 text-left touch-manipulation"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/15">
          <QrCode className="w-5 h-5 text-primary" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">QR & sharing</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            Generate a code and share your portfolio anywhere
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={onGenerateAll}
        disabled={busy}
        className="portfolio-editor-quick-action portfolio-editor-quick-action--primary flex items-center gap-3 px-4 py-3.5 text-left touch-manipulation disabled:opacity-60"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 border border-primary/25">
          {busy ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" aria-hidden />
          ) : (
            <Wand2 className="w-5 h-5 text-primary" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-primary">
            {busy ? 'Generating…' : 'AI fill portfolio'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            Bio, SEO meta, and availability headline in one pass
          </p>
        </div>
      </button>
    </div>
  );
}
