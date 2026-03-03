import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { ContactLinks } from './shared/ContactLinks';
import { formatDisplayDate } from '@/lib/dateUtils';

interface HealthcareTemplateProps { resume: ResumeData; }

export const HealthcareTemplate = memo(function HealthcareTemplate({ resume }: HealthcareTemplateProps) {
  const { contactInfo, summary, experience, education, skills, certifications } = resume;
  const tealColor = '#0d9488';
  const tealLight = '#ccfbf1';

  return (
    <div className="w-[612px] min-h-[792px] bg-white text-gray-900 font-sans text-sm">
      <header className="px-8 py-6" style={{ backgroundColor: tealColor }}>
        <h1 className="text-2xl font-bold text-white mb-2">{contactInfo.fullName}</h1>
        <ContactLinks contact={contactInfo} className="text-teal-100 text-sm" iconSize={3} />
      </header>

      <div className="px-8 py-6">
        {summary && (
          <section className="mb-5" data-section="summary">
            <h2 className="text-sm font-bold uppercase tracking-wide mb-2 flex items-center gap-2" style={{ color: tealColor }}>
              <span className="w-1 h-4 rounded" style={{ backgroundColor: tealColor }} />Professional Summary
            </h2>
            <p className="text-gray-700 leading-relaxed">{summary}</p>
          </section>
        )}
        {certifications.length > 0 && (
          <section className="mb-5" data-section="certifications">
            <h2 className="text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: tealColor }}>
              <span className="w-1 h-4 rounded" style={{ backgroundColor: tealColor }} />Licenses & Certifications
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {certifications.map((cert) => (
                <div key={cert.id} data-break-avoid className="p-2 rounded border" style={{ backgroundColor: tealLight, borderColor: '#99f6e4' }}>
                  <p className="font-semibold text-gray-900 text-sm">{cert.name}</p>
                  <p className="text-gray-600 text-xs">{cert.issuer}</p>
                  <p className="text-xs mt-0.5" style={{ color: tealColor }}>{cert.date}{cert.expiryDate && ` – Exp: ${cert.expiryDate}`}</p>
                </div>
              ))}
            </div>
          </section>
        )}
        {experience.length > 0 && (
          <section className="mb-5" data-section="experience">
            <h2 className="text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: tealColor }}>
              <span className="w-1 h-4 rounded" style={{ backgroundColor: tealColor }} />Clinical Experience
            </h2>
            <div className="space-y-4">
              {experience.map((exp) => (
                <div key={exp.id} data-break-avoid className="border-l-2 pl-3" style={{ borderColor: '#99f6e4' }}>
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-bold text-gray-900">{exp.position}</h3>
                    <span className="text-gray-500 text-xs">{formatDisplayDate(exp.startDate)} – {exp.current ? 'Present' : formatDisplayDate(exp.endDate)}</span>
                  </div>
                  <p className="font-medium" style={{ color: tealColor }}>{exp.company}</p>
                  {exp.description && <p data-break-child className="text-gray-600 text-sm mt-1">{exp.description}</p>}
                  {exp.achievements.length > 0 && (
                    <ul data-break-child className="mt-2 space-y-1">
                      {exp.achievements.map((a, idx) => (<li key={idx} className="text-gray-700 text-sm flex items-start gap-2"><span style={{ color: tealColor }}>✓</span>{a}</li>))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
        {education.length > 0 && (
          <section className="mb-5" data-section="education">
            <h2 className="text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: tealColor }}>
              <span className="w-1 h-4 rounded" style={{ backgroundColor: tealColor }} />Education
            </h2>
            <div className="space-y-2">
              {education.map((edu) => (
                <div key={edu.id} className="flex justify-between items-baseline">
                  <div>
                    <h3 className="font-semibold text-gray-900">{edu.degree} in {edu.field}</h3>
                    <p className="text-gray-600 text-sm">{edu.institution}</p>
                    {edu.description && <p className="text-gray-600 text-xs mt-0.5">{edu.description}</p>}
                  </div>
                  <span className="text-gray-500 text-xs">{formatDisplayDate(edu.endDate)}</span>
                </div>
              ))}
            </div>
          </section>
        )}
        {skills.length > 0 && (
          <section data-section="skills">
            <h2 className="text-sm font-bold uppercase tracking-wide mb-2 flex items-center gap-2" style={{ color: tealColor }}>
              <span className="w-1 h-4 rounded" style={{ backgroundColor: tealColor }} />Clinical Skills
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill, idx) => (<span key={idx} className="px-2 py-0.5 text-sm rounded-full border" style={{ borderColor: tealColor, color: tealColor }}>{skill}</span>))}
            </div>
          </section>
        )}
        <ExtraSections resume={resume} exclude={['certifications']} variant="healthcare" />
      </div>
    </div>
  );
});
