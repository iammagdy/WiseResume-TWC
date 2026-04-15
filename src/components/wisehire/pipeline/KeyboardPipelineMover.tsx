/**
 * Keyboard-accessible stage changer rendered inside CandidateDetailPanel.
 */
import { PIPELINE_STAGES, PipelineStage } from '@/hooks/wisehire/usePipeline';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KeyboardPipelineMoverProps {
  currentStage: PipelineStage;
  onMove: (toStage: PipelineStage) => void;
  disabled?: boolean;
}

export function KeyboardPipelineMover({ currentStage, onMove, disabled }: KeyboardPipelineMoverProps) {
  const currentIndex = PIPELINE_STAGES.findIndex((s) => s.id === currentStage);
  const prevStage = currentIndex > 0 ? PIPELINE_STAGES[currentIndex - 1] : null;
  const nextStage = currentIndex < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[currentIndex + 1] : null;
  const currentStageInfo = PIPELINE_STAGES[currentIndex];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        disabled={!prevStage || disabled}
        onClick={() => prevStage && onMove(prevStage.id)}
        className="flex items-center gap-1"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        {prevStage?.label ?? ''}
      </Button>

      <span className={`flex-1 text-center text-xs font-semibold rounded-full px-3 py-1 ${currentStageInfo?.color ?? ''}`}>
        {currentStageInfo?.label ?? currentStage}
      </span>

      <Button
        variant="outline"
        size="sm"
        disabled={!nextStage || disabled}
        onClick={() => nextStage && onMove(nextStage.id)}
        className="flex items-center gap-1"
      >
        {nextStage?.label ?? ''}
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
