import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { formatDisplayDate } from '@/lib/dateUtils';

interface TemplateProps {
  resume: ResumeData;
}

export const ClassicTemplate = memo(function ClassicTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-8 font-serif text-sm leading-relaxed">
      {/* Header */}
      <header className="text-center border-b border-gray-300 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {resume.contactInfo.fullName || 'Your Name'}
        </h1>
        <div className="flex justify-center flex-wrap gap-x-3 gap-y-1 text-gray-600 text-xs">
          {resume.contactInfo.email && <span>{resume.contactInfo.email}</span>}
          {resume.contactInfo.phone && <span>| {resume.contactInfo.phone}</span>}
          {resume.contactInfo.location && <span>| {resume.contactInfo.location}</span>}
        </div>
      </header>

      {/* Objective/Summary */}
      {resume.summary && (
        <section data-section="summary" className="mb-5">
          <h2 className="text-sm font-bold text-gray-900 mb-2 border-b border-gray-200 pb-1">
            PROFESSIONAL SUMMARY
          </h2>
          <p className="text-gray-700 text-xs">{resume.summary}</p>
        </section>
      )}

      {/* Experience */}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-5">
          <h2 className="text-sm font-bold text-gray-900 mb-3 border-b border-gray-200 pb-1">
            WORK EXPERIENCE
          </h2>
          <div className="space-y-4">
            {resume.experience.map((exp) => (
              <div key={exp.id} data-break-avoid>
                <div className="flex justify-between">
                  <strong className="text-gray-900">{exp.position}</strong>
                  <span className="text-xs text-gray-500">
                    {formatDisplayDate(exp.startDate)} - {exp.current ? 'Present' : formatDisplayDate(exp.endDate)}
                  </span>
                </div>
                <p className="text-gray-600 italic">{exp.company}</p>
                {exp.description && (
                  <p data-break-child className="text-gray-700 mt-1 text-xs">{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {resume.education.length > 0 && (
        <section data-section="education" className="mb-5">
          <h2 className="text-sm font-bold text-gray-900 mb-3 border-b border-gray-200 pb-1">
            EDUCATION
          </h2>
          <div className="space-y-2">
            {resume.education.map((edu) => (
              <div key={edu.id} data-break-avoid className="flex justify-between">
                <div>
                  <strong className="text-gray-900">{edu.institution}</strong>
                  <p className="text-gray-600 text-xs">
                    {edu.degree} {edu.field && `in ${edu.field}`}
                  </p>
                  {edu.description && <p className="text-gray-600 text-xs mt-0.5">{edu.description}</p>}
                </div>
                <span className="text-xs text-gray-500">{formatDisplayDate(edu.endDate)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {resume.skills.length > 0 && (
        <section data-section="skills">
          <h2 className="text-sm font-bold text-gray-900 mb-2 border-b border-gray-200 pb-1">
            SKILLS
          </h2>
          <p className="text-gray-700 text-xs">{resume.skills.join(' • ')}</p>
        </section>
      )}
      <ExtraSections resume={resume} />
    </div>
  );
});
