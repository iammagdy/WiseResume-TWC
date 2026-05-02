import { memo } from 'react';
import type { CoverLetterTemplateProps } from './registry';

/**
 * Modern — sidebar header with accent color, sans-serif body. Mirrors the
 * "modern" PDF renderer.
 */
export const ModernTemplate = memo(function ModernTemplate({
  title,
  company,
  content,
  dateLabel,
  accentHex,
}: CoverLetterTemplateProps) {
  const accent = accentHex || '#0f766e';
  return (
    <div className="bg-white text-gray-900 rounded-2xl shadow-soft border border-border overflow-hidden font-sans">
      <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr]">
        <aside
          className="px-5 py-6 text-white flex flex-col justify-between gap-4 sm:min-h-[220px]"
          style={{ backgroundColor: accent }}
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-75">Cover Letter</p>
            <h2 className="text-lg font-bold leading-snug mt-2">{title}</h2>
            {company && <p className="text-xs opacity-90 mt-1.5">{company}</p>}
          </div>
          <p className="text-xs opacity-80">{dateLabel}</p>
        </aside>
        <div className="px-6 sm:px-7 py-6 text-[14px] leading-relaxed text-gray-800 whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </div>
  );
});
