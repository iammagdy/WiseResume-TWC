import type { Education } from '@/types/resume';

export function EducationCard({ edu, style }: { edu: Education; style: string }) {
  const cardStyle: React.CSSProperties = style === 'classic-clean'
    ? { borderLeft: '2px solid var(--pf-accent)', paddingLeft: '1.25rem', paddingTop: '0.75rem', paddingBottom: '0.75rem' }
    : style === 'bold-dark'
    ? { background: 'rgba(255,255,255,0.03)', border: '1px solid color-mix(in srgb, var(--pf-accent) 20%, transparent)', borderRadius: '1rem', padding: '1.25rem' }
    : { background: 'var(--pf-card, rgba(255,255,255,0.04))', border: '1px solid var(--pf-border, rgba(255,255,255,0.08))', borderRadius: '1rem', padding: '1.25rem' };

  return (
    <div style={cardStyle} className="pf-edu-card space-y-1">
      <h4 className="font-bold text-sm" style={{ fontFamily: 'var(--pf-heading-font)', color: 'var(--pf-fg, inherit)' }}>
        {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
      </h4>
      <p className="text-sm font-semibold" style={{ color: 'var(--pf-accent)' }}>{edu.institution}</p>
      <p className="text-xs" style={{ color: 'var(--pf-muted, #9ca3af)' }}>{edu.startDate} – {edu.endDate}</p>
      {edu.gpa && <p className="text-xs" style={{ color: 'var(--pf-muted, #9ca3af)' }}>GPA: {edu.gpa}</p>}
    </div>
  );
}
