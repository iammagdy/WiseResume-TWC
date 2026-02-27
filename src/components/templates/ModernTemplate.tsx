import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { formatDisplayDate } from '@/lib/dateUtils';

interface TemplateProps {
  resume: ResumeData;
}

export const ModernTemplate = memo(function ModernTemplate({ resume }: TemplateProps) {
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
                    {formatDisplayDate(exp.startDate)} - {exp.current ? 'Present' : formatDisplayDate(exp.endDate)}
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

      {/* Awards */}
      {resume.awards && resume.awards.length > 0 && (
        <section data-section="awards" className="mb-6">
          <h2 className="text-lg font-bold text-purple-600 mb-2 uppercase tracking-wide">Awards</h2>
          <div className="space-y-2">
            {resume.awards.map(award => (
              <div key={award.id} data-break-avoid>
                <div className="flex justify-between"><h3 className="font-bold text-gray-900 text-xs">{award.title}</h3><span className="text-xs text-gray-500">{award.date}</span></div>
                <p className="text-gray-600 text-xs">{award.issuer}</p>
                {award.description && <p className="text-gray-700 text-xs mt-0.5">{award.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {resume.projects && resume.projects.length > 0 && (
        <section data-section="projects" className="mb-6">
          <h2 className="text-lg font-bold text-purple-600 mb-2 uppercase tracking-wide">Projects</h2>
          <div className="space-y-3">
            {resume.projects.map(proj => (
              <div key={proj.id} data-break-avoid>
                <div className="flex justify-between"><h3 className="font-bold text-gray-900 text-xs">{proj.name}</h3><span className="text-xs text-gray-500">{proj.startDate} - {proj.endDate}</span></div>
                <p className="text-gray-600 text-xs">{proj.role}</p>
                {proj.description && <p className="text-gray-700 text-xs mt-1">{proj.description}</p>}
                {proj.technologies.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{proj.technologies.map((t, i) => <span key={i} className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px]">{t}</span>)}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Volunteering */}
      {resume.volunteering && resume.volunteering.length > 0 && (
        <section data-section="volunteering" className="mb-6">
          <h2 className="text-lg font-bold text-purple-600 mb-2 uppercase tracking-wide">Volunteering</h2>
          <div className="space-y-2">
            {resume.volunteering.map(vol => (
              <div key={vol.id} data-break-avoid>
                <div className="flex justify-between"><h3 className="font-bold text-gray-900 text-xs">{vol.role}</h3><span className="text-xs text-gray-500">{vol.startDate} - {vol.endDate}</span></div>
                <p className="text-gray-600 text-xs">{vol.organization}</p>
                {vol.description && <p className="text-gray-700 text-xs mt-0.5">{vol.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Publications */}
      {resume.publications && resume.publications.length > 0 && (
        <section data-section="publications" className="mb-6">
          <h2 className="text-lg font-bold text-purple-600 mb-2 uppercase tracking-wide">Publications</h2>
          <div className="space-y-2">
            {resume.publications.map(pub => (
              <div key={pub.id} data-break-avoid>
                <h3 className="font-bold text-gray-900 text-xs">{pub.title}</h3>
                <p className="text-gray-600 text-xs">{pub.publisher} • {pub.date}</p>
                {pub.description && <p className="text-gray-700 text-xs mt-0.5">{pub.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Hobbies */}
      {resume.hobbies && resume.hobbies.filter(h => h.visible).length > 0 && (
        <section data-section="hobbies" className="mb-6">
          <h2 className="text-lg font-bold text-purple-600 mb-2 uppercase tracking-wide">Interests</h2>
          <div className="flex flex-wrap gap-2">
            {resume.hobbies.filter(h => h.visible).map(hobby => (
              <span key={hobby.id} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">{hobby.name}</span>
            ))}
          </div>
        </section>
      )}

      {/* References */}
      {resume.references && resume.references.length > 0 && (
        <section data-section="references">
          <h2 className="text-lg font-bold text-purple-600 mb-2 uppercase tracking-wide">References</h2>
          {resume.references.some(r => r.availableOnRequest) ? (
            <p className="text-gray-600 text-xs">Available upon request</p>
          ) : (
            <div className="space-y-2">
              {resume.references.map(ref => (
                <div key={ref.id} data-break-avoid>
                  <h3 className="font-bold text-gray-900 text-xs">{ref.name}</h3>
                  <p className="text-gray-600 text-xs">{ref.title} at {ref.company}</p>
                  <p className="text-gray-500 text-xs">{ref.email} • {ref.phone}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
});
