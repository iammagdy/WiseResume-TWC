import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
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
  biasMode?: boolean;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

// Below this threshold the cost of measuring + virtualizing exceeds the
// cost of rendering all cards directly, and keeps drag-and-drop simple.
const VIRTUALIZE_THRESHOLD = 30;

export function PipelineColumn({
  stage,
  candidates,
  onCandidateClick,
  dragHandlers,
  biasMode = false,
  selectionMode = false,
  selectedIds,
  onToggleSelect,
}: PipelineColumnProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const shouldVirtualize = candidates.length > VIRTUALIZE_THRESHOLD;

  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? candidates.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 88,
    overscan: 6,
    getItemKey: (i) => candidates[i]?.id ?? i,
  });

  const renderCard = (c: PipelineCandidate) => (
    <CandidateCard
      key={c.id}
      candidate={c}
      onClick={() => onCandidateClick(c)}
      onDragStart={dragHandlers.onDragStart(c.id, stage.id)}
      onDragEnd={dragHandlers.onDragEnd()}
      biasMode={biasMode}
      selectionMode={selectionMode}
      selected={selectedIds?.has(c.id) ?? false}
      onToggleSelect={onToggleSelect}
    />
  );

  return (
    <div
      className="flex flex-col gap-2 min-w-[200px] w-52 shrink-0 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 transition-colors"
      onDragOver={dragHandlers.onDragOver}
      onDragLeave={dragHandlers.onDragLeave}
      onDrop={dragHandlers.onDropZone(stage.id)}
    >
      <div className="flex items-center justify-between mb-1 px-0.5">
        <span className={`text-xs font-semibold ${stage.color.split(' ').slice(-2).join(' ')}`}>
          {stage.label}
        </span>
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-700 rounded-full min-w-[20px] text-center px-1.5">
          {candidates.length}
        </span>
      </div>

      {candidates.length === 0 ? (
        <div className="flex items-center justify-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-400 dark:text-slate-500">
          Drop here
        </div>
      ) : shouldVirtualize ? (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 240px)' }}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: 'relative',
              width: '100%',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((vi) => {
              const c = candidates[vi.index];
              if (!c) return null;
              return (
                <div
                  key={c.id}
                  ref={rowVirtualizer.measureElement}
                  data-index={vi.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${vi.start}px)`,
                    paddingBottom: 8,
                  }}
                >
                  {renderCard(c)}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        candidates.map(renderCard)
      )}
    </div>
  );
}
