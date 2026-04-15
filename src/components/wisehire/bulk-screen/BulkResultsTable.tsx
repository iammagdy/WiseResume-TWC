import { useState } from 'react';
import { CheckCircle2, ChevronDown, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ScreenResult } from '@/hooks/wisehire/useBulkScreen';
import { PIPELINE_STAGES } from '@/hooks/wisehire/usePipeline';

interface BulkResultsTableProps {
  results: ScreenResult[];
  biasMode: boolean;
  roleId?: string;
  onAddToPipeline: (result: ScreenResult, stage: string) => void;
  addingId?: string | null;
  addedIds?: Set<number>;
}

function ScoreChip({ score }: { score: number }) {
  const colour =
    score >= 75
      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
      : score >= 50
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', colour)}>
      {score}%
    </span>
  );
}

export function BulkResultsTable({
  results,
  biasMode,
  roleId,
  onAddToPipeline,
  addingId,
  addedIds = new Set(),
}: BulkResultsTableProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (!results.length) return null;

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="bg-muted/50 px-4 py-2 border-b flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {results.length} candidate{results.length !== 1 ? 's' : ''} ranked by fit
        </p>
        {biasMode && (
          <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 dark:text-amber-400">
            Bias Reduction Active
          </Badge>
        )}
      </div>

      <ul className="divide-y">
        {results.map((r) => {
          const isExpanded = expanded === r.rank;
          const isAdded = addedIds.has(r.rank);
          const isAdding = addingId === String(r.rank);
          const displayName = biasMode ? `Applicant #${r.rank}` : r.filename_name;

          return (
            <li key={r.rank} className="bg-card">
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs font-bold text-muted-foreground w-6 text-center shrink-0">
                  #{r.rank}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{displayName}</p>
                  {!biasMode && r.summary && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{r.summary}</p>
                  )}
                </div>

                <ScoreChip score={r.match_score} />

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 shrink-0"
                  onClick={() => setExpanded(isExpanded ? null : r.rank)}
                  aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                  aria-expanded={isExpanded}
                >
                  <ChevronDown
                    className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')}
                  />
                </Button>

                {isAdded ? (
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Added</span>
                  </div>
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 shrink-0"
                        disabled={isAdding}
                      >
                        <Plus className="h-3 w-3" />
                        <span className="hidden sm:inline">Add to Pipeline</span>
                        <span className="sm:hidden">Add</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-44 p-1" align="end">
                      <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Choose stage</p>
                      {PIPELINE_STAGES.map((s) => (
                        <button
                          key={s.id}
                          className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors"
                          onClick={() => onAddToPipeline(r, s.id)}
                        >
                          {s.label}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-0 grid sm:grid-cols-2 gap-4 border-t bg-muted/20">
                  <div>
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-1 mt-3">
                      <TrendingUp className="h-3 w-3" /> Strengths
                    </p>
                    <ul className="space-y-1">
                      {r.strengths.map((s, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-2">
                          <span className="text-green-500 shrink-0">✓</span>
                          <span>{biasMode ? s.replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, 'the applicant') : s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-1 mt-3">
                      <TrendingDown className="h-3 w-3" /> Concerns
                    </p>
                    <ul className="space-y-1">
                      {r.concerns.map((c, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-2">
                          <span className="text-red-400 shrink-0">✗</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
