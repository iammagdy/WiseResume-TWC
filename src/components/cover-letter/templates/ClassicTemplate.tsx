import { memo } from 'react';
import type { CoverLetterTemplateProps } from './registry';

/**
 * Classic — the legacy/default look. Serif, centred header, accent rule.
 * This is what existing rows rendered as before the gallery existed,
 * so it must stay visually quiet.
 */
export const ClassicTemplate = memo(function ClassicTemplate({
  title,
  company,
  content,
  dateLabel,
  accentHex,
}: CoverLetterTemplateProps) {
  const accent = accentHex || '#1e40af';
  return (
    <div className="bg-white text-gray-900 rounded-2xl shadow-soft border border-border overflow-hidden font-serif">
      <div className="h-1 w-full" style={{ backgroundColor: accent }} aria-hidden />
      <div className="px-6 sm:px-8 pt-6 pb-8">
        <header className="text-center pb-4 border-b border-gray-200">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: '#0f172a' }}>
            {title}
          </h2>
          {company && (
            <p className="text-sm text-gray-600 mt-1">{company}</p>
          )}
          <p className="text-xs text-gray-500 mt-2">{dateLabel}</p>
        </header>
        <div className="mt-5 text-[14px] leading-relaxed text-gray-800 whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </div>
  );
});
