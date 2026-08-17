import { memo } from 'react';
import { ScoreRing } from '@/components/dashboard/ScoreRing';

interface HeroAtsScoreRingProps {
  score: number;
  size?: number;
  isLoading?: boolean;
  className?: string;
}

/** Resume-readiness ring used by dashboard hero and portfolio dialogs. */
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
      label="Resume readiness"
      caption="Ready"
      className={className}
    />
  );
});
