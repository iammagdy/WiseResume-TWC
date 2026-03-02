import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { ContactLinks } from './shared/ContactLinks';
import { formatDisplayDate } from '@/lib/dateUtils';

interface TemplateProps { resume: ResumeData; }

export const FederalTemplate = memo(function FederalTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-8 font-sans text-sm leading-relaxed">
      <header className="bg-gray-100 p-4 rounded mb-6">
        <h1 className="text-xl font-bold text-gray-900">{resume.contactInfo.fullName || 'Your Name'}</h1>
        <ContactLinks contact={resume.contactInfo} className="text-gray-600 text-xs mt-1" iconSize={3} />
      </header>
      {resume.summary && (
        <section data-section="summary" className="mb-5">
          <h2 className="text-sm font-bold text-gray-900 uppercase border-b border-gray-400 pb-1 mb-2">Objective</h2>
          <p className="text-gray-700">{resume.summary}</p>
        </section>
      )}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-5">
          <h2 className="text-sm font-bold text-gray-900 uppercase border-b border-gray-400 pb-1 mb-3">Work Experience</h2>
          <div className="space-y-4">
            {resume.experience.map(exp => (
              <div key={exp.id} data-break-avoid>
                <h3 className="font-bold text-gray-900">{exp.position}</h3>
                <p className="text-gray-600 text-xs">{exp.company} | {formatDisplayDate(exp.startDate)} – {exp.current ? 'Present' : formatDisplayDate(exp.endDate)}</p>
                {exp.description && <p data-break-child className="text-gray-700 mt-1 text-xs">{exp.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
      {resume.education.length > 0 && (
        <section data-section="education" className="mb-5">
          <h2 className="text-sm font-bold text-gray-900 uppercase border-b border-gray-400 pb-1 mb-3">Education</h2>
          {resume.education.map(edu => (<div key={edu.id} data-break-avoid className="mb-2"><h3 className="font-bold text-gray-900 text-xs">{edu.degree} {edu.field && `in ${edu.field}`}</h3><p className="text-gray-600 text-xs">{edu.institution} — {formatDisplayDate(edu.endDate)}</p>{edu.description && <p className="text-gray-600 text-xs mt-0.5">{edu.description}</p>}</div>))}
        </section>
      )}
      {resume.skills.length > 0 && (
        <section data-section="skills">
          <h2 className="text-sm font-bold text-gray-900 uppercase border-b border-gray-400 pb-1 mb-2">Skills & Qualifications</h2>
          <ul className="grid grid-cols-2 gap-1 text-xs text-gray-700">{resume.skills.map((s, i) => <li key={i}>• {s}</li>)}</ul>
        </section>
      )}
      <ExtraSections resume={resume} variant="federal" />
    </div>
  );
});
