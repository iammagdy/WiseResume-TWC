import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { formatDisplayDate } from '@/lib/dateUtils';

interface CompactTemplateProps {
  resume: ResumeData;
}

export const CompactTemplate = memo(function CompactTemplate({ resume }: CompactTemplateProps) {
  const { contactInfo, summary, experience, education, skills, certifications } = resume;

  return (
    <div className="w-[612px] min-h-[792px] bg-white text-gray-900 p-6 font-sans text-xs leading-tight">
      {/* Header - Compact */}
      <header className="mb-3 pb-2 border-b border-gray-300">
        <h1 className="text-xl font-bold text-gray-900 mb-1">{contactInfo.fullName}</h1>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-gray-600 text-[10px]">
          {contactInfo.email && <span>{contactInfo.email}</span>}
          {contactInfo.email2 && <span>{contactInfo.email2}</span>}
          {contactInfo.phone && <span>{contactInfo.phone}</span>}
          {contactInfo.location && <span>{contactInfo.location}</span>}
          {contactInfo.linkedin && <span>{contactInfo.linkedin}</span>}
          {contactInfo.portfolio && <span>{contactInfo.portfolio}</span>}
        </div>
      </header>

      {/* Summary */}
      {summary && (
        <section className="mb-3" data-section="summary">
          <p className="text-gray-700 leading-snug">{summary}</p>
        </section>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <section className="mb-3" data-section="experience">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-1.5 pb-0.5 border-b border-gray-200">
            Experience
          </h2>
          <div className="space-y-2">
            {experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between items-baseline">
                  <h3 className="font-semibold text-gray-900">{exp.position}</h3>
                  <span className="text-gray-500 text-[10px]">
                    {formatDisplayDate(exp.startDate)} – {exp.current ? 'Present' : formatDisplayDate(exp.endDate)}
                  </span>
                </div>
                <p className="text-gray-600 text-[10px]">{exp.company}</p>
                {exp.description && (
                  <p data-break-child className="text-gray-600 mt-0.5">{exp.description}</p>
                )}
                {exp.achievements.length > 0 && (
                  <ul data-break-child className="mt-0.5 space-y-0.5">
                    {exp.achievements.map((achievement, idx) => (
                      <li key={idx} className="text-gray-700 pl-2 relative before:content-['•'] before:absolute before:left-0 before:text-gray-400">
                        {achievement}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {education.length > 0 && (
        <section className="mb-3" data-section="education">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-1.5 pb-0.5 border-b border-gray-200">
            Education
          </h2>
          <div className="space-y-1.5">
            {education.map((edu) => (
              <div key={edu.id} className="flex justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{edu.degree} in {edu.field}</h3>
                  <p className="text-gray-600 text-[10px]">{edu.institution}</p>
                  {edu.description && <p className="text-gray-600 text-[10px] mt-0.5">{edu.description}</p>}
                </div>
                <span className="text-gray-500 text-[10px]">{formatDisplayDate(edu.endDate)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <section className="mb-3" data-section="skills">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-1 pb-0.5 border-b border-gray-200">
            Skills
          </h2>
          <p className="text-gray-700">{skills.join(' • ')}</p>
        </section>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <section data-section="certifications">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-1 pb-0.5 border-b border-gray-200">
            Certifications
          </h2>
          <div className="space-y-0.5">
            {certifications.map((cert) => (
              <div key={cert.id} className="flex justify-between">
                <span className="text-gray-700">{cert.name} – {cert.issuer}</span>
                <span className="text-gray-500 text-[10px]">{cert.date}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <ExtraSections resume={resume} exclude={['certifications']} variant="compact" />
    </div>
  );
});
