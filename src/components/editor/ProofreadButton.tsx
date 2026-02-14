import { memo } from 'react';
import { SpellCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import haptics from '@/lib/haptics';

interface ProofreadButtonProps {
  issueCount: number;
  errorCount: number;
  isChecking: boolean;
  onClick: () => void;
}

export const ProofreadButton = memo(function ProofreadButton({
  issueCount,
  errorCount,
  isChecking,
  onClick,
}: ProofreadButtonProps) {
  // Hide when no issues and not checking
  if (issueCount === 0 && !isChecking) return null;

  const badgeColor = errorCount > 0 ? 'bg-destructive' : 'bg-primary';

  return (
    <button
      onClick={() => {
        haptics.medium();
        onClick();
      }}
      className={cn(
        'fixed bottom-36 right-4 z-40 w-12 h-12 rounded-full',
        'glass-elevated shadow-lg flex items-center justify-center',
        'touch-manipulation active:scale-95 transition-transform',
        isChecking && 'animate-pulse'
      )}
      aria-label={`Proofread: ${issueCount} issues found`}
    >
      {isChecking ? (
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
      ) : (
        <SpellCheck className="w-5 h-5 text-primary" />
      )}

      {issueCount > 0 && !isChecking && (
        <span
          className={cn(
            'absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full',
            'text-[11px] font-bold text-white flex items-center justify-center',
            badgeColor
          )}
        >
          {issueCount > 99 ? '99+' : issueCount}
        </span>
      )}
    </button>
  );
});
