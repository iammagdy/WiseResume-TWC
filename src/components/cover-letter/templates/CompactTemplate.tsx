import { memo } from 'react';
import type { CoverLetterTemplateProps } from './registry';

/**
 * Compact — tight typography, inline header, minimal chrome. Optimised
 * for short letters and fast scanning.
 */
export const CompactTemplate = memo(function CompactTemplate({
  title,
  company,
  content,
  dateLabel,
  accentHex,
}: CoverLetterTemplateProps) {
  const accent = accentHex || '#0f172a';
  return (
    <div className="bg-white text-gray-900 rounded-2xl shadow-soft border border-border overflow-hidden font-sans">
      <div className="px-5 sm:px-6 py-5">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pb-2 border-b" style={{ borderColor: accent }}>
          <h2 className="text-base font-semibold" style={{ color: accent }}>
            {title}
          </h2>
          {company && <span className="text-xs text-gray-600">· {company}</span>}
          <span className="text-[11px] text-gray-500 ml-auto">{dateLabel}</span>
        </header>
        <div className="mt-3 text-[13px] leading-snug text-gray-800 whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </div>
  );
});
