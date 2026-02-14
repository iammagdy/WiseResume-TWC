import { memo } from 'react';
import { ResumeData } from '@/types/resume';

interface TemplateProps { resume: ResumeData; }

export const InfographicTemplate = memo(function InfographicTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-8 font-sans text-sm leading-relaxed">
      <header className="text-center mb-6">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-violet-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xl font-bold mb-3">
          {(resume.contactInfo.fullName || 'U').charAt(0)}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{resume.contactInfo.fullName || 'Your Name'}</h1>
        <div className="flex justify-center gap-x-3 text-gray-500 text-xs mt-2">
          {resume.contactInfo.email && <span>{resume.contactInfo.email}</span>}
          {resume.contactInfo.phone && <span>{resume.contactInfo.phone}</span>}
          {resume.contactInfo.location && <span>{resume.contactInfo.location}</span>}
        </div>
      </header>
      {resume.summary && (
        <section data-section="summary" className="mb-6 text-center">
          <p className="text-gray-700 italic max-w-md mx-auto">{resume.summary}</p>
        </section>
      )}
      {resume.skills.length > 0 && (
        <section data-section="skills" className="mb-6">
          <h2 className="text-xs font-bold text-violet-600 uppercase tracking-widest text-center mb-3">Skills</h2>
          <div className="flex flex-wrap justify-center gap-2">{resume.skills.map((s, i) => <span key={i} className="px-3 py-1 bg-gradient-to-r from-violet-100 to-pink-100 text-violet-800 rounded-full text-xs font-medium">{s}</span>)}</div>
        </section>
      )}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-6">
          <h2 className="text-xs font-bold text-violet-600 uppercase tracking-widest text-center mb-3">Timeline</h2>
          <div className="relative border-l-2 border-violet-200 ml-4 space-y-4">
            {resume.experience.map(exp => (
              <div key={exp.id} data-break-avoid className="pl-6 relative">
                <div className="absolute -left-[9px] top-1 w-4 h-4 bg-violet-500 rounded-full border-2 border-white" />
                <h3 className="font-bold text-gray-900 text-xs">{exp.position}</h3>
                <p className="text-violet-600 text-[10px] font-medium">{exp.company} · {exp.startDate} – {exp.current ? 'Present' : exp.endDate}</p>
                {exp.description && <p className="text-gray-700 mt-1 text-[10px]">{exp.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
      {resume.education.length > 0 && (
        <section data-section="education">
          <h2 className="text-xs font-bold text-violet-600 uppercase tracking-widest text-center mb-3">Education</h2>
          <div className="text-center space-y-1">{resume.education.map(edu => (<div key={edu.id} data-break-avoid><span className="font-bold text-gray-900 text-xs">{edu.degree}</span> <span className="text-gray-500 text-xs">— {edu.institution} ({edu.endDate})</span></div>))}</div>
        </section>
      )}
    </div>
  );
});
