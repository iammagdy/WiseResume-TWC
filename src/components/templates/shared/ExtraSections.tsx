import { memo } from 'react';
import { ResumeData } from '@/types/resume';

interface ExtraSectionsProps {
  resume: ResumeData;
  /** Section IDs already rendered by the parent template — these will be skipped */
  exclude?: string[];
}

/**
 * Shared component that renders extra resume sections (Awards, Projects,
 * Publications, Volunteering, Hobbies, References, Languages) with neutral
 * styling. Append at the bottom of any template that doesn't render them
 * natively.
 *
 * Each section uses `data-section` and `data-break-avoid` attributes so the
 * PDF page-break algorithm can detect them.
 */
export const ExtraSections = memo(function ExtraSections({ resume, exclude = [] }: ExtraSectionsProps) {
  const skip = new Set(exclude);

  return (
    <>
      {/* Certifications */}
      {!skip.has('certifications') && resume.certifications && resume.certifications.length > 0 && (
        <section data-section="certifications" className="mb-5 px-8">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2 pb-1 border-b border-gray-200">
            Certifications
          </h2>
          <div className="space-y-1.5">
            {resume.certifications.map(cert => (
              <div key={cert.id} data-break-avoid>
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-gray-900 text-xs">{cert.name}</span>
                  <span className="text-xs text-gray-500">{cert.date}</span>
                </div>
                <p className="text-gray-600 text-xs">{cert.issuer}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Awards */}
      {!skip.has('awards') && resume.awards && resume.awards.length > 0 && (
        <section data-section="awards" className="mb-5 px-8">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2 pb-1 border-b border-gray-200">
            Awards
          </h2>
          <div className="space-y-1.5">
            {resume.awards.map(award => (
              <div key={award.id} data-break-avoid>
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-gray-900 text-xs">{award.title}</span>
                  <span className="text-xs text-gray-500">{award.date}</span>
                </div>
                <p className="text-gray-600 text-xs">{award.issuer}</p>
                {award.description && <p data-break-child className="text-gray-700 text-xs mt-0.5">{award.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {!skip.has('projects') && resume.projects && resume.projects.length > 0 && (
        <section data-section="projects" className="mb-5 px-8">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2 pb-1 border-b border-gray-200">
            Projects
          </h2>
          <div className="space-y-2">
            {resume.projects.map(proj => (
              <div key={proj.id} data-break-avoid>
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-gray-900 text-xs">{proj.name}</span>
                  <span className="text-xs text-gray-500">{proj.startDate} – {proj.endDate}</span>
                </div>
                <p className="text-gray-600 text-xs">{proj.role}</p>
                {proj.description && <p data-break-child className="text-gray-700 text-xs mt-0.5">{proj.description}</p>}
                {proj.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {proj.technologies.map((t, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px]">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Publications */}
      {!skip.has('publications') && resume.publications && resume.publications.length > 0 && (
        <section data-section="publications" className="mb-5 px-8">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2 pb-1 border-b border-gray-200">
            Publications
          </h2>
          <div className="space-y-1.5">
            {resume.publications.map(pub => (
              <div key={pub.id} data-break-avoid>
                <span className="font-semibold text-gray-900 text-xs">{pub.title}</span>
                <p className="text-gray-600 text-xs">{pub.publisher} · {pub.date}</p>
                {pub.description && <p data-break-child className="text-gray-700 text-xs mt-0.5">{pub.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Volunteering */}
      {!skip.has('volunteering') && resume.volunteering && resume.volunteering.length > 0 && (
        <section data-section="volunteering" className="mb-5 px-8">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2 pb-1 border-b border-gray-200">
            Volunteering
          </h2>
          <div className="space-y-1.5">
            {resume.volunteering.map(vol => (
              <div key={vol.id} data-break-avoid>
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-gray-900 text-xs">{vol.role}</span>
                  <span className="text-xs text-gray-500">{vol.startDate} – {vol.endDate}</span>
                </div>
                <p className="text-gray-600 text-xs">{vol.organization}</p>
                {vol.description && <p data-break-child className="text-gray-700 text-xs mt-0.5">{vol.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Languages */}
      {!skip.has('languages') && resume.languages && resume.languages.length > 0 && (
        <section data-section="languages" className="mb-5 px-8">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2 pb-1 border-b border-gray-200">
            Languages
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {resume.languages.map(lang => (
              <span key={lang.id} className="text-xs text-gray-700">
                {lang.name} <span className="text-gray-400">({lang.proficiency})</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Hobbies / Interests */}
      {!skip.has('hobbies') && resume.hobbies && resume.hobbies.filter(h => h.visible).length > 0 && (
        <section data-section="hobbies" className="mb-5 px-8">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2 pb-1 border-b border-gray-200">
            Interests
          </h2>
          <div className="flex flex-wrap gap-2">
            {resume.hobbies.filter(h => h.visible).map(hobby => (
              <span key={hobby.id} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{hobby.name}</span>
            ))}
          </div>
        </section>
      )}

      {/* References */}
      {!skip.has('references') && resume.references && resume.references.length > 0 && (
        <section data-section="references" className="mb-5 px-8">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2 pb-1 border-b border-gray-200">
            References
          </h2>
          {resume.references.some(r => r.availableOnRequest) ? (
            <p className="text-gray-600 text-xs">Available upon request</p>
          ) : (
            <div className="space-y-1.5">
              {resume.references.map(ref => (
                <div key={ref.id} data-break-avoid>
                  <span className="font-semibold text-gray-900 text-xs">{ref.name}</span>
                  <p className="text-gray-600 text-xs">{ref.title} at {ref.company}</p>
                  <p className="text-gray-500 text-xs">{ref.email} · {ref.phone}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
});
