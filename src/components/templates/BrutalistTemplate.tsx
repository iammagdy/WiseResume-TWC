import { memo } from 'react';
import { formatDegreeAndField } from '@/lib/educationFormat';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { ContactLinks } from './shared/ContactLinks';
import { formatDisplayDate, formatDateRangeDisplay } from '@/lib/dateUtils';

interface TemplateProps { resume: ResumeData; }

export const BrutalistTemplate = memo(function BrutalistTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-8 font-sans text-sm leading-relaxed bg-white">
      <header className="mb-7 border-4 border-black p-5" style={{ boxShadow: '6px 6px 0 #000' }}>
        <h1 className="text-3xl font-black text-black uppercase tracking-tight leading-none">{resume.contactInfo.fullName || 'Your Name'}</h1>
        <div className="mt-3 border-t-2 border-black pt-3">
          <ContactLinks contact={resume.contactInfo} className="text-gray-700 text-xs" iconSize={3} />
        </div>
      </header>

      {resume.summary && (
        <section data-section="summary" className="mb-5">
          <h2 className="text-xs font-black text-black uppercase tracking-widest border-b-2 border-black pb-1 mb-2">Profile</h2>
          <p data-break-child className="text-gray-800">{resume.summary}</p>
        </section>
      )}

      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-5">
          <h2 className="text-xs font-black text-black uppercase tracking-widest border-b-2 border-black pb-1 mb-3">Experience</h2>
          <div className="space-y-4">
            {resume.experience.map(exp => {
              const range = formatDateRangeDisplay(exp.startDate, exp.endDate, exp.current);
              return (
                <div key={exp.id} data-break-avoid className="pl-3 border-l-4 border-black">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-black">{exp.position}</h3>
                      <p className="text-gray-600 text-xs font-medium">{exp.company}{exp.account && ` · ${exp.account}`}</p>
                    </div>
                    {range && <span className="text-xs text-gray-500 font-mono whitespace-nowrap ml-2">{range}</span>}
                  </div>
                  {exp.description && <p data-break-child className="text-gray-700 mt-1.5 text-xs">{exp.description}</p>}
                  {exp.achievements && exp.achievements.length > 0 && (
                    <ul data-break-child className="mt-1.5 space-y-0.5">
                      {exp.achievements.map((a, i) => (
                        <li key={i} data-break-child className="text-gray-700 text-xs pl-3 relative before:content-['—'] before:absolute before:left-0 before:font-bold">{a}</li>
                      ))}
                    </ul>
                  )}
                  {exp.responsibilities && exp.responsibilities.length > 0 && (
                    <ul data-break-child className="mt-1.5 space-y-0.5">
                      {exp.responsibilities.map((r, i) => (
                        <li key={i} data-break-child className="text-gray-700 text-xs pl-3 relative before:content-['—'] before:absolute before:left-0 before:font-bold">{r}</li>
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
        <section data-section="education" className="mb-5">
          <h2 className="text-xs font-black text-black uppercase tracking-widest border-b-2 border-black pb-1 mb-3">Education</h2>
          {resume.education.map(edu => (
            <div key={edu.id} data-break-avoid className="flex justify-between mb-2">
              <div>
                <h3 className="font-bold text-black text-xs">{formatDegreeAndField(edu.degree, edu.field)}</h3>
                <p className="text-gray-600 text-xs">{edu.institution}</p>
                {edu.description && <p className="text-gray-600 text-xs mt-0.5">{edu.description}</p>}
              </div>
              <span className="text-xs text-gray-500 font-mono whitespace-nowrap ml-2">{formatDateRangeDisplay(edu.startDate, edu.endDate, edu.endDate === 'Present')}</span>
            </div>
          ))}
        </section>
      )}

      {resume.skills.length > 0 && (
        <section data-section="skills">
          <h2 className="text-xs font-black text-black uppercase tracking-widest border-b-2 border-black pb-1 mb-3">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {resume.skills.map((s, i) => (
              <span key={i} className="px-2 py-1 text-xs font-bold border-2 border-black bg-white" style={{ boxShadow: '2px 2px 0 #000' }}>{s}</span>
            ))}
          </div>
        </section>
      )}

      <ExtraSections resume={resume} variant="clean" />
    </div>
  );
});
