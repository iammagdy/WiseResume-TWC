import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { formatDisplayDate } from '@/lib/dateUtils';

interface TemplateProps {
  resume: ResumeData;
}

export const MinimalTemplate = memo(function MinimalTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-10 font-sans text-sm leading-loose">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-light text-gray-900 mb-3">
          {resume.contactInfo.fullName || 'Your Name'}
        </h1>
        <div className="flex flex-wrap gap-4 text-gray-500 text-xs">
          {resume.contactInfo.email && <span>{resume.contactInfo.email}</span>}
          {resume.contactInfo.email2 && <span>{resume.contactInfo.email2}</span>}
          {resume.contactInfo.phone && <span>{resume.contactInfo.phone}</span>}
          {resume.contactInfo.location && <span>{resume.contactInfo.location}</span>}
        </div>
      </header>

      {/* Summary */}
      {resume.summary && (
        <section data-section="summary" className="mb-8">
          <p className="text-gray-600 leading-relaxed">{resume.summary}</p>
        </section>
      )}

      {/* Experience */}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Experience
          </h2>
          <div className="space-y-5">
            {resume.experience.map((exp) => (
              <div key={exp.id} data-break-avoid>
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-medium text-gray-900">{exp.position}</h3>
                  <span className="text-xs text-gray-400">
                    {formatDisplayDate(exp.startDate)} — {exp.current ? 'Present' : formatDisplayDate(exp.endDate)}
                  </span>
                </div>
                <p className="text-gray-500 text-xs mb-1">{exp.company}</p>
                {exp.description && (
                  <p data-break-child className="text-gray-600 text-xs">{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {resume.education.length > 0 && (
        <section data-section="education" className="mb-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Education
          </h2>
          <div className="space-y-3">
            {resume.education.map((edu) => (
              <div key={edu.id} data-break-avoid>
                <h3 className="font-medium text-gray-900">
                  {edu.degree} {edu.field && `in ${edu.field}`}
                </h3>
                <p className="text-gray-500 text-xs">{edu.institution} • {formatDisplayDate(edu.endDate)}</p>
                {edu.description && <p className="text-gray-600 text-xs mt-0.5">{edu.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {resume.skills.length > 0 && (
        <section data-section="skills">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Skills
          </h2>
          <p className="text-gray-600 text-xs">{resume.skills.join(', ')}</p>
        </section>
      )}
      <ExtraSections resume={resume} variant="minimal" />
    </div>
  );
});
