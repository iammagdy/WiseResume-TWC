import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';

interface TemplateProps { resume: ResumeData; }

export const PortfolioTemplate = memo(function PortfolioTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-8 font-sans text-sm leading-relaxed">
      <header className="mb-6">
        <div className="flex items-end gap-4">
          <h1 className="text-3xl font-bold text-gray-900 leading-none">{resume.contactInfo.fullName || 'Your Name'}</h1>
          <div className="h-0.5 flex-1 bg-amber-500" />
        </div>
        <div className="flex flex-wrap gap-x-4 text-gray-500 text-xs mt-3">
          {resume.contactInfo.email && <span>{resume.contactInfo.email}</span>}
          {resume.contactInfo.phone && <span>{resume.contactInfo.phone}</span>}
          {resume.contactInfo.location && <span>{resume.contactInfo.location}</span>}
        </div>
      </header>
      {resume.summary && (
        <section data-section="summary" className="mb-6 bg-amber-50 p-4 rounded-lg">
          <p className="text-gray-700 italic">{resume.summary}</p>
        </section>
      )}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-6">
          <h2 className="text-sm font-bold text-amber-700 uppercase tracking-widest mb-3">Projects & Experience</h2>
          <div className="space-y-4">
            {resume.experience.map(exp => (
              <div key={exp.id} data-break-avoid className="border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-start"><h3 className="font-bold text-gray-900">{exp.position}</h3><span className="text-xs text-gray-500">{exp.startDate} – {exp.current ? 'Present' : exp.endDate}</span></div>
                <p className="text-amber-700 text-xs font-medium">{exp.company}</p>
                {exp.description && <p className="text-gray-700 mt-2 text-xs">{exp.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
      {resume.education.length > 0 && (
        <section data-section="education" className="mb-6">
          <h2 className="text-sm font-bold text-amber-700 uppercase tracking-widest mb-3">Education</h2>
          {resume.education.map(edu => (<div key={edu.id} data-break-avoid className="flex justify-between mb-2"><div><h3 className="font-bold text-gray-900 text-xs">{edu.degree} {edu.field && `in ${edu.field}`}</h3><p className="text-gray-600 text-xs">{edu.institution}</p></div><span className="text-xs text-gray-500">{edu.endDate}</span></div>))}
        </section>
      )}
      {resume.skills.length > 0 && (
        <section data-section="skills">
          <h2 className="text-sm font-bold text-amber-700 uppercase tracking-widest mb-2">Toolkit</h2>
          <div className="flex flex-wrap gap-2">{resume.skills.map((s, i) => <span key={i} className="px-2 py-1 border border-amber-300 text-amber-800 rounded text-xs">{s}</span>)}</div>
        </section>
      )}
      <ExtraSections resume={resume} />
    </div>
  );
});
