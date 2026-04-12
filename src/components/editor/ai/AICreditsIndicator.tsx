import { useState } from 'react';
import { Zap } from 'lucide-react';
import { useAICredits } from '@/hooks/useAICredits';
import { CreditRing } from '@/components/ai/CreditRing';
import { CreditUsageSheet } from '@/components/ai/CreditUsageSheet';
import { haptics } from '@/lib/haptics';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function AICreditsIndicator() {
  const { data: credits, isBYOK, isActiveTrial, trialDaysLeft } = useAICredits();
  const [showSheet, setShowSheet] = useState(false);
  const [showPopover, setShowPopover] = useState(false);

  if (!credits) return null;

  const used = credits.daily_usage ?? 0;
  const limit = credits.daily_limit ?? 20;
  const remaining = Math.max(0, limit - used);
  const isUnlimited = !isFinite(limit);
  const isExhausted = !isUnlimited && remaining === 0;

  const unlimitedLabel = isBYOK
    ? 'Unlimited (your API key)'
    : isActiveTrial
      ? `Unlimited · Trial (${trialDaysLeft}d left)`
      : 'Unlimited · Premium plan';

  const unlimitedColor = isUnlimited
    ? isBYOK ? 'green' : isActiveTrial ? 'blue' : 'amber'
    : undefined;

  return (
    <>
      <Popover open={showPopover} onOpenChange={setShowPopover}>
        <PopoverTrigger asChild>
          <button
            onClick={() => {
              haptics.light();
              setShowPopover((v) => !v);
            }}
            className="flex items-center gap-1 touch-manipulation active:scale-95 transition-transform"
            aria-label="View AI credit usage"
          >
            <Zap className="w-3.5 h-3.5 text-primary" />
            <CreditRing used={used} limit={limit} size={36} unlimitedColor={unlimitedColor} />
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="end" className="w-64 p-3 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Zap className="w-4 h-4 text-primary" />
            AI Credits
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Credits power AI features like Resume Tailor, Cover Letter, ATS Scoring,
            and more. Each AI action costs 1–3 credits.
          </p>
          <div className="rounded-lg bg-muted px-3 py-2 text-xs space-y-1">
            {isUnlimited ? (
              <p className="text-primary font-medium">{unlimitedLabel}</p>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Used today</span>
                  <span className="font-medium">{used} / {limit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className={isExhausted ? 'text-destructive font-semibold' : 'font-medium'}>
                    {isExhausted ? 'None — resets at midnight' : `${remaining} credits`}
                  </span>
                </div>
              </>
            )}
          </div>
          <button
            className="w-full text-xs text-primary hover:underline text-center pt-0.5"
            onClick={() => {
              setShowPopover(false);
              haptics.light();
              setShowSheet(true);
            }}
          >
            View detailed usage →
          </button>
        </PopoverContent>
      </Popover>
      <CreditUsageSheet open={showSheet} onOpenChange={setShowSheet} />
    </>
  );
}
