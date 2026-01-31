import { ResumeData } from '@/types/resume';

interface TemplateProps {
  resume: ResumeData;
}

export function ModernTemplate({ resume }: TemplateProps) {
  return (
    <div className="p-8 font-sans text-sm leading-relaxed">
      {/* Header */}
      <header className="border-b-2 border-purple-600 pb-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          {resume.contactInfo.fullName || 'Your Name'}
        </h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-600 text-xs">
          {resume.contactInfo.email && <span>{resume.contactInfo.email}</span>}
          {resume.contactInfo.phone && <span>{resume.contactInfo.phone}</span>}
          {resume.contactInfo.location && <span>{resume.contactInfo.location}</span>}
          {resume.contactInfo.linkedin && (
            <span className="text-purple-600">{resume.contactInfo.linkedin}</span>
          )}
        </div>
      </header>

      {/* Summary */}
      {resume.summary && (
        <section data-section="summary" className="mb-6">
          <h2 className="text-lg font-bold text-purple-600 mb-2 uppercase tracking-wide">
            Summary
          </h2>
          <p className="text-gray-700">{resume.summary}</p>
        </section>
      )}

      {/* Experience */}
      {resume.experience.length > 0 && (
        <section data-section="experience" className="mb-6">
          <h2 className="text-lg font-bold text-purple-600 mb-3 uppercase tracking-wide">
            Experience
          </h2>
          <div className="space-y-4">
            {resume.experience.map((exp) => (
              <div key={exp.id} data-break-avoid>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{exp.position}</h3>
                    <p className="text-gray-600">{exp.company}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                  </span>
                </div>
                {exp.description && (
                  <p className="text-gray-700 mt-1 text-xs">{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {resume.education.length > 0 && (
        <section data-section="education" className="mb-6">
          <h2 className="text-lg font-bold text-purple-600 mb-3 uppercase tracking-wide">
            Education
          </h2>
          <div className="space-y-3">
            {resume.education.map((edu) => (
              <div key={edu.id} data-break-avoid className="flex justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{edu.degree} {edu.field && `in ${edu.field}`}</h3>
                  <p className="text-gray-600">{edu.institution}</p>
                </div>
                <span className="text-xs text-gray-500">{edu.endDate}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {resume.skills.length > 0 && (
        <section data-section="skills">
          <h2 className="text-lg font-bold text-purple-600 mb-2 uppercase tracking-wide">
            Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {resume.skills.map((skill, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
