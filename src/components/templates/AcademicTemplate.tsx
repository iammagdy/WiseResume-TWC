import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { formatDisplayDate } from '@/lib/dateUtils';

interface AcademicTemplateProps {
  resume: ResumeData;
}

export const AcademicTemplate = memo(function AcademicTemplate({ resume }: AcademicTemplateProps) {
  const { contactInfo, summary, experience, education, skills, certifications } = resume;

  return (
    <div className="w-[612px] min-h-[792px] bg-white text-gray-900 p-8 font-serif text-sm">
      {/* Header - Academic Style */}
      <header className="text-center mb-6 pb-4 border-b-2 border-navy-800" style={{ borderColor: '#1e3a5f' }}>
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#1e3a5f' }}>
          {contactInfo.fullName}
        </h1>
        <div className="flex justify-center flex-wrap gap-x-4 gap-y-1 text-gray-600 text-sm">
          {contactInfo.email && <span>{contactInfo.email}</span>}
          {contactInfo.email2 && <span>{contactInfo.email2}</span>}
          {contactInfo.phone && <span>{contactInfo.phone}</span>}
          {contactInfo.location && <span>{contactInfo.location}</span>}
        </div>
        <div className="flex justify-center gap-4 text-sm mt-1" style={{ color: '#1e3a5f' }}>
          {contactInfo.linkedin && <span>{contactInfo.linkedin}</span>}
          {contactInfo.portfolio && <span>{contactInfo.portfolio}</span>}
        </div>
      </header>

      {/* Summary / Research Interests */}
      {summary && (
        <section className="mb-5" data-section="summary">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#1e3a5f' }}>
            Research Interests
          </h2>
          <p className="text-gray-700 leading-relaxed text-justify">{summary}</p>
        </section>
      )}

      {/* Education - Prominent for Academic */}
      {education.length > 0 && (
        <section className="mb-5" data-section="education">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3 pb-1 border-b" style={{ color: '#1e3a5f', borderColor: '#1e3a5f' }}>
            Education
          </h2>
          <div className="space-y-3">
            {education.map((edu) => (
              <div key={edu.id}>
                <div className="flex justify-between items-baseline">
                  <h3 className="font-bold text-gray-900">{edu.degree} in {edu.field}</h3>
                  <span className="text-gray-600 text-sm">{formatDisplayDate(edu.startDate)} – {formatDisplayDate(edu.endDate)}</span>
                </div>
                <p className="text-gray-700 italic">{edu.institution}</p>
                {edu.gpa && <p className="text-gray-600 text-sm">GPA: {edu.gpa}</p>}
                {edu.description && <p className="text-gray-600 text-sm mt-1">{edu.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Experience / Academic Positions */}
      {experience.length > 0 && (
        <section className="mb-5" data-section="experience">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3 pb-1 border-b" style={{ color: '#1e3a5f', borderColor: '#1e3a5f' }}>
            Academic Experience
          </h2>
          <div className="space-y-4">
            {experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between items-baseline">
                  <h3 className="font-bold text-gray-900">{exp.position}</h3>
                  <span className="text-gray-600 text-sm">
                    {formatDisplayDate(exp.startDate)} – {exp.current ? 'Present' : formatDisplayDate(exp.endDate)}
                  </span>
                </div>
                <p className="text-gray-700 italic">{exp.company}</p>
                {exp.description && (
                  <p data-break-child className="text-gray-600 mt-1 text-justify">{exp.description}</p>
                )}
                {exp.achievements.length > 0 && (
                  <ul data-break-child className="mt-2 space-y-1 list-disc list-inside">
                    {exp.achievements.map((achievement, idx) => (
                      <li key={idx} className="text-gray-700">{achievement}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills / Areas of Expertise */}
      {skills.length > 0 && (
        <section className="mb-5" data-section="skills">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-2 pb-1 border-b" style={{ color: '#1e3a5f', borderColor: '#1e3a5f' }}>
            Areas of Expertise
          </h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, idx) => (
              <span 
                key={idx} 
                className="px-2 py-0.5 text-sm rounded"
                style={{ backgroundColor: '#e8eef5', color: '#1e3a5f' }}
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Certifications / Awards */}
      {certifications.length > 0 && (
        <section data-section="certifications">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-2 pb-1 border-b" style={{ color: '#1e3a5f', borderColor: '#1e3a5f' }}>
            Certifications & Awards
          </h2>
          <div className="space-y-1">
            {certifications.map((cert) => (
              <div key={cert.id} className="flex justify-between">
                <span className="text-gray-700">
                  <strong>{cert.name}</strong> – {cert.issuer}
                </span>
                <span className="text-gray-600">{cert.date}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <ExtraSections resume={resume} exclude={['certifications']} variant="academic" />
    </div>
  );
});
