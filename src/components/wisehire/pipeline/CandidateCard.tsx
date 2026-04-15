import type { PipelineCandidate, PipelineStage } from '@/hooks/wisehire/usePipeline';
import { User, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CandidateCardProps {
  candidate: PipelineCandidate;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragOver?: boolean;
  biasMode?: boolean;
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
}: CandidateCardProps) {
  const matchScore = (candidate.brief as { match_score: number | null } | null)?.match_score;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      aria-label={`Candidate: ${candidate.name}`}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 cursor-grab active:cursor-grabbing select-none hover:shadow-sm hover:border-blue-300 dark:hover:border-blue-600 transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mt-0.5">
            <User className="h-3 w-3 text-slate-500 dark:text-slate-400" />
          </div>
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
          <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      {candidate.notes && (
        <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2 pl-8">
          {candidate.notes}
        </p>
      )}
    </div>
  );
}
