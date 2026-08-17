import { EyeOff, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface BiasToggleProps {
  biasMode: boolean;
  onToggle: () => void;
  className?: string;
}

export function BiasToggle({ biasMode, onToggle, className }: BiasToggleProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={biasMode ? 'default' : 'outline'}
            size="sm"
            onClick={onToggle}
            className={cn(
              'gap-2 transition-all',
              biasMode
                ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600'
                : 'border-border',
              className
            )}
            aria-pressed={biasMode}
            aria-label={biasMode ? 'Show candidate identifiers' : 'Hide candidate identifiers'}
          >
            {biasMode ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Hide Identifiers</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">
            {biasMode
              ? 'Candidate names and visible identifiers are hidden in this view. Source data and AI processing are unchanged.'
              : 'Hides candidate names and visible identifiers in this view only.'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
