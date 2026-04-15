/**
 * Pipeline drag-and-drop state handlers.
 * Used by PipelineBoard to manage HTML5 drag events.
 */

export interface DragState {
  candidateId: string | null;
  fromStage: string | null;
}

export function createDragHandlers(
  dragState: React.MutableRefObject<DragState>,
  onDrop: (candidateId: string, toStage: string) => void,
) {
  function onDragStart(candidateId: string, fromStage: string) {
    return (e: React.DragEvent) => {
      dragState.current = { candidateId, fromStage };
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', candidateId);
      (e.currentTarget as HTMLElement).classList.add('opacity-50');
    };
  }

  function onDragEnd() {
    return (e: React.DragEvent) => {
      (e.currentTarget as HTMLElement).classList.remove('opacity-50');
    };
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    (e.currentTarget as HTMLElement).classList.add('ring-2', 'ring-blue-400', 'ring-inset');
  }

  function onDragLeave(e: React.DragEvent) {
    (e.currentTarget as HTMLElement).classList.remove('ring-2', 'ring-blue-400', 'ring-inset');
  }

  function onDropZone(toStage: string) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).classList.remove('ring-2', 'ring-blue-400', 'ring-inset');
      const { candidateId, fromStage } = dragState.current;
      if (!candidateId || fromStage === toStage) return;
      onDrop(candidateId, toStage);
      dragState.current = { candidateId: null, fromStage: null };
    };
  }

  return { onDragStart, onDragEnd, onDragOver, onDragLeave, onDropZone };
}
