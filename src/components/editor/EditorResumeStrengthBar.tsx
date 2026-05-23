import { memo } from 'react';
import { cn } from '@/lib/utils';

interface EditorResumeStrengthBarProps {
  overallScore: number;
  className?: string;
}

export const EditorResumeStrengthBar = memo(function EditorResumeStrengthBar({
  overallScore,
  className,
}: EditorResumeStrengthBarProps) {
  const score = Math.min(100, Math.max(0, overallScore));

  return (
    <div
      className={cn('editor-preview-strength', className)}
      role="group"
      aria-label={`Resume strength ${score} percent`}
    >
      <div className="editor-preview-strength__row">
        <span className="editor-preview-strength__label">Resume strength</span>
        <span className="editor-preview-strength__value tabular-nums">{score}%</span>
      </div>
      <div
        className="editor-preview-strength__track"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Resume strength"
      >
        <div className="editor-preview-strength__fill" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
});
