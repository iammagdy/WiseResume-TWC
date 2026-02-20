import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Experience } from '@/types/resume';

export function ExperienceCard({ exp, style, isLast, index }: { exp: Experience; style: string; isLast: boolean; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasLongContent = (exp.description?.length ?? 0) > 200 || (exp.achievements?.length ?? 0) > 3;

  const cardClass = style === 'bold-dark'
    ? 'rounded-2xl p-5 space-y-3 border transition-all hover:border-[var(--pf-accent)]/40'
    : style === 'glass-pro'
    ? 'rounded-2xl p-5 space-y-3 backdrop-blur-sm transition-all hover:bg-white/10'
    : style === 'classic-clean'
    ? 'pl-5 py-4 space-y-2'
    : 'rounded-2xl p-5 space-y-3 border transition-all';

  const cardStyle: React.CSSProperties = style === 'bold-dark'
    ? { background: 'rgba(255,255,255,0.03)', borderColor: 'color-mix(in srgb, var(--pf-accent) 20%, transparent)' }
    : style === 'glass-pro'
    ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }
    : style === 'classic-clean'
    ? { borderLeft: '2px solid var(--pf-accent)' }
    : { background: 'var(--pf-card, rgba(255,255,255,0.04))', borderColor: 'var(--pf-border, rgba(255,255,255,0.08))' };

  return (
    <div className="relative">
      {style === 'classic-clean' && !isLast && (
        <div className="absolute left-[-1px] top-full w-[2px] h-4" style={{ background: 'var(--pf-border, #e5e7eb)' }} />
      )}
      <div className={`${cardClass} pf-exp-card`} style={cardStyle}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold"
              style={{ background: 'color-mix(in srgb, var(--pf-accent) 15%, transparent)', color: 'var(--pf-accent)' }}>
              {exp.company?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-base leading-tight" style={{ fontFamily: 'var(--pf-heading-font)', color: 'var(--pf-fg, inherit)' }}>
                {exp.position}
              </h4>
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--pf-accent)' }}>{exp.company}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {exp.current && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--pf-accent) 20%, transparent)', color: 'var(--pf-accent)' }}>
                NOW
              </span>
            )}
            <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--pf-card, rgba(255,255,255,0.06))', color: 'var(--pf-muted, #9ca3af)', border: '1px solid var(--pf-border, rgba(255,255,255,0.08))' }}>
              {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
            </span>
          </div>
        </div>

        {exp.description && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
            {exp.description.length > 200 ? exp.description.slice(0, 200) : exp.description}
            {exp.description.length <= 200 ? '' : !expanded ? '…' : ''}
          </p>
        )}

        {exp.achievements?.length > 0 && !hasLongContent && (
          <ul className="space-y-1.5">
            {exp.achievements.slice(0, 3).map((a, i) => (
              <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--pf-accent)' }} />
                {a}
              </li>
            ))}
          </ul>
        )}

        {hasLongContent && (
          <div className={`pf-exp-expandable ${expanded ? 'pf-exp-expanded' : ''}`}>
            {exp.description && exp.description.length > 200 && (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
                {exp.description.slice(200)}
              </p>
            )}
            {exp.achievements?.length > 0 && (
              <ul className="space-y-1.5 mt-3">
                {exp.achievements.map((a, i) => (
                  <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--pf-accent)' }} />
                    {a}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {hasLongContent && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-80"
            style={{ color: 'var(--pf-accent)' }}
          >
            <ChevronDown className={`w-3.5 h-3.5 pf-exp-chevron ${expanded ? 'pf-exp-chevron-open' : ''}`} />
            <span className="pf-exp-label">{expanded ? 'Show less' : 'Show more'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
