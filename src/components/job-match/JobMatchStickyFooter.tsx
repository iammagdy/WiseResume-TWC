import { Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JobMatchStickyFooterProps {
  canTailor: boolean;
  isTailoring: boolean;
  onTailor: () => void;
  creditCost?: number;
  className?: string;
}

export function JobMatchStickyFooter({
  canTailor,
  isTailoring,
  onTailor,
  creditCost = 1,
  className,
}: JobMatchStickyFooterProps) {
  return (
    <div className={cn('jmw-sticky-footer', className)}>
      <button
        type="button"
        className="jmw-cta-primary"
        disabled={!canTailor || isTailoring}
        onClick={onTailor}
        aria-label="Create tailored CV"
      >
        {isTailoring ? (
          <>
            <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Creating tailored CV…
          </>
        ) : (
          <>
            <Sparkles className="w-4.5 h-4.5" aria-hidden />
            Create Tailored CV
          </>
        )}
      </button>
      {!isTailoring && (
        <p className="jmw-cta-hint">
          <Zap className="inline-block w-3 h-3 mr-0.5 -mt-0.5" aria-hidden />
          Uses {creditCost} AI credit · Changes saved automatically
        </p>
      )}
    </div>
  );
}
