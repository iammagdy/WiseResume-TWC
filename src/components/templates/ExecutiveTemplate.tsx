import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { ContactLinks } from './shared/ContactLinks';
import { formatDisplayDate } from '@/lib/dateUtils';

interface TemplateProps {
  resume: ResumeData;
}

export const ExecutiveTemplate = memo(function ExecutiveTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-10 font-serif text-sm leading-relaxed bg-white">
      {/* Elegant Header */}
      <header className="text-center mb-8 pb-6 border-b border-amber-600">
        <h1 className="text-3xl font-light tracking-wide text-gray-900 mb-2">
          {resume.contactInfo.fullName?.toUpperCase() || 'YOUR NAME'}
        </h1>
        {resume.experience[0]?.position && (
          <p className="text-amber-700 font-medium tracking-wider uppercase text-sm mb-4">
            {resume.experience[0].position}
          </p>
        )}
        <div className="flex justify-center">
          <ContactLinks contact={resume.contactInfo} className="text-gray-500 text-xs" iconSize={3} separator="•" />
        </div>
      </header>

      {/* Executive Summary */}
      {resume.summary && (
        <section data-section="summary" className="mb-8">
          <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-[0.2em] mb-3">
            Executive Summary
          </h2>
          <p className="text-gray-700 leading-relaxed italic">{resume.summary}</p>
        </section>
      )}

      {/* Key Achievements highlight - using first experience's achievements */}
      {resume.experience[0]?.achievements && resume.experience[0].achievements.length > 0 && (
        <section data-break-avoid className="mb-8 bg-amber-50 p-4 border-l-4 border-amber-600">
          <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-[0.2em] mb-3">
            Key Achievements
          </h2>
          <ul className="space-y-2">
            {resume.experience[0].achievements.slice(0, 3).map((achievement, i) => (
              <li key={i} className="text-gray-700 flex items-start gap-2">
                <span className="text-amber-600 mt-1">◆</span>
                {achievement}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Professional Experience */}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-8">
          <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-[0.2em] mb-4">
            Professional Experience
          </h2>
          <div className="space-y-5">
            {resume.experience.map((exp) => (
              <div key={exp.id} data-break-avoid>
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-semibold text-gray-900">{exp.position}</h3>
                  <span className="text-xs text-gray-500">
                    {formatDisplayDate(exp.startDate)} — {exp.current ? 'Present' : formatDisplayDate(exp.endDate)}
                  </span>
                </div>
                <p className="text-amber-700 text-sm mb-2">{exp.company}</p>
                {exp.description && (
                  <p data-break-child className="text-gray-600 text-xs">{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Two Column Footer: Education & Skills */}
      <div className="grid grid-cols-2 gap-8">
        {/* Education */}
        {resume.education.length > 0 && (
          <section data-section="education">
            <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-[0.2em] mb-3">
              Education
            </h2>
            <div className="space-y-2">
              {resume.education.map((edu) => (
                <div key={edu.id} data-break-avoid>
                  <p className="font-medium text-gray-900">
                    {edu.degree} {edu.field && `in ${edu.field}`}
                  </p>
                  <p className="text-gray-500 text-xs">{edu.institution}, {formatDisplayDate(edu.endDate)}</p>
                  {edu.description && <p className="text-gray-500 text-xs mt-0.5">{edu.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Core Competencies */}
        {resume.skills.length > 0 && (
          <section data-section="skills">
            <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-[0.2em] mb-3">
              Core Competencies
            </h2>
            <div className="flex flex-wrap gap-1">
              {resume.skills.map((skill, i) => (
                <span
                  key={i}
                  className="text-gray-700 text-xs after:content-['•'] after:mx-1 after:text-amber-600 last:after:content-none"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
      <ExtraSections resume={resume} variant="executive" />
    </div>
  );
});
