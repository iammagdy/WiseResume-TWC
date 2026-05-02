import { memo } from 'react';
import type { CoverLetterTemplateProps } from './registry';

/**
 * Creative — bold gradient header, oversized title, decorative dot row.
 * Eye-catching for design / marketing roles.
 */
export const CreativeTemplate = memo(function CreativeTemplate({
  title,
  company,
  content,
  dateLabel,
  accentHex,
}: CoverLetterTemplateProps) {
  const accent = accentHex || '#7c3aed';
  // Build a soft gradient from accent → darker tone for the header background.
  const gradient = `linear-gradient(135deg, ${accent} 0%, ${accent}cc 60%, #1e1b4b 100%)`;
  return (
    <div className="bg-white text-gray-900 rounded-2xl shadow-soft border border-border overflow-hidden font-sans">
      <header className="relative px-6 sm:px-8 py-7 text-white" style={{ background: gradient }}>
        <div className="flex items-center gap-1.5 mb-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block w-2 h-2 rounded-full bg-white/70"
              style={{ opacity: 1 - i * 0.25 }}
            />
          ))}
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight">
          {title}
        </h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-white/85">
          {company && <span>{company}</span>}
          {company && <span aria-hidden>•</span>}
          <span>{dateLabel}</span>
        </div>
      </header>
      <div className="px-6 sm:px-8 py-6 text-[14px] leading-relaxed text-gray-800 whitespace-pre-wrap">
        {content}
      </div>
    </div>
  );
});
