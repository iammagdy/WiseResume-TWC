import { Globe, Copy, Check, QrCode, ExternalLink, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface StrengthTip {
  ok: boolean;
  tip: string;
}

export interface StatusBarProps {
  portfolioEnabled: boolean;
  portfolioDisplayUrl: string;
  actualPortfolioUrl: string;
  copied: boolean;
  onCopyUrl: () => void;
  onOpenQR: () => void;
  strengthScore: number;
  strengthLabel: string;
  strengthMissing: StrengthTip[];
  hasUnpublishedChanges?: boolean;
}

export function StatusBar({
  portfolioEnabled,
  portfolioDisplayUrl,
  actualPortfolioUrl,
  copied,
  onCopyUrl,
  onOpenQR,
  strengthScore,
  strengthLabel,
  strengthMissing,
  hasUnpublishedChanges = false,
}: StatusBarProps) {
  const strengthColor =
    strengthScore < 40
      ? 'text-destructive'
      : strengthScore < 70
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-emerald-600 dark:text-emerald-400';

  const strengthBarColor =
    strengthScore < 40
      ? 'bg-destructive'
      : strengthScore < 70
        ? 'bg-amber-500'
        : 'bg-emerald-500';

  return (
    <div className="portfolio-editor-hero">
      <div className="portfolio-editor-hero__glow" aria-hidden />
      <div className="relative p-4 sm:p-5 space-y-3">
        {hasUnpublishedChanges && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300">
            <PenLine className="w-4 h-4 shrink-0" aria-hidden />
            <span className="text-xs font-medium leading-snug">
              Unpublished changes — use Publish in the bar below to go live
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
              portfolioEnabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-muted/50 border-border text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                portfolioEnabled ? 'bg-emerald-500' : 'bg-muted-foreground/50',
              )}
              aria-hidden
            />
            {portfolioEnabled ? 'Live' : 'Draft'}
          </span>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tabular-nums border touch-manipulation',
                    strengthColor,
                    'bg-card/80 border-border/70',
                  )}
                >
                  {strengthScore}% · {strengthLabel}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="max-w-[260px] p-3 space-y-1.5">
                <p className="text-xs font-semibold">
                  Portfolio strength · {strengthScore}%
                </p>
                {strengthMissing.length > 0 ? (
                  <ul className="space-y-1">
                    {strengthMissing.map((m, i) => (
                      <li key={i} className="text-[11px] text-muted-foreground">
                        · {m.tip}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-muted-foreground">All checks passed.</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', strengthBarColor)}
            style={{ width: `${Math.min(100, Math.max(0, strengthScore))}%` }}
            role="progressbar"
            aria-valuenow={strengthScore}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Portfolio strength"
          />
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2.5">
          <Globe className="w-4 h-4 text-primary shrink-0" aria-hidden />
          {actualPortfolioUrl ? (
            <a
              href={actualPortfolioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 flex-1 min-w-0 text-xs font-mono text-muted-foreground truncate hover:text-foreground transition-colors"
            >
              <span className="truncate">{portfolioDisplayUrl}</span>
              <ExternalLink className="w-3 h-3 shrink-0 text-primary" aria-hidden />
            </a>
          ) : (
            <span className="flex-1 text-xs text-muted-foreground italic">Set a username to get your public URL</span>
          )}

          {actualPortfolioUrl && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-lg"
                onClick={onCopyUrl}
                aria-label="Copy portfolio URL"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-primary" aria-hidden />
                ) : (
                  <Copy className="w-3.5 h-3.5" aria-hidden />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-lg"
                onClick={onOpenQR}
                aria-label="Open QR code"
              >
                <QrCode className="w-3.5 h-3.5" aria-hidden />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
