import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { formatDisplayDate } from '@/lib/dateUtils';

interface TemplateProps { resume: ResumeData; }

export const MonoTemplate = memo(function MonoTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-8 font-sans text-sm leading-relaxed">
      <header className="mb-6">
        <h1 className="text-xl font-medium text-gray-900">{resume.contactInfo.fullName || 'Your Name'}</h1>
        <div className="flex flex-wrap gap-x-3 text-gray-500 text-xs mt-1.5">
          {resume.contactInfo.email && <span>{resume.contactInfo.email}</span>}
          {resume.contactInfo.phone && <span>{resume.contactInfo.phone}</span>}
          {resume.contactInfo.location && <span>{resume.contactInfo.location}</span>}
        </div>
        <div className="w-full h-px bg-gray-200 mt-4" />
      </header>
      {resume.summary && (
        <section data-section="summary" className="mb-5">
          <p className="text-gray-700">{resume.summary}</p>
        </section>
      )}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-5">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-3">Experience</h2>
          <div className="space-y-4">
            {resume.experience.map(exp => (
              <div key={exp.id} data-break-avoid>
                <h3 className="font-medium text-gray-900">{exp.position} <span className="font-normal text-gray-500">— {exp.company}</span></h3>
                <p className="text-xs text-gray-400">{formatDisplayDate(exp.startDate)} – {exp.current ? 'Present' : formatDisplayDate(exp.endDate)}</p>
                {exp.description && <p className="text-gray-600 mt-1 text-xs">{exp.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
      {resume.education.length > 0 && (
        <section data-section="education" className="mb-5">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-3">Education</h2>
          {resume.education.map(edu => (<div key={edu.id} data-break-avoid className="mb-2"><h3 className="font-medium text-gray-900 text-xs">{edu.degree} {edu.field && `in ${edu.field}`} <span className="font-normal text-gray-500">— {edu.institution}</span></h3><p className="text-xs text-gray-400">{formatDisplayDate(edu.endDate)}</p></div>))}
        </section>
      )}
      {resume.skills.length > 0 && (
        <section data-section="skills">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-2">Skills</h2>
          <p className="text-xs text-gray-700">{resume.skills.join(' / ')}</p>
        </section>
      )}
      <ExtraSections resume={resume} />
    </div>
  );
});
