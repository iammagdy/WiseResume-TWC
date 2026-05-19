import { memo } from 'react';
import { formatDegreeAndField } from '@/lib/educationFormat';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { ContactLinks } from './shared/ContactLinks';
import { formatDisplayDate, formatDateRangeDisplay } from '@/lib/dateUtils';

interface TemplateProps { resume: ResumeData; }

export const BankingTemplate = memo(function BankingTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-8 font-serif text-sm leading-relaxed">
      <header className="text-center border-b-2 border-gray-700 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-widest">{resume.contactInfo.fullName || 'Your Name'}</h1>
        <div className="flex justify-center mt-2">
          <ContactLinks contact={resume.contactInfo} className="text-gray-600 text-xs" iconSize={3} />
        </div>
      </header>
      {resume.summary && (
        <section data-section="summary" className="mb-5">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-2">Summary</h2>
          <p data-break-child className="text-gray-700 border-l-2 border-gray-400 pl-3">{resume.summary}</p>
        </section>
      )}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-5">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3">Experience</h2>
          <div className="space-y-3">
            {resume.experience.map(exp => (
              <div key={exp.id} data-break-avoid>
                <div className="flex justify-between"><h3 className="font-bold text-gray-900 text-xs">{exp.position} — {exp.company}{exp.account && ` · ${exp.account}`}</h3><span className="text-xs text-gray-500">{formatDateRangeDisplay(exp.startDate, exp.endDate, exp.current)}</span></div>
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
        <section data-section="education" className="mb-5">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3">Education</h2>
          {resume.education.map(edu => (<div key={edu.id} data-break-avoid className="mb-2"><span className="font-bold text-gray-900 text-xs">{formatDegreeAndField(edu.degree, edu.field).replace(" in ", " — ")}</span>, <span className="text-gray-600 text-xs">{edu.institution}</span> <span className="text-gray-500 text-xs">({formatDisplayDate(edu.endDate)})</span>{edu.description && <p className="text-gray-600 text-xs mt-0.5">{edu.description}</p>}</div>))}
        </section>
      )}
      {resume.skills.length > 0 && (
        <section data-section="skills">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-2">Skills</h2>
          <p className="text-xs text-gray-700">{resume.skills.join(', ')}</p>
        </section>
      )}
      <ExtraSections resume={resume} variant="banking" />
    </div>
  );
});
