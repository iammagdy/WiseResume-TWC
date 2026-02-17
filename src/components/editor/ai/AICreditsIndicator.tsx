import { useState } from 'react';
import { Zap } from 'lucide-react';
import { useAICredits } from '@/hooks/useAICredits';
import { CreditRing } from '@/components/ai/CreditRing';
import { CreditUsageSheet } from '@/components/ai/CreditUsageSheet';
import { haptics } from '@/lib/haptics';

export function AICreditsIndicator() {
  const { data: credits } = useAICredits();
  const [showSheet, setShowSheet] = useState(false);

  if (!credits) return null;

  const used = credits.daily_usage ?? 0;
  const limit = credits.daily_limit ?? 20;

  return (
    <>
      <button
        onClick={() => {
          haptics.light();
          setShowSheet(true);
        }}
        className="flex items-center gap-1 touch-manipulation active:scale-95 transition-transform"
        aria-label="View AI credit usage"
      >
        <Zap className="w-3.5 h-3.5 text-primary" />
        <CreditRing used={used} limit={limit} size={36} />
      </button>
      <CreditUsageSheet open={showSheet} onOpenChange={setShowSheet} />
    </>
  );
}
