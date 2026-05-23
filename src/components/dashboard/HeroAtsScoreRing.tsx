import { memo } from 'react';
import { ScoreRing } from '@/components/dashboard/ScoreRing';

interface HeroAtsScoreRingProps {
  score: number;
  size?: number;
  isLoading?: boolean;
  className?: string;
}

/** ATS score ring with stacked score + "ATS" label (dashboard hero, dialogs). */
export const HeroAtsScoreRing = memo(function HeroAtsScoreRing({
  score,
  size = 88,
  isLoading = false,
  className,
}: HeroAtsScoreRingProps) {
  return (
    <ScoreRing
      score={score}
      size={size}
      isLoading={isLoading}
      variant="labeled"
      className={className}
    />
  );
});
