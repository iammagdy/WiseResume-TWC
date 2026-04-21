import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { ContactLinks } from './shared/ContactLinks';
import { formatDisplayDate } from '@/lib/dateUtils';

interface TemplateProps { resume: ResumeData; }

export const DesignerTemplate = memo(function DesignerTemplate({ resume }: TemplateProps) {
  return (
    <div className="min-h-full font-sans text-sm leading-relaxed">
      <header className="bg-gray-900 text-white p-6">
        <div className="flex items-center gap-4">
          {resume.contactInfo.photoUrl && (
            <img src={resume.contactInfo.photoUrl} alt="User profile photo" crossOrigin="anonymous" className="w-20 h-20 rounded-full object-cover" />
          )}
          <div>
            <h1 className="text-lg font-bold leading-tight">{resume.contactInfo.fullName || 'Your Name'}</h1>
            <ContactLinks contact={resume.contactInfo} className="text-gray-300 text-xs mt-2" iconSize={2.5} />
          </div>
        </div>
      </header>

      <div className="p-6 space-y-5">
        {resume.summary && (
          <section data-section="summary">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-2">Profile</h2>
            <p data-break-child className="text-gray-700 text-xs">{resume.summary}</p>
          </section>
        )}
        {resume.experience.length > 0 && (
          <section data-section="experience">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3">Experience</h2>
            <div className="space-y-3">
              {resume.experience.map(exp => (
                <div key={exp.id} data-break-avoid>
                  <h3 className="font-bold text-gray-900 text-xs">{exp.position}</h3>
                  <p className="text-gray-500 text-xs">{exp.company} · {formatDisplayDate(exp.startDate)} – {exp.current ? 'Present' : formatDisplayDate(exp.endDate)}</p>
                  {exp.description && <p data-break-child className="text-gray-700 mt-1 text-xs">{exp.description}</p>}
                  {exp.achievements && exp.achievements.length > 0 && (
                    <ul data-break-child className="mt-1 space-y-0.5 list-none">
                      {exp.achievements.map((a, i) => (
                        <li key={i} data-break-child className="text-gray-700 text-xs pl-3 relative before:content-['-'] before:absolute before:left-0">{a}</li>
                      ))}
                    </ul>
                  )}
                  {exp.responsibilities && exp.responsibilities.length > 0 && (
                    <ul data-break-child className="mt-1 space-y-0.5 list-none">
                      {exp.responsibilities.map((r, i) => (
                        <li key={i} data-break-child className="text-gray-700 text-xs pl-3 relative before:content-['-'] before:absolute before:left-0">{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
        {resume.skills.length > 0 && (
          <section data-section="skills">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-2">Skills</h2>
            <div className="flex flex-wrap gap-1.5">
              {resume.skills.map((s, i) => <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 rounded">{s}</span>)}
            </div>
          </section>
        )}
        {resume.education.length > 0 && (
          <section data-section="education">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3">Education</h2>
            {resume.education.map(edu => (
              <div key={edu.id} data-break-avoid className="mb-2">
                <h3 className="font-bold text-gray-900 text-xs">{edu.degree} {edu.field && `in ${edu.field}`}</h3>
                <p className="text-gray-500 text-xs">{edu.institution} — {formatDisplayDate(edu.endDate)}</p>
                {edu.description && <p className="text-gray-500 text-xs mt-0.5">{edu.description}</p>}
              </div>
            ))}
          </section>
        )}
        <ExtraSections resume={resume} variant="designer" />
      </div>
    </div>
  );
});
