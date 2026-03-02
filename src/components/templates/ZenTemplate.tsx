import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { ContactLinks } from './shared/ContactLinks';
import { formatDisplayDate } from '@/lib/dateUtils';

interface TemplateProps { resume: ResumeData; }

export const ZenTemplate = memo(function ZenTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-10 font-serif text-sm leading-loose">
      <header className="text-center mb-10">
        <h1 className="text-2xl font-light text-gray-800 tracking-widest uppercase">{resume.contactInfo.fullName || 'Your Name'}</h1>
        <div className="w-8 h-px bg-gray-400 mx-auto mt-4 mb-3" />
        <div className="flex justify-center">
          <ContactLinks contact={resume.contactInfo} className="text-gray-500 text-xs" iconSize={3} />
        </div>
      </header>
      {resume.summary && (
        <section data-section="summary" className="mb-8 text-center max-w-md mx-auto">
          <p className="text-gray-600 italic">{resume.summary}</p>
        </section>
      )}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-8">
          <h2 className="text-center text-xs font-light text-gray-500 uppercase tracking-[0.3em] mb-5">Experience</h2>
          <div className="space-y-5">
            {resume.experience.map(exp => (
              <div key={exp.id} data-break-avoid className="text-center">
                <h3 className="font-medium text-gray-800">{exp.position}</h3>
                <p className="text-gray-500 text-xs">{exp.company} · {formatDisplayDate(exp.startDate)} – {exp.current ? 'Present' : formatDisplayDate(exp.endDate)}</p>
                {exp.description && <p data-break-child className="text-gray-600 mt-2 text-xs max-w-sm mx-auto">{exp.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
      {resume.education.length > 0 && (
        <section data-section="education" className="mb-8">
          <h2 className="text-center text-xs font-light text-gray-500 uppercase tracking-[0.3em] mb-5">Education</h2>
          <div className="text-center space-y-2">{resume.education.map(edu => (<div key={edu.id} data-break-avoid><span className="font-medium text-gray-800 text-xs">{edu.degree}</span> <span className="text-gray-500 text-xs">— {edu.institution}, {formatDisplayDate(edu.endDate)}</span>{edu.description && <p className="text-gray-600 text-xs mt-0.5">{edu.description}</p>}</div>))}</div>
        </section>
      )}
      {resume.skills.length > 0 && (
        <section data-section="skills">
          <h2 className="text-center text-xs font-light text-gray-500 uppercase tracking-[0.3em] mb-4">Skills</h2>
          <p className="text-center text-xs text-gray-600">{resume.skills.join('  ·  ')}</p>
        </section>
      )}
      <ExtraSections resume={resume} variant="zen" />
    </div>
  );
});
