import type { PipelineCandidate } from '@/hooks/wisehire/usePipeline';
import { User, ChevronRight, Check } from 'lucide-react';

interface CandidateCardProps {
  candidate: PipelineCandidate;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  biasMode?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return null;
  const cls =
    score >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    : score >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return (
    <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${cls}`}>
      {score}%
    </span>
  );
}

export function CandidateCard({
  candidate,
  onClick,
  onDragStart,
  onDragEnd,
  biasMode = false,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}: CandidateCardProps) {
  const matchScore = (candidate.brief as { match_score: number | null } | null)?.match_score;

  function handleClick(e: React.MouseEvent) {
    if (selectionMode) {
      e.stopPropagation();
      onToggleSelect?.(candidate.id);
    } else {
      onClick?.();
    }
  }

  return (
    <div
      draggable={!selectionMode}
      onDragStart={selectionMode ? undefined : onDragStart}
      onDragEnd={selectionMode ? undefined : onDragEnd}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick(e as unknown as React.MouseEvent)}
      aria-label={`Candidate: ${candidate.name}`}
      className={`bg-white dark:bg-slate-900 border rounded-xl px-3 py-2.5 select-none hover:shadow-sm transition-all group ${
        selected
          ? 'border-blue-500 dark:border-blue-400 ring-1 ring-blue-500 dark:ring-blue-400 cursor-pointer'
          : selectionMode
          ? 'border-slate-200 dark:border-slate-700 cursor-pointer'
          : 'border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing hover:border-blue-300 dark:hover:border-blue-600'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          {selectionMode ? (
            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border mt-0.5 transition-colors ${
              selected
                ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500'
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
            }`}>
              {selected && <Check className="h-3 w-3 text-white" />}
            </div>
          ) : (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mt-0.5">
              <User className="h-3 w-3 text-slate-500 dark:text-slate-400" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">
              {biasMode ? `Candidate #${candidate.id.slice(-4).toUpperCase()}` : candidate.name}
            </p>
            {!biasMode && candidate.email && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                {candidate.email}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ScoreBadge score={matchScore} />
          {!selectionMode && (
            <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
      {candidate.notes && (
        <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2 pl-7">
          {candidate.notes}
        </p>
      )}
    </div>
  );
}
