import { useState } from 'react';
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
        className="touch-manipulation active:scale-95 transition-transform"
        aria-label="View AI credit usage"
      >
        <CreditRing used={used} limit={limit} size={36} />
      </button>
      <CreditUsageSheet open={showSheet} onOpenChange={setShowSheet} />
    </>
  );
}
