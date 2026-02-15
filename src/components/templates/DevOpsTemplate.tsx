import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';

interface TemplateProps { resume: ResumeData; }

export const DevOpsTemplate = memo(function DevOpsTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-8 font-mono text-sm leading-relaxed">
      <header className="bg-slate-900 text-white p-4 rounded-lg mb-6">
        <h1 className="text-xl font-bold">{resume.contactInfo.fullName || 'Your Name'}</h1>
        <div className="flex flex-wrap gap-x-3 text-slate-300 text-xs mt-1">
          {resume.contactInfo.email && <span>{resume.contactInfo.email}</span>}
          {resume.contactInfo.phone && <span>{resume.contactInfo.phone}</span>}
          {resume.contactInfo.location && <span>{resume.contactInfo.location}</span>}
        </div>
      </header>
      {resume.summary && (
        <section data-section="summary" className="mb-5">
          <h2 className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-2">$ whoami</h2>
          <p className="text-gray-700 bg-gray-50 p-3 rounded border-l-3 border-orange-400">{resume.summary}</p>
        </section>
      )}
      {resume.skills.length > 0 && (
        <section data-section="skills" className="mb-5">
          <h2 className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-2">$ tools --list</h2>
          <div className="flex flex-wrap gap-1.5">{resume.skills.map((s, i) => <span key={i} className="px-2 py-0.5 bg-orange-50 text-orange-800 border border-orange-200 rounded text-xs font-mono">{s}</span>)}</div>
        </section>
      )}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-5">
          <h2 className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-3">$ history</h2>
          <div className="space-y-4">
            {resume.experience.map(exp => (
              <div key={exp.id} data-break-avoid>
                <div className="flex justify-between"><h3 className="font-bold text-gray-900">{exp.position}</h3><span className="text-xs text-gray-400">{exp.startDate} – {exp.current ? 'now' : exp.endDate}</span></div>
                <p className="text-orange-600 text-xs">{exp.company}</p>
                {exp.description && <p className="text-gray-700 mt-1 text-xs">{exp.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
      {resume.education.length > 0 && (
        <section data-section="education">
          <h2 className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-3">$ certifications</h2>
          {resume.education.map(edu => (<div key={edu.id} data-break-avoid className="mb-2"><h3 className="font-bold text-gray-900 text-xs">{edu.degree} {edu.field && `in ${edu.field}`}</h3><p className="text-gray-600 text-xs">{edu.institution} — {edu.endDate}</p></div>))}
        </section>
      )}
      <ExtraSections resume={resume} />
    </div>
  );
});
