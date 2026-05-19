import { memo } from 'react';
import { formatDegreeAndField } from '@/lib/educationFormat';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { ContactLinks } from './shared/ContactLinks';
import { formatDisplayDate, formatDateRangeDisplay } from '@/lib/dateUtils';

interface TemplateProps {
  resume: ResumeData;
  accentColor?: string;
}

export const PortfolioTemplate = memo(function PortfolioTemplate({ resume, accentColor = '#e84545' }: TemplateProps) {
  const headingStyle = { color: accentColor };
  const dividerStyle = { background: accentColor };
  const summaryStyle = { background: `color-mix(in srgb, ${accentColor} 8%, transparent)` };
  const companyStyle = { color: accentColor };
  const pillStyle = {
    border: `1px solid color-mix(in srgb, ${accentColor} 35%, transparent)`,
    color: accentColor,
    background: `color-mix(in srgb, ${accentColor} 8%, transparent)`,
  };

  return (
    <div className="p-8 font-sans text-sm leading-relaxed">
      <header className="mb-6">
        <div className="flex items-end gap-4">
          <h1 className="text-3xl font-bold text-gray-900 leading-none">{resume.contactInfo.fullName || 'Your Name'}</h1>
          <div className="h-0.5 flex-1" style={dividerStyle} />
        </div>
        <ContactLinks contact={resume.contactInfo} className="text-gray-500 text-xs mt-3" iconSize={3} />
      </header>
      {resume.summary && (
        <section data-section="summary" className="mb-6 p-4 rounded-lg" style={summaryStyle}>
          <h2 className="text-sm font-bold text-amber-700 uppercase tracking-widest mb-3">Summary</h2>
          <p data-break-child className="text-gray-700 italic">{resume.summary}</p>
        </section>
      )}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={headingStyle}>Projects & Experience</h2>
          <div className="space-y-4">
            {resume.experience.map(exp => (
              <div key={exp.id} data-break-avoid className="border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-start"><h3 className="font-bold text-gray-900">{exp.position}</h3><span className="text-xs text-gray-500">{formatDateRangeDisplay(exp.startDate, exp.endDate, exp.current)}</span></div>
                <p className="text-xs font-medium" style={companyStyle}>{exp.company}</p>
                {exp.description && <p data-break-child className="text-gray-700 mt-2 text-xs">{exp.description}</p>}
                {exp.achievements && exp.achievements.length > 0 && (
                  <ul data-break-child className="mt-1 space-y-0.5 list-none">
                    {exp.achievements.map((a, i) => (
                      <li key={i} data-break-child className="text-gray-700 text-xs pl-3 relative before:content-['-'] before:absolute before:left-0">{a}</li>
                    ))}
                  </ul>
                )}
                {exp.responsibilities && exp.responsibilities.length > 0 && (
                  <ul data-break-child className="mt-1 space-y-0.5 list-none">
                    {exp.responsibilities.map((r, i) => (
                      <li key={i} data-break-child className="text-gray-700 text-xs pl-3 relative before:content-['-'] before:absolute before:left-0">{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      {resume.education.length > 0 && (
        <section data-section="education" className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={headingStyle}>Education</h2>
          {resume.education.map(edu => (<div key={edu.id} data-break-avoid className="flex justify-between mb-2"><div><h3 className="font-bold text-gray-900 text-xs">{formatDegreeAndField(edu.degree, edu.field)}</h3><p className="text-gray-600 text-xs">{edu.institution}</p>{edu.description && <p className="text-gray-600 text-xs mt-0.5">{edu.description}</p>}</div><span className="text-xs text-gray-500">{formatDateRangeDisplay(edu.startDate, edu.endDate, edu.endDate === 'Present')}</span></div>))}
        </section>
      )}
      {resume.skills.length > 0 && (
        <section data-section="skills">
          <h2 className="text-sm font-bold uppercase tracking-widest mb-2" style={headingStyle}>Toolkit</h2>
          <div className="flex flex-wrap gap-2">{resume.skills.map((s, i) => <span key={i} className="px-2 py-1 rounded text-xs" style={pillStyle}>{s}</span>)}</div>
        </section>
      )}
      <ExtraSections resume={resume} variant="portfolio" />
    </div>
  );
});
