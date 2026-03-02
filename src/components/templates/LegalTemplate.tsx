import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { formatDisplayDate } from '@/lib/dateUtils';

interface TemplateProps { resume: ResumeData; }

export const LegalTemplate = memo(function LegalTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-8 font-serif text-sm leading-relaxed">
      <header className="text-center mb-6 border-b-2 border-gray-900 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 uppercase">{resume.contactInfo.fullName || 'Your Name'}</h1>
        <div className="flex justify-center gap-x-3 text-gray-600 text-xs mt-2">
          {resume.contactInfo.email && <span>{resume.contactInfo.email}</span>}
          {resume.contactInfo.email2 && <span>| {resume.contactInfo.email2}</span>}
          {resume.contactInfo.phone && <span>| {resume.contactInfo.phone}</span>}
          {resume.contactInfo.location && <span>| {resume.contactInfo.location}</span>}
        </div>
      </header>
      {resume.summary && (
        <section data-section="summary" className="mb-5">
          <h2 className="text-sm font-bold text-gray-900 uppercase mb-2">Professional Summary</h2>
          <p className="text-gray-700 text-justify">{resume.summary}</p>
        </section>
      )}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-5">
          <h2 className="text-sm font-bold text-gray-900 uppercase mb-3">Legal Experience</h2>
          <div className="space-y-4">
            {resume.experience.map(exp => (
              <div key={exp.id} data-break-avoid>
                <h3 className="font-bold text-gray-900">{exp.position}</h3>
                <p className="text-gray-600 text-xs italic">{exp.company}, {formatDisplayDate(exp.startDate)} – {exp.current ? 'Present' : formatDisplayDate(exp.endDate)}</p>
                {exp.description && <p data-break-child className="text-gray-700 mt-1 text-xs text-justify">{exp.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
      {resume.education.length > 0 && (
        <section data-section="education" className="mb-5">
          <h2 className="text-sm font-bold text-gray-900 uppercase mb-3">Education</h2>
          {resume.education.map(edu => (<div key={edu.id} data-break-avoid className="mb-2"><h3 className="font-bold text-gray-900 text-xs">{edu.institution}</h3><p className="text-gray-600 text-xs italic">{edu.degree} {edu.field && `in ${edu.field}`}, {formatDisplayDate(edu.endDate)}</p>{edu.description && <p className="text-gray-600 text-xs mt-0.5">{edu.description}</p>}</div>))}
        </section>
      )}
      {resume.skills.length > 0 && (
        <section data-section="skills">
          <h2 className="text-sm font-bold text-gray-900 uppercase mb-2">Areas of Practice</h2>
          <p className="text-xs text-gray-700">{resume.skills.join(' • ')}</p>
        </section>
      )}
      <ExtraSections resume={resume} variant="legal" />
    </div>
  );
});
