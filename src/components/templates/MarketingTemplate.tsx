import { memo } from 'react';
import { formatDegreeAndField } from '@/lib/educationFormat';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { ContactLinks } from './shared/ContactLinks';
import { formatDisplayDate, formatDateRangeDisplay } from '@/lib/dateUtils';

interface TemplateProps { resume: ResumeData; }

export const MarketingTemplate = memo(function MarketingTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-8 font-sans text-sm leading-relaxed">
      <header className="mb-6">
        <h1 className="text-3xl font-black text-rose-600">{resume.contactInfo.fullName || 'Your Name'}</h1>
        <div className="h-1.5 w-24 bg-gradient-to-r from-rose-500 to-orange-400 rounded-full mt-2 mb-3" />
        <ContactLinks contact={resume.contactInfo} className="text-gray-600 text-xs" iconSize={3} />
      </header>
      {resume.summary && (
        <section data-section="summary" className="mb-6">
          <h2 className="text-lg font-bold text-rose-600 mb-2">About Me</h2>
          <p data-break-child className="text-gray-700">{resume.summary}</p>
        </section>
      )}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-6">
          <h2 className="text-lg font-bold text-rose-600 mb-3">Experience</h2>
          <div className="space-y-4">
            {resume.experience.map(exp => {
              const range = formatDateRangeDisplay(exp.startDate, exp.endDate, exp.current);
              return (
              <div key={exp.id} data-break-avoid className="border-l-2 border-rose-300 pl-4">
                <h3 className="font-bold text-gray-900">{exp.position}</h3>
                <p className="text-gray-600 text-xs">{exp.company}{exp.account && ` · ${exp.account}`}{range && ` · ${range}`}</p>
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
              );
            })}
          </div>
        </section>
      )}
      {resume.education.length > 0 && (
        <section data-section="education" className="mb-6">
          <h2 className="text-lg font-bold text-rose-600 mb-3">Education</h2>
          {resume.education.map(edu => (<div key={edu.id} data-break-avoid className="mb-2"><h3 className="font-bold text-gray-900 text-xs">{formatDegreeAndField(edu.degree, edu.field)}</h3><p className="text-gray-600 text-xs">{edu.institution} — {formatDateRangeDisplay(edu.startDate, edu.endDate, edu.endDate === 'Present')}</p>{edu.description && <p className="text-gray-600 text-xs mt-0.5">{edu.description}</p>}</div>))}
        </section>
      )}
      {resume.skills.length > 0 && (
        <section data-section="skills">
          <h2 className="text-lg font-bold text-rose-600 mb-2">Skills</h2>
          <div className="flex flex-wrap gap-2">{resume.skills.map((s, i) => <span key={i} className="px-2 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-medium">{s}</span>)}</div>
        </section>
      )}
      <ExtraSections resume={resume} variant="marketing" />
    </div>
  );
});
