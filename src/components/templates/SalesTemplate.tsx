import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { formatDisplayDate } from '@/lib/dateUtils';

interface SalesTemplateProps {
  resume: ResumeData;
}

export const SalesTemplate = memo(function SalesTemplate({ resume }: SalesTemplateProps) {
  const { contactInfo, summary, experience, education, skills, certifications } = resume;

  const greenColor = '#16a34a';
  const greenLight = '#dcfce7';

  // Extract numbers from achievements for highlighting
  const extractMetric = (text: string): { metric: string | null; rest: string } => {
    const match = text.match(/^(\$?[\d,]+%?|\d+\+?)/);
    if (match) {
      return { metric: match[1], rest: text.slice(match[0].length).trim() };
    }
    return { metric: null, rest: text };
  };

  return (
    <div className="w-[612px] min-h-[792px] bg-white text-gray-900 font-sans text-sm">
      {/* Header */}
      <header className="px-8 py-6 bg-gray-900 text-white">
        <h1 className="text-2xl font-bold mb-1">{contactInfo.fullName}</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-300 text-sm">
          {contactInfo.email && <span>{contactInfo.email}</span>}
          {contactInfo.phone && <span>{contactInfo.phone}</span>}
          {contactInfo.location && <span>{contactInfo.location}</span>}
        </div>
        {(contactInfo.linkedin || contactInfo.portfolio) && (
          <div className="flex gap-4 text-gray-300 text-sm mt-1">
            {contactInfo.linkedin && <span>{contactInfo.linkedin}</span>}
            {contactInfo.portfolio && <span>{contactInfo.portfolio}</span>}
          </div>
        )}
      </header>

      <div className="px-8 py-6">
        {/* Summary with Impact Statement */}
        {summary && (
          <section className="mb-5" data-section="summary">
            <div className="p-4 rounded-lg border-l-4" style={{ backgroundColor: greenLight, borderColor: greenColor }}>
              <p className="text-gray-800 leading-relaxed font-medium">{summary}</p>
            </div>
          </section>
        )}

        {/* Experience with Metrics Emphasis */}
        {experience.length > 0 && (
          <section className="mb-5" data-section="experience">
            <h2 className="text-sm font-bold uppercase tracking-wide mb-3 text-gray-900">
              Sales Experience
            </h2>
            <div className="space-y-5">
              {experience.map((exp) => (
                <div key={exp.id}>
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-bold text-gray-900 text-base">{exp.position}</h3>
                    <span className="text-gray-500 text-xs font-medium">
                      {formatDisplayDate(exp.startDate)} – {exp.current ? 'Present' : formatDisplayDate(exp.endDate)}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{exp.company}</p>
                  
                  {exp.achievements.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {exp.achievements.map((achievement, idx) => {
                        const { metric, rest } = extractMetric(achievement);
                        return (
                          <div 
                            key={idx} 
                            className="p-2 rounded border bg-gray-50"
                          >
                            {metric ? (
                              <>
                                <p className="text-lg font-bold" style={{ color: greenColor }}>{metric}</p>
                                <p className="text-gray-600 text-xs">{rest || achievement}</p>
                              </>
                            ) : (
                              <p className="text-gray-700 text-sm">• {achievement}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills as Tags */}
        {skills.length > 0 && (
          <section className="mb-5" data-section="skills">
            <h2 className="text-sm font-bold uppercase tracking-wide mb-2 text-gray-900">
              Core Competencies
            </h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, idx) => (
                <span 
                  key={idx} 
                  className="px-3 py-1 text-sm font-medium rounded-full"
                  style={{ backgroundColor: greenLight, color: greenColor }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-2 gap-6">
          {/* Education */}
          {education.length > 0 && (
            <section data-section="education">
              <h2 className="text-sm font-bold uppercase tracking-wide mb-2 text-gray-900">
                Education
              </h2>
              <div className="space-y-2">
                {education.map((edu) => (
                  <div key={edu.id}>
                    <p className="font-semibold text-gray-900 text-sm">{edu.degree}</p>
                    <p className="text-gray-600 text-xs">{edu.institution}</p>
                    <p className="text-gray-500 text-xs">{formatDisplayDate(edu.endDate)}</p>
                    {edu.description && <p className="text-gray-600 text-xs mt-0.5">{edu.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Certifications */}
          {certifications.length > 0 && (
            <section data-section="certifications">
              <h2 className="text-sm font-bold uppercase tracking-wide mb-2 text-gray-900">
                Certifications
              </h2>
              <div className="space-y-1">
                {certifications.map((cert) => (
                  <div key={cert.id}>
                    <p className="font-medium text-gray-900 text-sm">{cert.name}</p>
                    <p className="text-gray-500 text-xs">{cert.issuer} • {cert.date}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        <ExtraSections resume={resume} exclude={['certifications']} />
      </div>
    </div>
  );
});
