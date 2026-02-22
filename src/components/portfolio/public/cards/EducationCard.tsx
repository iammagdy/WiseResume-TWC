import type { Education } from '@/types/resume';

function getCardStyle(style: string): React.CSSProperties {
  switch (style) {
    case 'classic-clean':
      return { borderLeft: '2px solid var(--pf-accent)', paddingLeft: '1.25rem', paddingTop: '0.75rem', paddingBottom: '0.75rem' };
    case 'bold-dark':
      return { background: 'rgba(255,255,255,0.03)', border: '1px solid color-mix(in srgb, var(--pf-accent) 20%, transparent)', borderRadius: '1rem', padding: '1.25rem' };
    case 'developer-terminal':
    case 'neon-cyber':
    case 'glass-pro':
    case 'creative-spotlight':
    case 'executive-suite':
    case 'freelancer-starter':
      return {};
    default:
      return { background: 'var(--pf-card, rgba(255,255,255,0.04))', border: '1px solid var(--pf-border, rgba(255,255,255,0.08))', borderRadius: '1rem', padding: '1.25rem' };
  }
}

function getCardClass(style: string): string {
  switch (style) {
    case 'developer-terminal': return 'pf-terminal-card';
    case 'creative-spotlight': return 'pf-spotlight-card';
    case 'executive-suite': return 'pf-executive-card';
    case 'freelancer-starter': return 'pf-starter-card';
    case 'neon-cyber': return 'pf-neon-card';
    default: return '';
  }
}

export function EducationCard({ edu, style }: { edu: Education; style: string }) {
  const isTerminal = style === 'developer-terminal';
  const extraClass = getCardClass(style);

  return (
    <div style={getCardStyle(style)} className={`pf-edu-card space-y-1 ${extraClass}`}>
      {isTerminal && <div className="pf-terminal-dots"><span /><span /><span /></div>}
      <div className={isTerminal ? 'pf-terminal-card-body space-y-1' : ''}>
        <h4 className="font-bold text-sm" style={{ fontFamily: 'var(--pf-heading-font)', color: 'var(--pf-fg, inherit)' }}>
          {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
        </h4>
        <p className="text-sm font-semibold" style={{ color: 'var(--pf-accent)' }}>{edu.institution}</p>
        <p className="text-xs" style={{ color: 'var(--pf-muted, #9ca3af)' }}>{edu.startDate} – {edu.endDate}</p>
        {edu.gpa && <p className="text-xs" style={{ color: 'var(--pf-muted, #9ca3af)' }}>GPA: {edu.gpa}</p>}
      </div>
    </div>
  );
}
