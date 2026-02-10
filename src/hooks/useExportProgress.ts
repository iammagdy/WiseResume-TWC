import { useState, useCallback } from 'react';

export type ExportStage =
  | 'preparing'
  | 'capturing'
  | 'paginating'
  | 'embedding'
  | 'finalizing'
  | 'downloading'
  | 'idle';

const STAGE_MESSAGES: Record<ExportStage, string> = {
  preparing: 'Preparing fonts & layout...',
  capturing: 'Capturing resume...',
  paginating: 'Slicing pages...',
  embedding: 'Embedding images...',
  finalizing: 'Adding footer & metadata...',
  downloading: 'Saving file...',
  idle: '',
};

export interface ExportProgress {
  stage: ExportStage;
  progress: number; // 0-100
  message: string;
  isActive: boolean;
}

export type OnProgressCallback = (stage: ExportStage, progress: number) => void;

export function useExportProgress() {
  const [stage, setStage] = useState<ExportStage>('idle');
  const [progress, setProgress] = useState(0);

  const onProgress: OnProgressCallback = useCallback((newStage: ExportStage, pct: number) => {
    setStage(newStage);
    setProgress(Math.min(100, Math.max(0, pct)));
  }, []);

  const reset = useCallback(() => {
    setStage('idle');
    setProgress(0);
  }, []);

  const exportProgress: ExportProgress = {
    stage,
    progress,
    message: STAGE_MESSAGES[stage],
    isActive: stage !== 'idle',
  };

  return { exportProgress, onProgress, reset };
}
