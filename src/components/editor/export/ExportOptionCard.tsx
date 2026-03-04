import { motion } from 'framer-motion';
import { Check, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExportType } from '@/types/resume';
import { cn } from '@/lib/utils';
import haptics from '@/lib/haptics';
import type { LucideIcon } from 'lucide-react';

export interface ExportOptionDef {
  id: ExportType;
  label: string;
  description: string;
  icon: LucideIcon;
  available: boolean;
  badge?: string;
}

interface ExportOptionCardProps {
  option: ExportOptionDef;
  isSelected: boolean;
  isHighlighted: boolean;
  onePageScale: number | null;
  onSelect: (id: ExportType) => void;
}

export function ExportOptionCard({ option, isSelected, isHighlighted, onePageScale, onSelect }: ExportOptionCardProps) {
  return (
    <motion.button
      data-export-id={option.id}
      onClick={() => { if (option.available) { haptics.light(); onSelect(option.id); } }}
      disabled={!option.available}
      className={cn(
        'w-full p-4 rounded-xl border-2 text-left transition-all',
        isSelected && option.available
          ? 'border-primary bg-primary/5'
          : option.available
            ? 'border-border hover:border-primary/50'
            : 'border-border opacity-50 cursor-not-allowed',
        isHighlighted && 'ring-2 ring-primary/60 shadow-lg shadow-primary/20 transition-shadow duration-300'
      )}
      whileTap={option.available ? { scale: 0.98 } : {}}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
          isSelected && option.available
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}>
          <option.icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{option.label}</span>
            {isSelected && option.available && <Check className="w-4 h-4 text-primary" />}
            {option.badge && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500/50 text-green-600 dark:text-green-400">
                {option.badge}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{option.description}</p>
          {option.id === 'one-page' && onePageScale !== null && (
            <Badge
              variant="outline"
              className={cn(
                'mt-1 text-[10px] px-1.5 py-0',
                onePageScale >= 100
                  ? 'border-green-500/50 text-green-600 dark:text-green-400'
                  : onePageScale >= 70
                    ? 'border-amber-500/50 text-amber-600 dark:text-amber-400'
                    : 'border-destructive/50 text-destructive'
              )}
            >
              {onePageScale >= 100 ? 'No scaling needed' : `${onePageScale}% scale`}
            </Badge>
          )}
          {option.id === 'one-page' && onePageScale !== null && onePageScale < 50 && (
            <Alert variant="destructive" className="mt-2 py-2 px-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Text may be too small to read comfortably at this scale. Consider using the AI One-Page Wizard to condense content first.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </motion.button>
  );
}
