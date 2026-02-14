import { memo } from 'react';
import { ResumeData } from '@/types/resume';

interface TemplateProps { resume: ResumeData; }

export const MarketingTemplate = memo(function MarketingTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-8 font-sans text-sm leading-relaxed">
      <header className="mb-6">
        <h1 className="text-3xl font-black text-rose-600">{resume.contactInfo.fullName || 'Your Name'}</h1>
        <div className="h-1.5 w-24 bg-gradient-to-r from-rose-500 to-orange-400 rounded-full mt-2 mb-3" />
        <div className="flex flex-wrap gap-x-4 text-gray-600 text-xs">
          {resume.contactInfo.email && <span>{resume.contactInfo.email}</span>}
          {resume.contactInfo.phone && <span>{resume.contactInfo.phone}</span>}
          {resume.contactInfo.location && <span>{resume.contactInfo.location}</span>}
        </div>
      </header>
      {resume.summary && (
        <section data-section="summary" className="mb-6">
          <h2 className="text-lg font-bold text-rose-600 mb-2">About Me</h2>
          <p className="text-gray-700">{resume.summary}</p>
        </section>
      )}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-6">
          <h2 className="text-lg font-bold text-rose-600 mb-3">Experience</h2>
          <div className="space-y-4">
            {resume.experience.map(exp => (
              <div key={exp.id} data-break-avoid className="border-l-3 border-rose-300 pl-4">
                <h3 className="font-bold text-gray-900">{exp.position}</h3>
                <p className="text-gray-600 text-xs">{exp.company} · {exp.startDate} – {exp.current ? 'Present' : exp.endDate}</p>
                {exp.description && <p className="text-gray-700 mt-1 text-xs">{exp.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
      {resume.education.length > 0 && (
        <section data-section="education" className="mb-6">
          <h2 className="text-lg font-bold text-rose-600 mb-3">Education</h2>
          {resume.education.map(edu => (<div key={edu.id} data-break-avoid className="mb-2"><h3 className="font-bold text-gray-900 text-xs">{edu.degree} {edu.field && `in ${edu.field}`}</h3><p className="text-gray-600 text-xs">{edu.institution} — {edu.endDate}</p></div>))}
        </section>
      )}
      {resume.skills.length > 0 && (
        <section data-section="skills">
          <h2 className="text-lg font-bold text-rose-600 mb-2">Skills</h2>
          <div className="flex flex-wrap gap-2">{resume.skills.map((s, i) => <span key={i} className="px-2 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-medium">{s}</span>)}</div>
        </section>
      )}
    </div>
  );
});
