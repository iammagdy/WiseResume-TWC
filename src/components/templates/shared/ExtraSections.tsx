import { memo } from 'react';
import { ResumeData } from '@/types/resume';
import { Globe, Github } from 'lucide-react';

export type ExtraSectionsVariant =
  | 'default'
  | 'professional'
  | 'classic'
  | 'executive'
  | 'corporate'
  | 'federal'
  | 'minimal'
  | 'mono'
  | 'startup'
  | 'marketing'
  | 'designer'
  | 'infographic'
  | 'consulting'
  | 'product'
  | 'banking'
  | 'cyber'
  | 'datascience'
  | 'devops'
  | 'portfolio'
  | 'swiss'
  | 'legal'
  | 'compact'
  | 'developer'
  | 'creative'
  | 'elegant'
  | 'healthcare'
  | 'sales'
  | 'academic'
  | 'zen'
  | 'clean';

interface ExtraSectionsProps {
  resume: ResumeData;
  /** Section IDs already rendered by the parent template — these will be skipped */
  exclude?: string[];
  /** Visual variant matching the parent template's header style */
  variant?: ExtraSectionsVariant;
}

const getHeaderClasses = (variant: ExtraSectionsVariant): string => {
  switch (variant) {
    case 'professional':
      return 'text-sm font-bold text-gray-900 uppercase mb-2 pb-1 border-b-2 border-gray-900';
    case 'classic':
      return 'text-sm font-bold text-gray-900 uppercase mb-2 border-b border-gray-200 pb-1';
    case 'executive':
      return 'text-xs font-semibold text-amber-700 uppercase tracking-[0.2em] mb-3';
    case 'corporate':
      return 'text-sm font-bold text-gray-800 uppercase tracking-widest border-b border-gray-300 pb-1 mb-3';
    case 'federal':
      return 'text-sm font-bold text-gray-900 uppercase border-b border-gray-400 pb-1 mb-2';
    case 'minimal':
    case 'clean':
      return 'text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4';
    case 'zen':
      return 'text-center text-xs font-light text-gray-500 uppercase tracking-[0.3em] mb-4';
    case 'mono':
      return 'text-xs font-medium text-gray-500 uppercase tracking-widest mb-3';
    case 'startup':
      return 'text-lg font-bold text-emerald-600 mb-2';
    case 'marketing':
      return 'text-lg font-bold text-rose-600 mb-2';
    case 'designer':
      return 'text-xs font-bold text-gray-900 uppercase tracking-widest mb-2';
    case 'infographic':
      return 'text-xs font-bold text-violet-600 uppercase tracking-widest text-center mb-3';
    case 'consulting':
      return 'text-xs font-bold text-blue-700 uppercase tracking-widest mb-2';
    case 'product':
      return 'text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2';
    case 'banking':
      return 'text-xs font-bold text-gray-900 uppercase tracking-widest mb-2';
    case 'cyber':
      return 'text-xs font-bold text-red-600 uppercase tracking-widest mb-2';
    case 'datascience':
      return 'text-xs font-bold text-teal-600 uppercase tracking-widest mb-2';
    case 'devops':
      return 'text-xs font-bold text-orange-600 uppercase tracking-widest mb-2';
    case 'portfolio':
      return 'text-sm font-bold text-amber-700 uppercase tracking-widest mb-3';
    case 'swiss':
      return 'text-xs font-bold text-gray-900 uppercase';
    case 'legal':
      return 'text-sm font-bold text-gray-900 uppercase mb-2';
    case 'compact':
      return 'text-xs font-bold text-gray-900 uppercase tracking-wide mb-1.5 pb-0.5 border-b border-gray-200';
    case 'developer':
      return 'text-green-600 font-bold mb-2';
    case 'creative':
      return 'text-sm font-bold text-gray-900 mb-2';
    case 'elegant':
      return 'text-sm font-medium uppercase tracking-widest mb-4 pb-2 border-b-2 border-pink-200 text-pink-700';
    case 'healthcare':
      return 'text-sm font-bold uppercase tracking-wide mb-2 text-teal-600';
    case 'sales':
      return 'text-sm font-bold uppercase tracking-wide mb-2 text-gray-900';
    case 'academic':
      return 'text-sm font-bold uppercase tracking-wider mb-2';
    default:
      return 'text-xs font-bold text-gray-900 uppercase tracking-wide mb-2 pb-1 border-b border-gray-200';
  }
};

