import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { formatDisplayDate } from '@/lib/dateUtils';

interface TemplateProps { resume: ResumeData; }

export const BankingTemplate = memo(function BankingTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-8 font-serif text-sm leading-relaxed">
      <header className="text-center border-b-2 border-gray-700 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-widest">{resume.contactInfo.fullName || 'Your Name'}</h1>
        <div className="flex justify-center gap-x-4 text-gray-600 text-xs mt-2">
          {resume.contactInfo.email && <span>{resume.contactInfo.email}</span>}
          {resume.contactInfo.email2 && <span>{resume.contactInfo.email2}</span>}
          {resume.contactInfo.phone && <span>{resume.contactInfo.phone}</span>}
          {resume.contactInfo.location && <span>{resume.contactInfo.location}</span>}
        </div>
      </header>
      {resume.summary && (
        <section data-section="summary" className="mb-5">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-2">Profile</h2>
          <p className="text-gray-700 border-l-2 border-gray-400 pl-3">{resume.summary}</p>
        </section>
      )}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-5">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3">Experience</h2>
          <div className="space-y-3">
            {resume.experience.map(exp => (
              <div key={exp.id} data-break-avoid>
                <div className="flex justify-between"><h3 className="font-bold text-gray-900 text-xs">{exp.position} — {exp.company}</h3><span className="text-xs text-gray-500">{formatDisplayDate(exp.startDate)} – {exp.current ? 'Present' : formatDisplayDate(exp.endDate)}</span></div>
                {exp.description && <p data-break-child className="text-gray-700 mt-1 text-xs">{exp.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
      {resume.education.length > 0 && (
        <section data-section="education" className="mb-5">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3">Education</h2>
          {resume.education.map(edu => (<div key={edu.id} data-break-avoid className="mb-2"><span className="font-bold text-gray-900 text-xs">{edu.degree} {edu.field && `— ${edu.field}`}</span>, <span className="text-gray-600 text-xs">{edu.institution}</span> <span className="text-gray-500 text-xs">({formatDisplayDate(edu.endDate)})</span>{edu.description && <p className="text-gray-600 text-xs mt-0.5">{edu.description}</p>}</div>))}
        </section>
      )}
      {resume.skills.length > 0 && (
        <section data-section="skills">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-2">Skills</h2>
          <p className="text-xs text-gray-700">{resume.skills.join(' · ')}</p>
        </section>
      )}
      <ExtraSections resume={resume} variant="banking" />
    </div>
  );
});