import { memo } from 'react';
import { formatDegreeAndField } from '@/lib/educationFormat';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { ContactLinks } from './shared/ContactLinks';
import { formatDisplayDate, formatDateRangeDisplay } from '@/lib/dateUtils';

interface TemplateProps { resume: ResumeData; }

export const BentoTemplate = memo(function BentoTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-7 font-sans text-sm leading-relaxed bg-gray-50">
      <header className="mb-5 p-5 rounded-2xl bg-white border border-gray-200 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{resume.contactInfo.fullName || 'Your Name'}</h1>
        <div className="mt-2">
          <ContactLinks contact={resume.contactInfo} className="text-gray-500 text-xs" iconSize={3} />
        </div>
        {resume.summary && (
          <p data-break-child className="mt-3 text-gray-600 text-xs leading-relaxed border-t border-gray-100 pt-3">{resume.summary}</p>
        )}
      </header>

      <div className="grid grid-cols-3 gap-3 mb-3">
        {resume.skills.length > 0 && (
          <section data-section="skills" className="col-span-1 p-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Skills</h2>
            <div className="flex flex-col gap-1.5">
              {resume.skills.map((s, i) => (
                <span key={i} className="text-xs text-gray-700 py-1 px-2 bg-gray-50 rounded-lg border border-gray-100">{s}</span>
              ))}
            </div>
          </section>
        )}

        <div className="col-span-2 flex flex-col gap-3">
          {resume.experience.length > 0 && (
            <section data-section="experience" className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Experience</h2>
              <div className="space-y-4">
                {resume.experience.map(exp => {
                  const range = formatDateRangeDisplay(exp.startDate, exp.endDate, exp.current);
                  return (
                    <div key={exp.id} data-break-avoid>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-xs">{exp.position}</h3>
                          <p className="text-gray-500 text-xs">{exp.company}</p>
                        </div>
                        {range && <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{range}</span>}
                      </div>
                      {exp.description && <p data-break-child className="text-gray-600 mt-1.5 text-xs">{exp.description}</p>}
                      {exp.achievements && exp.achievements.length > 0 && (
                        <ul data-break-child className="mt-1.5 space-y-0.5">
                          {exp.achievements.map((a, i) => (
                            <li key={i} data-break-child className="text-gray-600 text-xs pl-3 relative before:content-['·'] before:absolute before:left-0 before:text-gray-400">{a}</li>
                          ))}
                        </ul>
                      )}
                      {exp.responsibilities && exp.responsibilities.length > 0 && (
                        <ul data-break-child className="mt-1.5 space-y-0.5">
                          {exp.responsibilities.map((r, i) => (
                            <li key={i} data-break-child className="text-gray-600 text-xs pl-3 relative before:content-['·'] before:absolute before:left-0 before:text-gray-400">{r}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>

      {resume.education.length > 0 && (
        <section data-section="education" className="mb-3 p-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Education</h2>
          <div className="grid grid-cols-2 gap-3">
            {resume.education.map(edu => (
              <div key={edu.id} data-break-avoid>
                <h3 className="font-semibold text-gray-900 text-xs">{formatDegreeAndField(edu.degree, edu.field)}</h3>
                <p className="text-gray-500 text-xs">{edu.institution}</p>
                <p className="text-gray-400 text-xs">{formatDisplayDate(edu.endDate)}</p>
                {edu.description && <p className="text-gray-500 text-xs mt-0.5">{edu.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <ExtraSections resume={resume} variant="clean" />
    </div>
  );
});
