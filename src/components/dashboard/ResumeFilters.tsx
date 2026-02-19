import { useState } from 'react';
import { ArrowUpDown, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

export type SortOption = 'updated' | 'alpha' | 'score';
export type CategoryFilter = 'professional' | 'creative' | 'tech' | 'minimalist';
export type ScoreFilter = 'needs-work' | 'good' | 'excellent';

interface ResumeFiltersProps {
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  categoryFilters: CategoryFilter[];
  onCategoryToggle: (cat: CategoryFilter) => void;
  scoreFilters: ScoreFilter[];
  onScoreToggle: (score: ScoreFilter) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'updated', label: 'Last edited' },
  { value: 'alpha', label: 'Alphabetical' },
  { value: 'score', label: 'ATS Score' },
];

const categoryChips: { value: CategoryFilter; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'creative', label: 'Creative' },
  { value: 'tech', label: 'Tech' },
  { value: 'minimalist', label: 'Minimalist' },
];

const scoreChips: { value: ScoreFilter; label: string; color: string }[] = [
  { value: 'needs-work', label: '< 50', color: 'border-destructive/40 text-destructive' },
  { value: 'good', label: '50–79', color: 'border-warning/40 text-warning' },
  { value: 'excellent', label: '80+', color: 'border-success/40 text-success' },
];

export function ResumeFilters({
  sort,
  onSortChange,
  categoryFilters,
  onCategoryToggle,
  scoreFilters,
  onScoreToggle,
  onClearAll,
  hasActiveFilters,
}: ResumeFiltersProps) {
  const [sortOpen, setSortOpen] = useState(false);

  return (
    <div className="px-4 pb-3">
      <div
        className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1"
        style={{
          maskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
        }}
      >
        {/* Sort dropdown */}
        <Popover open={sortOpen} onOpenChange={setSortOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 rounded-full h-9 min-h-[44px] text-xs"
              aria-label="Sort resumes"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{sortOptions.find(o => o.value === sort)?.label}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-44 p-1">
            {sortOptions.map(opt => (
              <button
                key={opt.value}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors touch-manipulation',
                  sort === opt.value ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50'
                )}
                onClick={() => {
                  haptics.light();
                  onSortChange(opt.value);
                  setSortOpen(false);
                }}
              >
                {sort === opt.value && <Check className="w-3.5 h-3.5" />}
                <span className={sort === opt.value ? '' : 'pl-5.5'}>{opt.label}</span>
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* Divider */}
        <div className="w-px h-5 bg-border/50 shrink-0" />

        {/* Category chips */}
        {categoryChips.map(chip => {
          const active = categoryFilters.includes(chip.value);
          return (
            <button
              key={chip.value}
              onClick={() => { haptics.light(); onCategoryToggle(chip.value); }}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all touch-manipulation min-h-[44px]',
                active
                  ? 'bg-primary/15 border-primary/40 text-primary'
                  : 'glass-surface border-border/30 text-muted-foreground hover:border-border/60'
              )}
              aria-pressed={active}
              aria-label={`Filter by ${chip.label} templates`}
            >
              {chip.label}
            </button>
          );
        })}

        {/* Score chips */}
        {scoreChips.map(chip => {
          const active = scoreFilters.includes(chip.value);
          return (
            <button
              key={chip.value}
              onClick={() => { haptics.light(); onScoreToggle(chip.value); }}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all touch-manipulation min-h-[44px]',
                active
                  ? `bg-primary/10 ${chip.color}`
                  : 'glass-surface border-border/30 text-muted-foreground hover:border-border/60'
              )}
              aria-pressed={active}
              aria-label={`Filter by ATS score ${chip.label}`}
            >
              {chip.label}
            </button>
          );
        })}

        {/* Clear all */}
        <AnimatePresence>
          {hasActiveFilters && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => { haptics.light(); onClearAll(); }}
              className="shrink-0 px-2.5 py-1.5 rounded-full text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors touch-manipulation min-h-[44px] flex items-center gap-1"
              aria-label="Clear all filters"
            >
              <X className="w-3 h-3" />
              Clear
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
