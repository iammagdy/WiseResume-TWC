import { memo } from 'react';
import { formatDegreeAndField } from '@/lib/educationFormat';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { ContactLinks } from './shared/ContactLinks';
import { formatDisplayDate, formatDateRangeDisplay } from '@/lib/dateUtils';

interface TemplateProps { resume: ResumeData; }

export const BoldTypeTemplate = memo(function BoldTypeTemplate({ resume }: TemplateProps) {
  return (
    <div className="font-sans text-sm leading-relaxed bg-white">
      <header className="px-8 pt-10 pb-7 bg-black text-white mb-7">
        <h1 className="text-5xl font-black uppercase tracking-tighter leading-none text-white">{resume.contactInfo.fullName || 'Your Name'}</h1>
        <div className="mt-4 border-t border-white/20 pt-4">
          <ContactLinks contact={resume.contactInfo} className="text-white/70 text-xs" iconSize={3} />
        </div>
      </header>

      <div className="px-8">
        {resume.summary && (
          <section data-section="summary" className="mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tight text-black mb-2 leading-none">Profile</h2>
            <p data-break-child className="text-gray-700">{resume.summary}</p>
          </section>
        )}

        {resume.experience.length > 0 && (
          <section data-section="experience" className="mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tight text-black mb-3 leading-none">Experience</h2>
            <div className="space-y-5">
              {resume.experience.map(exp => {
                const range = formatDateRangeDisplay(exp.startDate, exp.endDate, exp.current);
                return (
                  <div key={exp.id} data-break-avoid>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-black text-black text-base uppercase tracking-tight">{exp.position}</h3>
                      {range && <span className="text-xs text-gray-400 font-mono whitespace-nowrap ml-2">{range}</span>}
                    </div>
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">{exp.company}</p>
                    {exp.description && <p data-break-child className="text-gray-700 mt-1.5 text-xs">{exp.description}</p>}
                    {exp.achievements && exp.achievements.length > 0 && (
                      <ul data-break-child className="mt-1.5 space-y-0.5">
                        {exp.achievements.map((a, i) => (
                          <li key={i} data-break-child className="text-gray-700 text-xs pl-4 relative before:content-['▸'] before:absolute before:left-0 before:text-black">{a}</li>
                        ))}
                      </ul>
                    )}
                    {exp.responsibilities && exp.responsibilities.length > 0 && (
                      <ul data-break-child className="mt-1.5 space-y-0.5">
                        {exp.responsibilities.map((r, i) => (
                          <li key={i} data-break-child className="text-gray-700 text-xs pl-4 relative before:content-['▸'] before:absolute before:left-0 before:text-black">{r}</li>
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
            <h2 className="text-2xl font-black uppercase tracking-tight text-black mb-3 leading-none">Education</h2>
            {resume.education.map(edu => (
              <div key={edu.id} data-break-avoid className="flex justify-between mb-2">
                <div>
                  <h3 className="font-black text-black text-xs uppercase tracking-tight">{formatDegreeAndField(edu.degree, edu.field)}</h3>
                  <p className="text-gray-500 text-xs">{edu.institution}</p>
                  {edu.description && <p className="text-gray-500 text-xs mt-0.5">{edu.description}</p>}
                </div>
                <span className="text-xs text-gray-400 font-mono whitespace-nowrap ml-2">{formatDisplayDate(edu.endDate)}</span>
              </div>
            ))}
          </section>
        )}

        {resume.skills.length > 0 && (
          <section data-section="skills" className="mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tight text-black mb-3 leading-none">Skills</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {resume.skills.map((s, i) => (
                <span key={i} className="text-xs text-gray-700 font-medium">{s}</span>
              ))}
            </div>
          </section>
        )}

        <ExtraSections resume={resume} variant="clean" />
      </div>
    </div>
  );
});
