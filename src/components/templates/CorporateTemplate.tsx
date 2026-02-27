import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { formatDisplayDate } from '@/lib/dateUtils';

interface TemplateProps { resume: ResumeData; }

export const CorporateTemplate = memo(function CorporateTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-8 font-serif text-sm leading-relaxed">
      <header className="border-b-4 border-gray-800 pb-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{resume.contactInfo.fullName || 'Your Name'}</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-600 text-xs mt-2">
          {resume.contactInfo.email && <span>{resume.contactInfo.email}</span>}
          {resume.contactInfo.email2 && <span>{resume.contactInfo.email2}</span>}
          {resume.contactInfo.phone && <span>{resume.contactInfo.phone}</span>}
          {resume.contactInfo.location && <span>{resume.contactInfo.location}</span>}
        </div>
      </header>
      {resume.summary && (
        <section data-section="summary" className="mb-6">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest border-b border-gray-300 pb-1 mb-3">Executive Summary</h2>
          <p className="text-gray-700">{resume.summary}</p>
        </section>
      )}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-6">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest border-b border-gray-300 pb-1 mb-3">Professional Experience</h2>
          <div className="space-y-4">
            {resume.experience.map(exp => (
              <div key={exp.id} data-break-avoid>
                <div className="flex justify-between"><div><h3 className="font-bold text-gray-900">{exp.position}</h3><p className="text-gray-600 italic">{exp.company}</p></div><span className="text-xs text-gray-500">{formatDisplayDate(exp.startDate)} – {exp.current ? 'Present' : formatDisplayDate(exp.endDate)}</span></div>
                {exp.description && <p data-break-child className="text-gray-700 mt-1 text-xs">{exp.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
      {resume.education.length > 0 && (
        <section data-section="education" className="mb-6">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest border-b border-gray-300 pb-1 mb-3">Education</h2>
          {resume.education.map(edu => (
            <div key={edu.id} data-break-avoid className="flex justify-between mb-2"><div><h3 className="font-bold text-gray-900">{edu.degree} {edu.field && `in ${edu.field}`}</h3><p className="text-gray-600">{edu.institution}</p>{edu.description && <p className="text-gray-600 text-xs mt-0.5">{edu.description}</p>}</div><span className="text-xs text-gray-500">{formatDisplayDate(edu.endDate)}</span></div>
          ))}
        </section>
      )}
      {resume.skills.length > 0 && (
        <section data-section="skills">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest border-b border-gray-300 pb-1 mb-3">Core Competencies</h2>
          <div className="grid grid-cols-3 gap-1 text-xs text-gray-700">{resume.skills.map((s, i) => <span key={i}>• {s}</span>)}</div>
        </section>
      )}
      <ExtraSections resume={resume} />
    </div>
  );
});
