import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { formatDisplayDate } from '@/lib/dateUtils';

interface TemplateProps { resume: ResumeData; }

export const DataScienceTemplate = memo(function DataScienceTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-8 font-mono text-sm leading-relaxed">
      <header className="mb-6 border-b border-teal-500 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">{resume.contactInfo.fullName || 'Your Name'}</h1>
        <div className="flex flex-wrap gap-x-4 text-gray-600 text-xs mt-2">
          {resume.contactInfo.email && <span>{resume.contactInfo.email}</span>}
          {resume.contactInfo.phone && <span>{resume.contactInfo.phone}</span>}
          {resume.contactInfo.location && <span>{resume.contactInfo.location}</span>}
        </div>
      </header>
      {resume.summary && (
        <section data-section="summary" className="mb-5">
          <h2 className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-2">// summary</h2>
          <p className="text-gray-700">{resume.summary}</p>
        </section>
      )}
      {resume.skills.length > 0 && (
        <section data-section="skills" className="mb-5">
          <h2 className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-2">// tech_stack</h2>
          <div className="flex flex-wrap gap-2">{resume.skills.map((s, i) => <span key={i} className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded text-xs">{s}</span>)}</div>
        </section>
      )}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-5">
          <h2 className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-3">// experience</h2>
          <div className="space-y-4">
            {resume.experience.map(exp => (
              <div key={exp.id} data-break-avoid>
                <div className="flex justify-between"><h3 className="font-bold text-gray-900">{exp.position}</h3><span className="text-xs text-gray-400">{formatDisplayDate(exp.startDate)} → {exp.current ? 'present' : formatDisplayDate(exp.endDate)}</span></div>
                <p className="text-teal-600 text-xs">{exp.company}</p>
                {exp.description && <p className="text-gray-700 mt-1 text-xs">{exp.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
      {resume.education.length > 0 && (
        <section data-section="education">
          <h2 className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-3">// education</h2>
          {resume.education.map(edu => (<div key={edu.id} data-break-avoid className="mb-2"><h3 className="font-bold text-gray-900 text-xs">{edu.degree} {edu.field && `| ${edu.field}`}</h3><p className="text-gray-600 text-xs">{edu.institution} — {formatDisplayDate(edu.endDate)}</p></div>))}
        </section>
      )}
      <ExtraSections resume={resume} />
    </div>
  );
});
