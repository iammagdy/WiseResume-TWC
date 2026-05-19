import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { formatDegreeAndField } from '@/lib/educationFormat';
import { ExtraSections } from './shared/ExtraSections';
import { ContactLinks } from './shared/ContactLinks';
import { formatDisplayDate, formatDateRangeDisplay } from '@/lib/dateUtils';

interface TemplateProps { resume: ResumeData; }

export const DataScienceTemplate = memo(function DataScienceTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-8 font-mono text-sm leading-relaxed">
      <header className="mb-6 border-b border-teal-500 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">{resume.contactInfo.fullName || 'Your Name'}</h1>
        <ContactLinks contact={resume.contactInfo} className="text-gray-600 text-xs mt-2" iconSize={3} />
      </header>
      {resume.summary && (
        <section data-section="summary" className="mb-5">
          <h2 className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-2">// summary</h2>
          <p data-break-child className="text-gray-700">{resume.summary}</p>
        </section>
      )}
      {resume.skills.length > 0 && (
        <section data-section="skills" className="mb-5">
          <h2 className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-2">// tech_stack</h2>
          <div className="flex flex-wrap gap-2">{resume.skills.map((s, i) => <span key={i} className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded text-xs">{s}</span>)}</div>
        </section>
      )}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-5">
          <h2 className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-3">// experience</h2>
          <div className="space-y-4">
            {resume.experience.map(exp => (
              <div key={exp.id} data-break-avoid>
                <div className="flex justify-between"><h3 className="font-bold text-gray-900">{exp.position}</h3><span className="text-xs text-gray-400">{formatDateRangeDisplay(exp.startDate, exp.endDate, exp.current, { separator: '→', presentLabel: 'present' })}</span></div>
                <p className="text-teal-600 text-xs">{exp.company}{exp.account && ` · ${exp.account}`}</p>
                {exp.description && <p data-break-child className="text-gray-700 mt-1 text-xs">{exp.description}</p>}
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
        <section data-section="education">
          <h2 className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-3">// education</h2>
          {resume.education.map(edu => (<div key={edu.id} data-break-avoid className="mb-2"><h3 className="font-bold text-gray-900 text-xs">{formatDegreeAndField(edu.degree, edu.field).replace(' in ', ' | ')}</h3><p className="text-gray-600 text-xs">{edu.institution} — {formatDisplayDate(edu.endDate)}</p>{edu.description && <p className="text-gray-600 text-xs mt-0.5">{edu.description}</p>}</div>))}
        </section>
      )}
      <ExtraSections resume={resume} variant="datascience" />
    </div>
  );
});
