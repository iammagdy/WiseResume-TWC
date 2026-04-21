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
  /** Non-blocking warning surfaced by the export pipeline (e.g. one-page
   *  output may look soft). Consumers can render this as a toast/banner
   *  without aborting the export. */
  warning: string | null;
}

export type OnProgressCallback = (stage: ExportStage, progress: number, warning?: string) => void;

export function useExportProgress() {
  const [stage, setStage] = useState<ExportStage>('idle');
  const [progress, setProgress] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);

  const onProgress: OnProgressCallback = useCallback((newStage: ExportStage, pct: number, warn?: string) => {
    setStage(newStage);
    setProgress(Math.min(100, Math.max(0, pct)));
    if (warn) setWarning(warn);
  }, []);

  const reset = useCallback(() => {
    setStage('idle');
    setProgress(0);
    setWarning(null);
  }, []);

  const dismissWarning = useCallback(() => setWarning(null), []);

  const exportProgress: ExportProgress = {
    stage,
    progress,
    message: STAGE_MESSAGES[stage],
    isActive: stage !== 'idle',
    warning,
  };

  return { exportProgress, onProgress, reset, dismissWarning };
}
