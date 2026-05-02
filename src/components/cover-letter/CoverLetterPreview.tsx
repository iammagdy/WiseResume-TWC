import { memo, useMemo } from 'react';
import { format } from 'date-fns';
import { resolveCoverLetterTemplate } from './templates/registry';

interface CoverLetterPreviewProps {
  /** Persisted `template_style` value, or null for legacy/untagged letters. */
  templateStyle: string | null | undefined;
  title: string;
  company: string | null | undefined;
  content: string;
  /** ISO timestamp from the row, or null to use today. */
  createdAt?: string | null;
  /** Optional hex accent from the linked resume's customization. */
  accentHex?: string | null;
  className?: string;
}

/**
 * Editor & generator preview for cover letters. Picks the renderer from
 * the template registry; falls back to a plain `whitespace-pre-wrap`
 * card when `templateStyle` is null/empty so historical letters render
 * exactly as they did before the gallery existed.
 */
export const CoverLetterPreview = memo(function CoverLetterPreview({
  templateStyle,
  title,
  company,
  content,
  createdAt,
  accentHex,
  className,
}: CoverLetterPreviewProps) {
  const dateLabel = useMemo(
    () => format(createdAt ? new Date(createdAt) : new Date(), 'MMMM d, yyyy'),
    [createdAt],
  );

  const Template = resolveCoverLetterTemplate(templateStyle);

  if (!Template) {
    // Legacy fallback — matches the pre-Task-28 editor look exactly.
    return (
      <div
        className={
          className ??
          'bg-card border border-border shadow-soft rounded-2xl p-5 text-sm whitespace-pre-wrap leading-relaxed min-h-[40vh]'
        }
      >
        {content}
      </div>
    );
  }

  return (
    <div className={className}>
      <Template
        title={title}
        company={company || null}
        content={content}
        dateLabel={dateLabel}
        accentHex={accentHex || null}
      />
    </div>
  );
});
