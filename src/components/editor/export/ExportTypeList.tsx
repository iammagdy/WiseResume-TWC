import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExportType } from '@/types/resume';
import { ExportOptionDef } from './ExportOptionCard';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import haptics from '@/lib/haptics';

const SHORT_LABELS: Partial<Record<ExportType, string>> = {
  'linkedin':     'LinkedIn',
  'plain-text':   'Plain Text',
  'share-link':   'Share Link',
  'cover-letter': 'Cover Letter',
  'combined':     'Package',
  'json':         'JSON',
  'latex':        'LaTeX',
};

interface ExportTypeListProps {
  primaryOptions: ExportOptionDef[];
  secondaryOptions: ExportOptionDef[];
  selectedType: ExportType;
  highlightedType: ExportType | null;
  onePageScale: number | null;
  hasCoverLetter: boolean;
  onSelect: (id: ExportType) => void;
  onCreateCoverLetter?: () => void;
  onCreateGeneralCoverLetter?: () => void;
}

export function ExportTypeList({ primaryOptions, secondaryOptions, selectedType, highlightedType, onePageScale, hasCoverLetter, onSelect, onCreateCoverLetter, onCreateGeneralCoverLetter }: ExportTypeListProps) {
  const allOptions = [...primaryOptions, ...secondaryOptions];
  const selectedOption = allOptions.find(o => o.id === selectedType);
  const selectedIsPrimary = primaryOptions.some(o => o.id === selectedType);

  return (
    <div className="flex flex-col gap-4">

      {/* ── Primary format grid (2×2) ── */}
      <div className="grid grid-cols-2 gap-2.5">
        {primaryOptions.map((option) => {
          const isSelected = selectedType === option.id;
          return (
            <motion.button
              key={option.id}
              data-export-id={option.id}
              onClick={() => { if (option.available) { haptics.light(); onSelect(option.id); } }}
              disabled={!option.available}
              whileTap={{ scale: 0.97 }}
              className={cn(
                'relative flex flex-col items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all duration-200 group',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                  : option.available
                    ? 'border-border/60 bg-muted/20 hover:border-primary/40 hover:bg-muted/40'
                    : 'border-border/30 opacity-40 cursor-not-allowed',
                highlightedType === option.id && 'ring-2 ring-primary/50'
              )}
            >
              {/* Selected check */}
              {isSelected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-sm"
                >
                  <Check className="w-3 h-3 text-primary-foreground" />
                </motion.span>
              )}

              {/* Icon */}
              <div className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center transition-colors duration-200',
                isSelected
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted text-muted-foreground group-hover:bg-muted/80'
              )}>
                <option.icon className="w-5 h-5" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <p className={cn(
                  'font-semibold text-sm leading-snug',
                  isSelected ? 'text-foreground' : 'text-foreground/80'
                )}>
                  {option.label}
                </p>
                <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                  {option.description}
                </p>
                {option.badge && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 mt-1">
                    {option.badge}
                  </Badge>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* ── Secondary formats as compact scroll pills ── */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-0.5">
          More formats
        </p>
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-6 px-6 pb-1">
          {secondaryOptions.map((option) => {
            const isSelected = selectedType === option.id;
            return (
              <motion.button
                key={option.id}
                data-export-id={option.id}
                onClick={() => { if (option.available) { haptics.light(); onSelect(option.id); } }}
                disabled={!option.available}
                whileTap={{ scale: 0.94 }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-200',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : option.available
                      ? 'border-border/60 bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      : 'border-border/30 opacity-40 cursor-not-allowed'
                )}
              >
                <option.icon className="w-3 h-3 shrink-0" />
                {SHORT_LABELS[option.id as ExportType] ?? option.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Cover letter CTA when not yet generated ── */}
      {!hasCoverLetter && (onCreateCoverLetter || onCreateGeneralCoverLetter) && (
        <div className="px-3 py-2.5 rounded-lg bg-muted/40 border border-border/50 space-y-2">
          <p className="text-xs font-medium text-foreground/80">No cover letter yet — create one first:</p>
          <div className="flex gap-2">
            {onCreateGeneralCoverLetter && (
              <button
                onClick={onCreateGeneralCoverLetter}
                className="flex-1 text-xs font-semibold py-1.5 px-2 rounded-md border border-border/70 bg-background hover:bg-muted/60 text-foreground/80 transition-colors"
              >
                General letter
              </button>
            )}
            {onCreateCoverLetter && (
              <button
                onClick={onCreateCoverLetter}
                className="flex-1 text-xs font-semibold py-1.5 px-2 rounded-md border border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
              >
                Tailored to job ✦
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Selected secondary format detail ── */}
      <AnimatePresence mode="wait">
        {!selectedIsPrimary && selectedOption && (
          <motion.div
            key={selectedType}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/60"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <selectedOption.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{selectedOption.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedOption.description}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
