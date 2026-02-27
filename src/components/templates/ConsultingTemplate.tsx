import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { formatDisplayDate } from '@/lib/dateUtils';

interface TemplateProps { resume: ResumeData; }

export const ConsultingTemplate = memo(function ConsultingTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-8 font-sans text-sm leading-relaxed">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{resume.contactInfo.fullName || 'Your Name'}</h1>
        <div className="h-1 w-16 bg-blue-700 mt-2 mb-3" />
        <div className="flex flex-wrap gap-x-4 text-gray-600 text-xs">
          {resume.contactInfo.email && <span>{resume.contactInfo.email}</span>}
          {resume.contactInfo.email2 && <span>{resume.contactInfo.email2}</span>}
          {resume.contactInfo.phone && <span>{resume.contactInfo.phone}</span>}
          {resume.contactInfo.location && <span>{resume.contactInfo.location}</span>}
        </div>
      </header>
      {resume.summary && (
        <section data-section="summary" className="mb-5">
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-2">Summary</h2>
          <p className="text-gray-700">{resume.summary}</p>
        </section>
      )}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-5">
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-3">Experience</h2>
          <div className="space-y-4">
            {resume.experience.map(exp => (
              <div key={exp.id} data-break-avoid>
                <div className="flex justify-between items-start"><div><h3 className="font-bold text-gray-900">{exp.position}</h3><p className="text-gray-600 text-xs">{exp.company}</p></div><span className="text-xs text-gray-500">{formatDisplayDate(exp.startDate)} – {exp.current ? 'Present' : formatDisplayDate(exp.endDate)}</span></div>
                {exp.description && <p data-break-child className="text-gray-700 mt-1 text-xs">{exp.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
      {resume.education.length > 0 && (
        <section data-section="education" className="mb-5">
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-3">Education</h2>
          {resume.education.map(edu => (<div key={edu.id} data-break-avoid className="flex justify-between mb-2"><div><h3 className="font-bold text-gray-900 text-xs">{edu.degree} {edu.field && `in ${edu.field}`}</h3><p className="text-gray-600 text-xs">{edu.institution}</p>{edu.description && <p className="text-gray-600 text-xs mt-0.5">{edu.description}</p>}</div><span className="text-xs text-gray-500">{formatDisplayDate(edu.endDate)}</span></div>))}
        </section>
      )}
      {resume.skills.length > 0 && (
        <section data-section="skills">
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-2">Key Skills</h2>
          <div className="flex flex-wrap gap-2">{resume.skills.map((s, i) => <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded text-xs">{s}</span>)}</div>
        </section>
      )}
      <ExtraSections resume={resume} />
    </div>
  );
});
