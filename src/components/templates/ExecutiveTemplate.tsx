import { memo } from 'react';
import { formatDegreeAndField } from '@/lib/educationFormat';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { ContactLinks } from './shared/ContactLinks';
import { formatDateRangeDisplay } from '@/lib/dateUtils';

interface TemplateProps {
  resume: ResumeData;
}

export const ExecutiveTemplate = memo(function ExecutiveTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-10 font-serif text-sm leading-relaxed bg-white">
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
          <ContactLinks contact={resume.contactInfo} className="text-gray-500 text-xs" iconSize={3} separator="|" />
        </div>
      </header>

      {resume.summary && (
        <section data-section="summary" className="mb-8">
          <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-[0.2em] mb-3">
            Executive Summary
          </h2>
          <p data-break-child className="text-gray-700 leading-relaxed italic">{resume.summary}</p>
        </section>
      )}

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
                    {formatDateRangeDisplay(exp.startDate, exp.endDate, exp.current, { separator: '—' })}
                  </span>
                </div>
                <p className="text-amber-700 text-sm mb-2">{exp.company}{exp.account && ` · ${exp.account}`}</p>
                {exp.description && (
                  <p data-break-child className="text-gray-600 text-xs">{exp.description}</p>
                )}
                {exp.achievements && exp.achievements.length > 0 && (
                  <ul data-break-child className="mt-2 space-y-1">
                    {exp.achievements.map((a, i) => (
                      <li key={i} data-break-child className="text-gray-700 text-xs flex items-start gap-2">
                        <span className="text-amber-600 mt-0.5">-</span>
                        {a}
                      </li>
                    ))}
                  </ul>
                )}
                {exp.responsibilities && exp.responsibilities.length > 0 && (
                  <ul data-break-child className="mt-2 space-y-1">
                    {exp.responsibilities.map((r, i) => (
                      <li key={i} data-break-child className="text-gray-700 text-xs flex items-start gap-2">
                        <span className="text-amber-600 mt-0.5">-</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-8">
        {resume.education.length > 0 && (
          <section data-section="education">
            <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-[0.2em] mb-3">
              Education
            </h2>
            <div className="space-y-2">
              {resume.education.map((edu) => (
                <div key={edu.id} data-break-avoid>
                  <p className="font-medium text-gray-900">
                    {formatDegreeAndField(edu.degree, edu.field)}
                  </p>
                  <p className="text-gray-500 text-xs">{edu.institution}{formatDateRangeDisplay('', edu.endDate, false) && `, ${formatDateRangeDisplay('', edu.endDate, false)}`}</p>
                  {edu.description && <p className="text-gray-500 text-xs mt-0.5">{edu.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {resume.skills.length > 0 && (
          <section data-section="skills">
            <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-[0.2em] mb-3">
              Core Competencies
            </h2>
            <p className="text-gray-700 text-xs">{resume.skills.join(', ')}</p>
          </section>
        )}
      </div>
      <ExtraSections resume={resume} variant="executive" />
    </div>
  );
});
