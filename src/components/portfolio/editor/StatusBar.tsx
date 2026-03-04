import { Globe, Copy, Check, QrCode, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
}: StatusBarProps) {
  const strengthColor =
    strengthScore < 40 ? 'text-destructive' : strengthScore < 70 ? 'text-yellow-500' : 'text-green-500';

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass-surface border border-border/40">
      {/* Live/Draft badge */}
      <Badge
        variant={portfolioEnabled ? 'default' : 'secondary'}
        className="text-[10px] py-0.5 px-2 shrink-0"
      >
        {portfolioEnabled ? '🟢 Live' : 'Draft'}
      </Badge>

      {/* Tappable URL */}
      {actualPortfolioUrl ? (
        <a
          href={actualPortfolioUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 flex-1 min-w-0 text-xs font-mono text-muted-foreground truncate hover:text-foreground transition-colors touch-manipulation"
        >
          <span className="truncate">{portfolioDisplayUrl}</span>
          <ExternalLink className="w-3 h-3 shrink-0 text-primary" />
        </a>
      ) : (
        <span className="flex-1 text-xs text-muted-foreground italic">No username set</span>
      )}

      {/* Copy */}
      {actualPortfolioUrl && (
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onCopyUrl}>
          {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
      )}

      {/* QR */}
      {actualPortfolioUrl && (
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onOpenQR}>
          <QrCode className="w-3.5 h-3.5" />
        </Button>
      )}

      {/* Strength badge with tooltip */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className={`text-[11px] font-bold shrink-0 px-2 py-1 rounded-lg glass-surface border border-border/30 touch-manipulation ${strengthColor}`}>
              {strengthScore}%
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end" className="max-w-[240px] p-3 space-y-1.5">
            <p className="text-xs font-semibold">{strengthLabel} · {strengthScore}%</p>
            {strengthMissing.length > 0 && (
              <div className="space-y-1">
                {strengthMissing.map((m, i) => (
                  <p key={i} className="text-[11px] text-muted-foreground">· {m.tip}</p>
                ))}
              </div>
            )}
            {strengthMissing.length === 0 && (
              <p className="text-[11px] text-muted-foreground">All checks passed!</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
