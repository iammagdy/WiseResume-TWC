import type { PipelineCandidate, PipelineStage } from '@/hooks/wisehire/usePipeline';
import { CandidateCard } from './CandidateCard';

interface PipelineColumnProps {
  stage: { id: PipelineStage; label: string; color: string };
  candidates: PipelineCandidate[];
  onCandidateClick: (c: PipelineCandidate) => void;
  dragHandlers: {
    onDragStart: (candidateId: string, fromStage: string) => (e: React.DragEvent) => void;
    onDragEnd: () => (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDropZone: (toStage: string) => (e: React.DragEvent) => void;
  };
}

export function PipelineColumn({ stage, candidates, onCandidateClick, dragHandlers }: PipelineColumnProps) {
  return (
    <div
      className="flex flex-col gap-2 min-w-[200px] w-52 shrink-0 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 transition-colors"
      onDragOver={dragHandlers.onDragOver}
      onDragLeave={dragHandlers.onDragLeave}
      onDrop={dragHandlers.onDropZone(stage.id)}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-1 px-0.5">
        <span className={`text-xs font-semibold ${stage.color.split(' ').slice(-2).join(' ')}`}>
          {stage.label}
        </span>
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-700 rounded-full min-w-[20px] text-center px-1.5">
          {candidates.length}
        </span>
      </div>

      {/* Cards */}
      {candidates.length === 0 ? (
        <div className="flex items-center justify-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-400 dark:text-slate-500">
          Drop here
        </div>
      ) : (
        candidates.map((c) => (
          <CandidateCard
            key={c.id}
            candidate={c}
            onClick={() => onCandidateClick(c)}
            onDragStart={dragHandlers.onDragStart(c.id, stage.id)}
            onDragEnd={dragHandlers.onDragEnd()}
          />
        ))
      )}
    </div>
  );
}
