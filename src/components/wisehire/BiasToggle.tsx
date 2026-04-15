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
            aria-label={biasMode ? 'Disable bias reduction mode' : 'Enable bias reduction mode'}
          >
            {biasMode ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Bias Reduction</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">
            {biasMode
              ? 'Names and schools are hidden — click to reveal'
              : 'Hides names, schools, and graduation years'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
