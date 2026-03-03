import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { ExtraSections } from './shared/ExtraSections';
import { ContactLinks } from './shared/ContactLinks';
import { formatDisplayDate } from '@/lib/dateUtils';

interface ElegantTemplateProps { resume: ResumeData; }

export const ElegantTemplate = memo(function ElegantTemplate({ resume }: ElegantTemplateProps) {
  const { contactInfo, summary, experience, education, skills, certifications } = resume;
  const roseColor = '#be185d';
  const roseLight = '#fce7f3';
  const roseMuted = '#f9a8d4';

  return (
    <div className="w-[612px] min-h-[792px] bg-white text-gray-800 font-sans text-sm">
      <header className="px-8 py-8 text-center" style={{ backgroundColor: roseLight }}>
        <h1 className="text-3xl font-light tracking-wide mb-2" style={{ color: roseColor }}>{contactInfo.fullName}</h1>
        <div className="flex justify-center">
          <ContactLinks contact={contactInfo} className="text-gray-600 text-sm" iconSize={3} separator="•" />
        </div>
      </header>

      <div className="px-8 py-6">
        {summary && (
          <section className="mb-6" data-section="summary">
            <div className="relative py-4 px-6 rounded-lg border" style={{ borderColor: roseMuted }}>
              <div className="absolute -top-2.5 left-6 px-2 bg-white text-xs uppercase tracking-widest" style={{ color: roseColor }}>About</div>
              <p className="text-gray-700 leading-relaxed italic">{summary}</p>
            </div>
          </section>
        )}
        {experience.length > 0 && (
          <section className="mb-6" data-section="experience">
            <h2 className="text-sm font-medium uppercase tracking-widest mb-4 pb-2 border-b-2" style={{ color: roseColor, borderColor: roseMuted }}>Experience</h2>
            <div className="space-y-5">
              {experience.map((exp) => (
                <div key={exp.id} data-break-avoid className="relative pl-4">
                  <div className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: roseColor }} />
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-semibold text-gray-900">{exp.position}</h3>
                    <span className="text-gray-500 text-xs">{formatDisplayDate(exp.startDate)} – {exp.current ? 'Present' : formatDisplayDate(exp.endDate)}</span>
                  </div>
                  <p className="text-sm mb-1" style={{ color: roseColor }}>{exp.company}</p>
                  {exp.description && <p data-break-child className="text-gray-600 text-sm">{exp.description}</p>}
                  {exp.achievements.length > 0 && (
                    <ul data-break-child className="mt-2 space-y-1">
                      {exp.achievements.map((a, idx) => (
                        <li key={idx} className="text-gray-700 text-sm pl-3 relative">
                          <span className="absolute left-0 top-2 w-1 h-1 rounded-full" style={{ backgroundColor: roseMuted }} />
                          {a}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
        {skills.length > 0 && (
          <section className="mb-6" data-section="skills">
            <h2 className="text-sm font-medium uppercase tracking-widest mb-3 pb-2 border-b-2" style={{ color: roseColor, borderColor: roseMuted }}>Expertise</h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, idx) => (
                <span key={idx} className="px-3 py-1 text-sm rounded-full border" style={{ borderColor: roseMuted, color: roseColor, backgroundColor: 'white' }}>{skill}</span>
              ))}
            </div>
          </section>
        )}
        <div className="grid grid-cols-2 gap-8">
          {education.length > 0 && (
            <section data-section="education">
              <h2 className="text-sm font-medium uppercase tracking-widest mb-3 pb-2 border-b-2" style={{ color: roseColor, borderColor: roseMuted }}>Education</h2>
              <div className="space-y-3">
                {education.map((edu) => (
                  <div key={edu.id}>
                    <h3 className="font-semibold text-gray-900 text-sm">{edu.degree}</h3>
                    <p className="text-gray-600 text-xs">{edu.field}</p>
                    <p className="text-xs" style={{ color: roseColor }}>{edu.institution}</p>
                    <p className="text-gray-500 text-xs">{formatDisplayDate(edu.endDate)}</p>
                    {edu.description && <p className="text-gray-600 text-xs mt-0.5">{edu.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
          {certifications.length > 0 && (
            <section data-section="certifications">
              <h2 className="text-sm font-medium uppercase tracking-widest mb-3 pb-2 border-b-2" style={{ color: roseColor, borderColor: roseMuted }}>Credentials</h2>
              <div className="space-y-2">
                {certifications.map((cert) => (
                  <div key={cert.id} className="p-2 rounded" style={{ backgroundColor: roseLight }}>
                    <p className="font-medium text-gray-900 text-sm">{cert.name}</p>
                    <p className="text-gray-600 text-xs">{cert.issuer} • {cert.date}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        <ExtraSections resume={resume} exclude={['certifications']} variant="elegant" />
      </div>
    </div>
  );
});
