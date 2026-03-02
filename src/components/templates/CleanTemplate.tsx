import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { formatDisplayDate } from '@/lib/dateUtils';

interface TemplateProps { resume: ResumeData; }

export const CleanTemplate = memo(function CleanTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-10 font-sans text-sm leading-relaxed">
      <header className="mb-8">
        <h1 className="text-2xl font-light text-gray-900 tracking-wide">{resume.contactInfo.fullName || 'Your Name'}</h1>
        <div className="flex flex-wrap gap-x-3 text-gray-400 text-xs mt-2">
          {resume.contactInfo.email && <span>{resume.contactInfo.email}</span>}
          {resume.contactInfo.email2 && <span>{resume.contactInfo.email2}</span>}
          {resume.contactInfo.phone && <span>{resume.contactInfo.phone}</span>}
          {resume.contactInfo.location && <span>{resume.contactInfo.location}</span>}
        </div>
      </header>
      {resume.summary && (
        <section data-section="summary" className="mb-8">
          <p className="text-gray-600">{resume.summary}</p>
        </section>
      )}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-8">
          <h2 className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.2em] mb-4">Experience</h2>
          <div className="space-y-5">
            {resume.experience.map(exp => (
              <div key={exp.id} data-break-avoid>
                <div className="flex justify-between items-baseline"><h3 className="font-medium text-gray-900">{exp.position}</h3><span className="text-xs text-gray-400">{formatDisplayDate(exp.startDate)} – {exp.current ? 'Present' : formatDisplayDate(exp.endDate)}</span></div>
                <p className="text-gray-500 text-xs">{exp.company}</p>
                {exp.description && <p data-break-child className="text-gray-600 mt-1 text-xs">{exp.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
      {resume.education.length > 0 && (
        <section data-section="education" className="mb-8">
          <h2 className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.2em] mb-4">Education</h2>
          {resume.education.map(edu => (<div key={edu.id} data-break-avoid className="flex justify-between mb-3"><div><h3 className="font-medium text-gray-900 text-xs">{edu.degree} {edu.field && `in ${edu.field}`}</h3><p className="text-gray-500 text-xs">{edu.institution}</p>{edu.description && <p className="text-gray-500 text-xs mt-0.5">{edu.description}</p>}</div><span className="text-xs text-gray-400">{formatDisplayDate(edu.endDate)}</span></div>))}
        </section>
      )}
      {resume.skills.length > 0 && (
        <section data-section="skills">
          <h2 className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.2em] mb-3">Skills</h2>
          <p className="text-xs text-gray-600">{resume.skills.join('  ·  ')}</p>
        </section>
      )}
      <ExtraSections resume={resume} variant="clean" />
    </div>
  );
});
