import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { formatDisplayDate } from '@/lib/dateUtils';

interface TemplateProps { resume: ResumeData; }

export const SwissTemplate = memo(function SwissTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-8 font-sans text-sm leading-relaxed">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 leading-none">{resume.contactInfo.fullName || 'Your Name'}</h1>
        <div className="w-full h-px bg-gray-900 mt-4 mb-3" />
        <div className="grid grid-cols-3 gap-2 text-gray-600 text-xs">
          {resume.contactInfo.email && <span>{resume.contactInfo.email}</span>}
          {resume.contactInfo.phone && <span>{resume.contactInfo.phone}</span>}
          {resume.contactInfo.location && <span>{resume.contactInfo.location}</span>}
        </div>
      </header>
      {resume.summary && (
        <section data-section="summary" className="mb-6">
          <div className="grid grid-cols-[100px_1fr] gap-4">
            <h2 className="text-xs font-bold text-gray-900 uppercase">Profile</h2>
            <p className="text-gray-700">{resume.summary}</p>
          </div>
        </section>
      )}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-6">
          <div className="grid grid-cols-[100px_1fr] gap-4">
            <h2 className="text-xs font-bold text-gray-900 uppercase">Experience</h2>
            <div className="space-y-4">
              {resume.experience.map(exp => (
                <div key={exp.id} data-break-avoid>
                  <div className="flex justify-between"><h3 className="font-bold text-gray-900">{exp.position}</h3><span className="text-xs text-gray-500">{formatDisplayDate(exp.startDate)} – {exp.current ? 'Present' : formatDisplayDate(exp.endDate)}</span></div>
                  <p className="text-gray-600 text-xs">{exp.company}</p>
                  {exp.description && <p data-break-child className="text-gray-700 mt-1 text-xs">{exp.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      {resume.education.length > 0 && (
        <section data-section="education" className="mb-6">
          <div className="grid grid-cols-[100px_1fr] gap-4">
            <h2 className="text-xs font-bold text-gray-900 uppercase">Education</h2>
            <div>{resume.education.map(edu => (<div key={edu.id} data-break-avoid className="mb-2"><h3 className="font-bold text-gray-900 text-xs">{edu.degree} {edu.field && `in ${edu.field}`}</h3><p className="text-gray-600 text-xs">{edu.institution} — {formatDisplayDate(edu.endDate)}</p>{edu.description && <p className="text-gray-600 text-xs mt-0.5">{edu.description}</p>}</div>))}</div>
          </div>
        </section>
      )}
      {resume.skills.length > 0 && (
        <section data-section="skills">
          <div className="grid grid-cols-[100px_1fr] gap-4">
            <h2 className="text-xs font-bold text-gray-900 uppercase">Skills</h2>
            <p className="text-xs text-gray-700">{resume.skills.join(', ')}</p>
          </div>
        </section>
      )}
      <ExtraSections resume={resume} />
    </div>
  );
});
