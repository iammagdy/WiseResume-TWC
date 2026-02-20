import { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AITrustBadgeProps {
  className?: string;
  dismissible?: boolean;
}

export function AITrustBadge({ className, dismissible = true }: AITrustBadgeProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10 text-[10px] text-muted-foreground',
        className
      )}
    >
      <ShieldCheck className="w-3 h-3 text-primary shrink-0" />
      <span>Private &amp; secure — your data never leaves your session</span>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className="ml-auto shrink-0 active:scale-95"
          aria-label="Dismiss"
        >
          <X className="w-3 h-3 text-muted-foreground/50" />
        </button>
      )}
    </div>
  );
}