/** Get section wrapper classes — some variants have their own padding, others need px-8 */
const getSectionClasses = (variant: ExtraSectionsVariant): string => {
  // Templates that already wrap ExtraSections in a padded container
  const noPadding: ExtraSectionsVariant[] = [
    'professional', 'classic', 'executive', 'corporate', 'federal',
    'minimal', 'clean', 'zen', 'mono', 'startup', 'marketing',
    'consulting', 'product', 'banking', 'cyber', 'datascience',
    'devops', 'portfolio', 'swiss', 'legal', 'designer', 'developer',
    'creative', 'elegant', 'healthcare', 'sales', 'academic',
    'infographic', 'compact',
  ];
  if (noPadding.includes(variant)) return 'mb-5';
  return 'mb-5 px-8';
};

/**
 * Shared component that renders extra resume sections (Awards, Projects,
 * Publications, Volunteering, Hobbies, References, Languages) with styling
 * that adapts to the parent template via the `variant` prop.
 */
export const ExtraSections = memo(function ExtraSections({
  resume,
  exclude = [],
  variant = 'default',
}: ExtraSectionsProps) {
  const skip = new Set(exclude);
  const h2 = getHeaderClasses(variant);
  const sectionCls = getSectionClasses(variant);

  return (
    <div className="mt-6 space-y-6">
      {/* Certifications */}
      {!skip.has('certifications') && resume.certifications && resume.certifications.length > 0 && (
        <section data-section="certifications" className={sectionCls}>
          <h2 className={h2}>Certifications</h2>
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
        <section data-section="awards" className={sectionCls}>
          <h2 className={h2}>Awards</h2>
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
        <section data-section="projects" className={sectionCls}>
          <h2 className={h2}>Projects</h2>
          <div className="space-y-2">
            {resume.projects.map(proj => (
              <div key={proj.id} data-break-avoid>
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-gray-900 text-xs">{proj.name}</span>
                  <span className="text-xs text-gray-500">{proj.startDate} – {proj.endDate}</span>
                </div>
                <p className="text-gray-600 text-xs">{proj.role}</p>
                {proj.description && <p data-break-child className="text-gray-700 text-xs mt-0.5">{proj.description}</p>}
                {(proj.url || proj.githubUrl) && (
                  <div className="flex flex-wrap gap-3 mt-1">
                    {proj.url && (
                      <span className="flex items-center gap-1 text-blue-600 text-[10px]">
                        <Globe className="w-3 h-3" />
                        {proj.url}
                      </span>
                    )}
                    {proj.githubUrl && (
                      <span className="flex items-center gap-1 text-gray-600 text-[10px]">
                        <Github className="w-3 h-3" />
                        {proj.githubUrl}
                      </span>
                    )}
                  </div>
                )}
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
        <section data-section="publications" className={sectionCls}>
          <h2 className={h2}>Publications</h2>
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
        <section data-section="volunteering" className={sectionCls}>
          <h2 className={h2}>Volunteering</h2>
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
        <section data-section="languages" className={sectionCls}>
          <h2 className={h2}>Languages</h2>
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
        <section data-section="hobbies" className={sectionCls}>
          <h2 className={h2}>Interests</h2>
          <div className="flex flex-wrap gap-2">
            {resume.hobbies.filter(h => h.visible).map(hobby => (
              <span key={hobby.id} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{hobby.name}</span>
            ))}
          </div>
        </section>
      )}

      {/* References */}
      {!skip.has('references') && resume.references && resume.references.length > 0 && (
        <section data-section="references" className={sectionCls}>
          <h2 className={h2}>References</h2>
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
    </div>
  );
});
