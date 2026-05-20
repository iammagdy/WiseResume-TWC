/**
 * Thin wrapper kept for backward compatibility.
 * New code should import AIQuestionsDialog directly.
 */
import { AIQuestionsDialog } from './AIQuestionsDialog';

interface ProjectAIQuestionsDialogProps {
  isOpen: boolean;
  projectName: string;
  questions: string[];
  onSubmit: (answers: Record<string, string>) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function ProjectAIQuestionsDialog({
  isOpen,
  projectName,
  questions,
  onSubmit,
  onClose,
  isLoading,
}: ProjectAIQuestionsDialogProps) {
  return (
    <AIQuestionsDialog
      isOpen={isOpen}
      contextLabel={projectName}
      questions={questions}
      onSubmit={onSubmit}
      onClose={onClose}
      isLoading={isLoading}
    />
  );
}
