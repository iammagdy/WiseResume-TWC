import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { formatDisplayDate } from '@/lib/dateUtils';

interface TemplateProps {
  resume: ResumeData;
}

export const ProfessionalTemplate = memo(function ProfessionalTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-8 font-sans text-sm">
      {/* Header */}
      <header className="bg-gray-900 text-white -m-8 mb-6 p-6">
        <h1 className="text-2xl font-bold mb-2">
          {resume.contactInfo.fullName || 'Your Name'}
        </h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-300 text-xs">
          {resume.contactInfo.email && <span>{resume.contactInfo.email}</span>}
          {resume.contactInfo.phone && <span>{resume.contactInfo.phone}</span>}
          {resume.contactInfo.location && <span>{resume.contactInfo.location}</span>}
          {resume.contactInfo.linkedin && <span>{resume.contactInfo.linkedin}</span>}
        </div>
      </header>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="w-1/3 space-y-5">
          {/* Skills */}
          {resume.skills.length > 0 && (
            <section data-section="skills">
              <h2 className="text-sm font-bold text-gray-900 mb-2 pb-1 border-b-2 border-gray-900">
                SKILLS
              </h2>
              <ul className="space-y-1">
                {resume.skills.map((skill, i) => (
                  <li key={i} className="text-xs text-gray-700">• {skill}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Education */}
          {resume.education.length > 0 && (
            <section data-section="education">
              <h2 className="text-sm font-bold text-gray-900 mb-2 pb-1 border-b-2 border-gray-900">
                EDUCATION
              </h2>
              <div className="space-y-3">
                {resume.education.map((edu) => (
                  <div key={edu.id} data-break-avoid>
                    <p className="font-semibold text-gray-900 text-xs">{edu.degree}</p>
                    <p className="text-gray-600 text-xs">{edu.field}</p>
                    <p className="text-gray-500 text-xs">{edu.institution}</p>
                    <p className="text-gray-400 text-xs">{formatDisplayDate(edu.endDate)}</p>
                    {edu.description && <p className="text-gray-500 text-xs mt-0.5">{edu.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1">
          {/* Summary */}
          {resume.summary && (
            <section data-section="summary" className="mb-5">
              <h2 className="text-sm font-bold text-gray-900 mb-2 pb-1 border-b-2 border-gray-900">
                PROFILE
              </h2>
              <p className="text-gray-700 text-xs leading-relaxed">{resume.summary}</p>
            </section>
          )}

          {/* Experience */}
          {resume.experience.length > 0 && (
            <section data-section="experience">
              <h2 className="text-sm font-bold text-gray-900 mb-3 pb-1 border-b-2 border-gray-900">
                PROFESSIONAL EXPERIENCE
              </h2>
              <div className="space-y-4">
                {resume.experience.map((exp) => (
                  <div key={exp.id} data-break-avoid>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">{exp.position}</h3>
                        <p className="text-gray-600 text-xs">{exp.company}</p>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDisplayDate(exp.startDate)} - {exp.current ? 'Present' : formatDisplayDate(exp.endDate)}
                      </span>
                    </div>
                    {exp.description && (
                      <p data-break-child className="text-gray-700 mt-1 text-xs">{exp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
      <ExtraSections resume={resume} />
    </div>
  );
});
